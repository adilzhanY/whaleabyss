import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, categories, serviceAddons } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdminApi } from "@/lib/auth/requireAdmin";

/**
 * GET /api/admin/services — full catalog for the admin list page:
 * every service with its category title and, for quest addons, the list of
 * parent region labels it's linked to (service_addons).
 */
export async function GET() {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const rows = await db
    .select({
      id: services.id,
      slug: services.slug,
      title: services.title,
      subtitle: services.subtitle,
      price: services.price,
      imageUrl: services.imageUrl,
      category: categories.title,
      categorySlug: categories.slug,
      featuredInActual: services.featuredInActual,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .leftJoin(categories, eq(services.categoryId, categories.id))
    .orderBy(desc(services.updatedAt));

  const parentSvc = alias(services, "parent_svc");
  const links = await db
    .select({
      addonId: serviceAddons.addonServiceId,
      parentLabel: parentSvc.subtitle,
      parentTitle: parentSvc.title,
    })
    .from(serviceAddons)
    .innerJoin(parentSvc, eq(serviceAddons.parentServiceId, parentSvc.id));

  const regionsByAddon = new Map<string, string[]>();
  for (const l of links) {
    const label = l.parentLabel || l.parentTitle;
    const arr = regionsByAddon.get(l.addonId) ?? [];
    arr.push(label);
    regionsByAddon.set(l.addonId, arr);
  }

  return NextResponse.json({
    services: rows.map((s) => ({
      ...s,
      regions: regionsByAddon.get(s.id) ?? [],
    })),
  });
}

/** POST /api/admin/services — create a new service. */
export async function POST(req: NextRequest) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    slug,
    title,
    subtitle,
    description,
    price,
    imageUrl,
    categoryId,
    isTestService,
    featuredInActual,
  } = body as Record<string, unknown>;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (price === undefined || price === null || isNaN(Number(price))) {
    return NextResponse.json({ error: "price must be a number" }, { status: 400 });
  }

  // Optional: verify the category exists, if provided.
  if (categoryId) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, String(categoryId)))
      .limit(1);
    if (cat.length === 0) {
      return NextResponse.json({ error: "category not found" }, { status: 400 });
    }
  }

  const existing = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `slug "${slug}" already exists` },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(services)
    .values({
      slug,
      title,
      subtitle: (subtitle as string) || null,
      description: (description as string) || null,
      price: String(price),
      imageUrl: (imageUrl as string) || null,
      categoryId: (categoryId as string) || null,
      isTestService: Boolean(isTestService),
      featuredInActual: Boolean(featuredInActual),
    })
    .returning();

  return NextResponse.json({ ok: true, service: created }, { status: 201 });
}
