import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, serviceAddons } from "@/lib/schema";
import { and, eq, inArray, max } from "drizzle-orm";
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

  // Boolean flag: spotlight the service in «Актуальное» (additive, keeps its
  // native category). Coerce explicitly so a stray string doesn't slip through.
  if ("featuredInActual" in body) {
    update.featuredInActual = Boolean(body.featuredInActual);
  }

  // Optional: replace the set of parent (exploration) services this service
  // is offered as a quest addon of (service_addons, addon side). Quest
  // services in «Задания» manage their regions through this field.
  let parentServiceIds: string[] | null = null;
  if ("parentServiceIds" in body) {
    if (
      !Array.isArray(body.parentServiceIds) ||
      body.parentServiceIds.some((x: unknown) => typeof x !== "string")
    ) {
      return NextResponse.json(
        { error: "parentServiceIds must be an array of service ids" },
        { status: 400 }
      );
    }
    parentServiceIds = [...new Set(body.parentServiceIds as string[])].filter(
      (pid) => pid !== id // a service can't be its own addon
    );
  }

  if (Object.keys(update).length === 0 && parentServiceIds === null) {
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

  let updated;
  if (Object.keys(update).length > 0) {
    update.updatedAt = new Date();
    [updated] = await db
      .update(services)
      .set(update as any)
      .where(eq(services.id, id))
      .returning();
  } else {
    [updated] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  }

  if (!updated) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Diff-replace the addon links: removed parents are unlinked, new parents
  // get the link appended to the end of their modal list (max sortOrder + 1).
  if (parentServiceIds !== null) {
    const existing = await db
      .select({ parentServiceId: serviceAddons.parentServiceId })
      .from(serviceAddons)
      .where(eq(serviceAddons.addonServiceId, id));
    const existingSet = new Set(existing.map((e) => e.parentServiceId));
    const nextSet = new Set(parentServiceIds);

    const toRemove = [...existingSet].filter((p) => !nextSet.has(p));
    const toAdd = [...nextSet].filter((p) => !existingSet.has(p));

    if (toRemove.length > 0) {
      await db
        .delete(serviceAddons)
        .where(
          and(
            eq(serviceAddons.addonServiceId, id),
            inArray(serviceAddons.parentServiceId, toRemove)
          )
        );
    }
    for (const pid of toAdd) {
      const [row] = await db
        .select({ mx: max(serviceAddons.sortOrder) })
        .from(serviceAddons)
        .where(eq(serviceAddons.parentServiceId, pid));
      await db
        .insert(serviceAddons)
        .values({
          parentServiceId: pid,
          addonServiceId: id,
          sortOrder: (row?.mx ?? -1) + 1,
        })
        .onConflictDoNothing();
    }
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
