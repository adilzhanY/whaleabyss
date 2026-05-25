import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";

/**
 * Corrects the customer's Email / Telegram inside an order's `userNotes`
 * (customers sometimes mistype them at checkout). Rewrites only the first
 * `Email:` and `Telegram:` lines, leaving the in-game name, promocode, and any
 * other lines untouched. Silent — no Telegram bot notification is sent.
 */
function rewriteContact(notes: string, email: string, telegram: string): string {
  let emailDone = false;
  let telDone = false;
  return notes
    .split("\n")
    .map((line) => {
      if (!emailDone && /^Email:/i.test(line)) {
        emailDone = true;
        return `Email: ${email}`;
      }
      if (!telDone && /^Telegram:/i.test(line)) {
        telDone = true;
        return `Telegram: ${telegram}`;
      }
      return line;
    })
    .join("\n");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.telegram !== "string") {
    return NextResponse.json(
      { error: "Body must be { email: string, telegram: string }" },
      { status: 400 }
    );
  }

  const [order] = await db
    .select({ userNotes: orders.userNotes })
    .from(orders)
    .where(eq(orders.id, id));

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const newNotes = rewriteContact(order.userNotes ?? "", body.email.trim(), body.telegram.trim());

  // Note: we intentionally do NOT touch `updatedAt` — this is a clerical fix,
  // not an order event, and we don't want it re-surfacing in any feeds.
  await db.update(orders).set({ userNotes: newNotes }).where(eq(orders.id, id));

  return NextResponse.json({ ok: true, userNotes: newNotes });
}
