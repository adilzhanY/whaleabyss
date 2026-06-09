import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import { generateSlug } from "@/lib/slug";

/**
 * POST /api/admin/services/upload
 *
 * Accepts multipart form data:
 *   file         — the image (required)
 *   slug         — target service slug (required, used as filename prefix)
 *   oldImageUrl  — if provided, delete that object from S3 after uploading the new one
 *
 * Uploads to `services/{slug}_{randomHex8}.{ext}` — same pattern as the
 * original seed_services.mjs so images stay consistent in the bucket.
 * Returns `{ imageUrl }` on success.
 */

const BUCKET_NAME = "whaleabyss-bucket";
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MiB

const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_KEY_ID as string,
    secretAccessKey: process.env.YANDEX_SECRET_KEY as string,
  },
});

export async function POST(req: NextRequest) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const slugRaw = formData.get("slug");
  const oldImageUrl = formData.get("oldImageUrl");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!slugRaw || typeof slugRaw !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  // Re-slugify server-side to guarantee bucket keys stay clean.
  const slug = generateSlug(slugRaw);
  if (!slug) {
    return NextResponse.json({ error: "slug is empty after normalising" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }

  const ext = extFromMime(file.type) || safeExt(file.name) || "png";
  const hash = crypto.randomBytes(8).toString("hex");
  const key = `services/${slug}_${hash}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Filenames are content-versioned (random hash per upload), so each URL
        // is immutable — a given URL never changes content. Cache it for a year
        // so repeat visitors load from browser cache (zero S3 egress). Changing a
        // service image produces a NEW url, which dodges the cache automatically.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (err) {
    console.error("[services/upload] S3 put failed:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }

  // Best-effort delete of the replaced image.
  if (typeof oldImageUrl === "string" && oldImageUrl.includes(`${BUCKET_NAME}/`)) {
    const oldKey = oldImageUrl.split(`${BUCKET_NAME}/`)[1];
    if (oldKey && oldKey.startsWith("services/") && oldKey !== key) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey })
        );
      } catch (err) {
        console.warn("[services/upload] old object delete failed:", err);
      }
    }
  }

  const imageUrl = `https://storage.yandexcloud.net/${BUCKET_NAME}/${key}`;
  return NextResponse.json({ imageUrl, key });
}

function extFromMime(mime: string): string | null {
  switch (mime) {
    case "image/png": return "png";
    case "image/jpeg":
    case "image/jpg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return null;
  }
}

function safeExt(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : null;
}
