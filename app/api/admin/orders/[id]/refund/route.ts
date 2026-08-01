import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth/requireAdmin";
import { refundFreekassaOrder } from "@/lib/freekassa";

/**
 * Admin endpoint to refund a paid order.
 *
 * POST /api/admin/orders/[id]/refund
 *
 * - Verifies admin authentication
 * - Checks order status is 'paid'
 * - Calls Freekassa refund API
 * - Updates order status to 'refunded'
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbid = await requireAdminApi();
  if (forbid) return forbid;

  const { id } = await params;

  try {
    // 1. Load the order
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRows[0];

    // 2. Validate order status
    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `Cannot refund order with status: ${order.status}. Only 'paid' orders can be refunded.` },
        { status: 400 }
      );
    }

    // 3. Validate that order was actually paid through Freekassa
    if (!order.paymentId) {
      return NextResponse.json(
        { error: "Cannot refund: This order has no payment ID. It was not paid through Freekassa (possibly manually marked as paid)." },
        { status: 400 }
      );
    }

    // Validate paymentId is a valid number (Freekassa's internal order ID)
    const paymentIdNum = Number(order.paymentId);
    if (!Number.isFinite(paymentIdNum)) {
      return NextResponse.json(
        { error: `Cannot refund: Invalid payment ID format (${order.paymentId}). This order was not properly processed through Freekassa.` },
        { status: 400 }
      );
    }

    // 4. Call Freekassa refund API
    console.log(`[Refund] Initiating refund for order ${id}`);
    console.log(`[Refund] Order paymentId (FK internal ID): ${order.paymentId}`);

    let refundResult;
    try {
      // Use paymentId (FK's internal order ID) if available, otherwise use our order ID
      if (order.paymentId) {
        refundResult = await refundFreekassaOrder({ orderId: order.paymentId });
      } else {
        refundResult = await refundFreekassaOrder({ paymentId: id });
      }
    } catch (fkError) {
      console.error("[Refund] Freekassa API error:", fkError);
      return NextResponse.json(
        { error: `Refund failed: ${fkError instanceof Error ? fkError.message : String(fkError)}` },
        { status: 500 }
      );
    }

    console.log(`[Refund] Freekassa refund successful. Refund ID: ${refundResult.refundId}`);

    // 4. Update order status to 'refunded'
    const result = await db
      .update(orders)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning({ id: orders.id, status: orders.status });

    console.log(`[Refund] Order ${id} status updated to 'refunded'`);

    return NextResponse.json({
      ok: true,
      order: result[0],
      refundId: refundResult.refundId,
    });
  } catch (error) {
    console.error("[Refund] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
