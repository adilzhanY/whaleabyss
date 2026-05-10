import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";

const ALLOWED_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body.status !== "string") {
    return NextResponse.json(
      { error: "Body must be { status: string }" },
      { status: 400 }
    );
  }

  const status = body.status as AllowedStatus;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const result = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id, status: orders.status });

  if (result.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: result[0] });
}
