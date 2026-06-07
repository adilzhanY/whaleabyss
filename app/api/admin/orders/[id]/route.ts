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

  // Assign a booster: validate it exists, then set boosterId. The FIRST
  // assignment moves the order into work; re-assigning to a different booster
  // leaves the status untouched (sent by the "Сменить" button).
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

      // Only auto-start work on the initial assignment (order had no booster).
      if (body.status === undefined) {
        const [current] = await db
          .select({ boosterId: orders.boosterId })
          .from(orders)
          .where(eq(orders.id, id));
        if (!current) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        if (!current.boosterId) updates.status = "in_progress";
      }
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
    // Leaving "in work" makes «на аккаунте» meaningless — clear it.
    if (status !== "in_progress" && body.boosterOnline === undefined) {
      updates.boosterOnline = false;
    }
  }

  // «На аккаунте» toggle (admin override of the booster's portal toggle).
  // Only meaningful while the order is in work.
  if (body.boosterOnline !== undefined) {
    if (typeof body.boosterOnline !== "boolean") {
      return NextResponse.json({ error: "Invalid boosterOnline" }, { status: 400 });
    }
    const effectiveStatus =
      (updates.status as string | undefined) ??
      (
        await db
          .select({ status: orders.status })
          .from(orders)
          .where(eq(orders.id, id))
      )[0]?.status;
    if (effectiveStatus !== "in_progress") {
      return NextResponse.json(
        { error: "Статус «на аккаунте» доступен только для заказов в работе" },
        { status: 400 }
      );
    }
    updates.boosterOnline = body.boosterOnline;
  }

  if (
    body.status === undefined &&
    body.boosterId === undefined &&
    body.boosterOnline === undefined
  ) {
    return NextResponse.json(
      { error: "Body must include status, boosterId and/or boosterOnline" },
      { status: 400 }
    );
  }

  const result = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning({
      id: orders.id,
      status: orders.status,
      boosterId: orders.boosterId,
      boosterOnline: orders.boosterOnline,
    });

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

// Hard-delete an order forever. Irreversible — used by the "Удалить заказ"
// danger-zone button on the admin order detail page. `order_items` and
// `promocode_usage` rows cascade-delete (FK onDelete: 'cascade'); an assigned
// booster's already-credited balance is NOT clawed back (the credit is final).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;

  // Only abandoned/unfinished/refunded orders may be deleted. Paid/in-progress/
  // completed orders are active financial records (incl. manually-paid ones) and
  // must be kept; a refunded order's money is already returned, so it's safe to
  // remove.
  const DELETABLE_STATUSES = ["cancelled", "pending", "refunded"];
  const [existing] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!existing.status || !DELETABLE_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: "Only cancelled, pending or refunded orders can be deleted" },
      { status: 409 }
    );
  }

  await db.delete(orders).where(eq(orders.id, id));

  return NextResponse.json({ ok: true });
}
