import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boosters, boosterDocuments } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import {
  DOC_RULES,
  type BoosterDocType,
  sniffMime,
  buildDocKey,
  putPrivateObject,
  deletePrivateObject,
} from "@/lib/boosterDocsS3";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/boosters/[id]/documents
 *
 * Upload (or replace) a booster's document. Multipart form data:
 *   file    — the document (required)
 *   docType — 'agreement' (PDF) | 'passport' (JPG/PNG)
 *
 * One document per type per booster: re-uploading replaces the previous file
 * (the old S3 object is deleted). The file goes to the PRIVATE bucket and is
 * validated by magic bytes — see lib/boosterDocsS3.ts for the security model.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Некорректный ID качера" }, { status: 400 });
  }

  const [booster] = await db
    .select({ id: boosters.id })
    .from(boosters)
    .where(eq(boosters.id, id));
  if (!booster) {
    return NextResponse.json({ error: "Качер не найден" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const docTypeRaw = formData.get("docType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл обязателен" }, { status: 400 });
  }
  if (docTypeRaw !== "agreement" && docTypeRaw !== "passport") {
    return NextResponse.json({ error: "docType должен быть agreement или passport" }, { status: 400 });
  }
  const docType: BoosterDocType = docTypeRaw;
  const rules = DOC_RULES[docType];

  if (file.size > rules.maxBytes) {
    return NextResponse.json(
      { error: `Файл слишком большой (макс. ${rules.maxBytes / 1024 / 1024} МБ)` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Trust the magic bytes, not the client-supplied MIME type.
  const realMime = sniffMime(buffer);
  if (!realMime || !rules.mimes.has(realMime)) {
    return NextResponse.json(
      { error: `Недопустимый формат файла. Ожидается: ${rules.label}` },
      { status: 400 }
    );
  }

  const key = buildDocKey(id, docType, realMime);
  // Original name kept only for the download dialog; strip path components.
  const fileName = (file.name || `${docType}.${key.split(".").pop()}`)
    .split(/[\\/]/).pop()!.slice(0, 255);

  try {
    await putPrivateObject(key, buffer, realMime);
  } catch (err) {
    console.error("[booster documents] S3 put failed:", err);
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }

  // Upsert: one document per (booster, type). Remember the old key to delete.
  const [existing] = await db
    .select({ s3Key: boosterDocuments.s3Key })
    .from(boosterDocuments)
    .where(and(eq(boosterDocuments.boosterId, id), eq(boosterDocuments.docType, docType)));

  const [doc] = await db
    .insert(boosterDocuments)
    .values({
      boosterId: id,
      docType,
      s3Key: key,
      fileName,
      mimeType: realMime,
      sizeBytes: buffer.length,
    })
    .onConflictDoUpdate({
      target: [boosterDocuments.boosterId, boosterDocuments.docType],
      set: {
        s3Key: key,
        fileName,
        mimeType: realMime,
        sizeBytes: buffer.length,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: boosterDocuments.id,
      docType: boosterDocuments.docType,
      fileName: boosterDocuments.fileName,
      mimeType: boosterDocuments.mimeType,
      sizeBytes: boosterDocuments.sizeBytes,
      updatedAt: boosterDocuments.updatedAt,
    });

  if (existing && existing.s3Key !== key) {
    await deletePrivateObject(existing.s3Key);
  }

  return NextResponse.json({ document: doc });
}
