import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";

/**
 * Storage layer for booster personal documents (договор, скан паспорта).
 *
 * SECURITY MODEL — read before touching:
 * - Files go to the PRIVATE bucket `whaleabyss-private`, NEVER to
 *   `whaleabyss-bucket`. The main bucket has bucket-level public read that
 *   overrides per-object `private` ACLs (verified empirically) — anything
 *   placed there is world-readable by URL.
 * - No public or presigned URLs are ever produced. The only way to read a
 *   document is `GET /api/admin/boosters/[id]/documents/[docId]`, which
 *   checks the admin session and streams the object with server credentials.
 * - Object keys contain no PII (random hex, not the original filename).
 * - Uploads are validated by magic bytes, not just the client-supplied MIME
 *   type, so a renamed executable can't be smuggled in.
 */

export const PRIVATE_BUCKET = "whaleabyss-private";

export const privateS3 = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_KEY_ID as string,
    secretAccessKey: process.env.YANDEX_SECRET_KEY as string,
  },
});

export type BoosterDocType = "agreement" | "passport";

export const DOC_RULES: Record<
  BoosterDocType,
  { mimes: Set<string>; maxBytes: number; label: string }
> = {
  agreement: {
    mimes: new Set(["application/pdf"]),
    maxBytes: 20 * 1024 * 1024, // 20 MiB
    label: "Договор (PDF)",
  },
  passport: {
    mimes: new Set(["image/jpeg", "image/png"]),
    maxBytes: 10 * 1024 * 1024, // 10 MiB
    label: "Паспорт (JPG/PNG)",
  },
};

/**
 * Verify the file's real format by its magic bytes. The browser-supplied
 * `file.type` is attacker-controlled; this is not.
 */
export function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 8) return null;
  // %PDF-
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  return null;
}

export function extForMime(mime: string): string {
  switch (mime) {
    case "application/pdf": return "pdf";
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    default: return "bin";
  }
}

/** Random, PII-free object key under the booster's prefix. */
export function buildDocKey(boosterId: string, docType: BoosterDocType, mime: string): string {
  const hash = crypto.randomBytes(16).toString("hex");
  return `booster-docs/${boosterId}/${docType}_${hash}.${extForMime(mime)}`;
}

export async function putPrivateObject(key: string, body: Buffer, mime: string) {
  await privateS3.send(
    new PutObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: key,
      Body: body,
      ContentType: mime,
      ACL: "private",
    })
  );
}

export async function getPrivateObject(key: string) {
  return privateS3.send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
}

/** Best-effort delete (used on replace and on document removal). */
export async function deletePrivateObject(key: string) {
  try {
    await privateS3.send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }));
  } catch (err) {
    console.warn("[boosterDocs] S3 delete failed:", key, err);
  }
}
