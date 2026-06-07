import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { boosterDocuments } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { getBoosterContext } from '@/lib/portalAuth';
import { getPrivateObject } from '@/lib/boosterDocsS3';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/portal/documents/[docId]
 *
 * Booster-facing mirror of the admin document stream: same private bucket,
 * same headers, but scoped strictly to the logged-in booster's OWN documents
 * (the where clause pins boosterId to the session's roster row).
 * `?download=1` switches to attachment.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const ctx = await getBoosterContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  const { docId } = await params;
  if (!UUID_RE.test(docId)) {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
  }

  const [doc] = await db
    .select()
    .from(boosterDocuments)
    .where(and(eq(boosterDocuments.id, docId), eq(boosterDocuments.boosterId, ctx.booster.id)));
  if (!doc) {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
  }

  let object;
  try {
    object = await getPrivateObject(doc.s3Key);
  } catch (err) {
    console.error('[portal documents] S3 get failed:', doc.s3Key, err);
    return NextResponse.json({ error: 'Не удалось получить файл' }, { status: 500 });
  }

  const body = object.Body?.transformToWebStream();
  if (!body) {
    return NextResponse.json({ error: 'Пустой файл' }, { status: 500 });
  }

  const download = req.nextUrl.searchParams.get('download') === '1';
  const asciiName = doc.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  const disposition =
    `${download ? 'attachment' : 'inline'}; filename="${asciiName}"; ` +
    `filename*=UTF-8''${encodeURIComponent(doc.fileName)}`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.sizeBytes),
      'Content-Disposition': disposition,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
