import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { boosterDocuments } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import { getPrivateObject, deletePrivateObject } from "@/lib/boosterDocsS3";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findDoc(boosterId: string, docId: string) {
  if (!UUID_RE.test(boosterId) || !UUID_RE.test(docId)) return null;
  const [doc] = await db
    .select()
    .from(boosterDocuments)
    .where(and(eq(boosterDocuments.id, docId), eq(boosterDocuments.boosterId, boosterId)));
  return doc ?? null;
}

/**
 * GET /api/admin/boosters/[id]/documents/[docId]
 *
 * Streams the document from the PRIVATE bucket. This route is the ONLY way
 * to read a booster document — there are no public or presigned URLs.
 * Auth: edge middleware + admin session check here (defense in depth).
 *
 * `?download=1` switches Content-Disposition to attachment.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id, docId } = await params;
  const doc = await findDoc(id, docId);
  if (!doc) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  let object;
  try {
    object = await getPrivateObject(doc.s3Key);
  } catch (err) {
    console.error("[booster documents] S3 get failed:", doc.s3Key, err);
    return NextResponse.json({ error: "Не удалось получить файл" }, { status: 500 });
  }

  const body = object.Body?.transformToWebStream();
  if (!body) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 500 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  // RFC 5987 filename* — original names can contain Cyrillic.
  const asciiName = doc.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const disposition =
    `${download ? "attachment" : "inline"}; filename="${asciiName}"; ` +
    `filename*=UTF-8''${encodeURIComponent(doc.fileName)}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": disposition,
      // Personal documents: never cache anywhere outside the admin's tab.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Belt-and-braces: even if mimeType were ever spoofed past the magic-byte
      // check, nothing in the response may run scripts or load subresources.
      // (No `sandbox` — it breaks Chrome's built-in PDF viewer in iframes.)
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

/**
 * DELETE /api/admin/boosters/[id]/documents/[docId]
 * Removes the DB row and the S3 object.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id, docId } = await params;
  const doc = await findDoc(id, docId);
  if (!doc) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  await db.delete(boosterDocuments).where(eq(boosterDocuments.id, doc.id));
  await deletePrivateObject(doc.s3Key);

  return NextResponse.json({ success: true });
}
