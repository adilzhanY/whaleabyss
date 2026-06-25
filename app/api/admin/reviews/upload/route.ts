import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { requireAdminApi } from "@/lib/auth/requireAdmin";

/**
 * POST /api/admin/reviews/upload
 *
 * Multipart form data: `file` — the avatar image (required).
 * Uploads to `reviews/{randomHex8}.{ext}` in the public bucket and returns
 * `{ imageUrl }`. Mirrors /api/admin/services/upload (same bucket, same
 * immutable cache header) but keyed by a random hash instead of a slug.
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
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
  const key = `reviews/${hash}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Content-versioned filename → safe to cache immutably for a year.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (err) {
    console.error("[reviews/upload] S3 put failed:", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
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
