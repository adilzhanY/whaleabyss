import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = "whaleabyss-bucket";

const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_KEY_ID as string,
    secretAccessKey: process.env.YANDEX_SECRET_KEY as string,
  },
});

async function deleteServiceImage(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.includes(`${BUCKET_NAME}/`)) return;
  const key = imageUrl.split(`${BUCKET_NAME}/`)[1];
  if (!key || !key.startsWith("services/")) return;
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
  } catch (err) {
    console.warn("[admin/services] S3 delete failed:", err);
  }
}

/** PATCH /api/admin/services/[id] — update fields. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const allowed = [
    "slug",
    "title",
    "subtitle",
    "description",
    "price",
    "imageUrl",
    "categoryId",
  ] as const;

  for (const key of allowed) {
    if (key in body) {
      if (key === "price") update.price = String(body.price);
      else update[key] = body[key] === "" ? null : body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Guard slug uniqueness on change.
  if (typeof update.slug === "string") {
    const clash = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, update.slug))
      .limit(1);
    if (clash.length > 0 && clash[0].id !== id) {
      return NextResponse.json(
        { error: `slug "${update.slug}" already used` },
        { status: 409 }
      );
    }
  }

  update.updatedAt = new Date();

  const [updated] = await db
    .update(services)
    .set(update as any)
    .where(eq(services.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, service: updated });
}

/** DELETE /api/admin/services/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const [deleted] = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning({ id: services.id, imageUrl: services.imageUrl });

  if (!deleted) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Best-effort cleanup of the image in object storage.
  await deleteServiceImage(deleted.imageUrl);

  return NextResponse.json({ ok: true });
}
