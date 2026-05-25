import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, boosters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import { creditBoosterForCompletedOrder } from "@/lib/boosterPayout";

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

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  // Assign a booster: validate it exists, then set boosterId and move the
  // order into work. Sent by the "Назначить" modal on /admin/orders.
  if (body.boosterId !== undefined) {
    if (body.boosterId === null) {
      updates.boosterId = null;
    } else if (typeof body.boosterId === "string") {
      const [booster] = await db
        .select({ id: boosters.id })
        .from(boosters)
        .where(eq(boosters.id, body.boosterId));
      if (!booster) {
        return NextResponse.json({ error: "Booster not found" }, { status: 404 });
      }
      updates.boosterId = body.boosterId;
      // Assigning a booster starts the work unless an explicit status is given.
      if (body.status === undefined) updates.status = "in_progress";
    } else {
      return NextResponse.json({ error: "Invalid boosterId" }, { status: 400 });
    }
  }

  if (body.status !== undefined) {
    const status = body.status as AllowedStatus;
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = status;
  }

  if (body.status === undefined && body.boosterId === undefined) {
    return NextResponse.json(
      { error: "Body must include status and/or boosterId" },
      { status: 400 }
    );
  }

  const result = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning({ id: orders.id, status: orders.status, boosterId: orders.boosterId });

  if (result.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Credit the assigned booster their commission once the order is completed.
  // Idempotent — safe even if the order was already completed.
  if (result[0].status === "completed") {
    await creditBoosterForCompletedOrder(id);
  }

  return NextResponse.json({ ok: true, order: result[0] });
}
