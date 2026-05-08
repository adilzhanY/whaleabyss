import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, categories } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";

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
    })
    .returning();

  return NextResponse.json({ ok: true, service: created }, { status: 201 });
}
