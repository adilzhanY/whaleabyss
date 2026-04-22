import { NextRequest, NextResponse } from "next/server";
import { verifyRobokassaSignature } from "@/lib/robokassa";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  return handleRobokassaNotification(req, true);
}

export async function GET(req: NextRequest) {
  return handleRobokassaNotification(req, false);
}

async function handleRobokassaNotification(req: NextRequest, isPost: boolean) {
  try {
    // 1. Parse Data
    let amount, invId, sign, shpId;

    if (isPost) {
      const formData = await req.formData();
      amount = formData.get('OutSum') as string;
      invId = formData.get('InvId') as string;
      sign = formData.get('SignatureValue') as string;
      shpId = formData.get('Shp_id') as string;
    } else {
      const searchParams = req.nextUrl.searchParams;
      amount = searchParams.get('OutSum') as string;
      invId = searchParams.get('InvId') as string;
      sign = searchParams.get('SignatureValue') as string;
      shpId = searchParams.get('Shp_id') as string;
    }

    if (!amount || !invId || !sign || !shpId) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // 2. Verify Signature (Robokassa uses OutSum:InvId:Password2:Shp_id=uuid for ResultURL)
    const isValid = verifyRobokassaSignature(amount, invId, shpId, sign);
    if (!isValid) {
      console.warn(`[Robokassa] Invalid signature for order ${shpId}`);
      return new NextResponse('bad sign', { status: 400 });
    }

    // 3. Validate Order Exists and has correct amounts
    const orderData = await db.select().from(orders).where(eq(orders.id, shpId)).limit(1);

    if (orderData.length === 0) {
      return new NextResponse('Order not found', { status: 404 });
    }

    const order = orderData[0];

    if (parseFloat(amount) !== parseFloat(order.totalPrice.toString())) {
      console.warn(`[Robokassa] Amount mismatch for order ${shpId}. Expected ${order.totalPrice}, got ${amount}`);
      return new NextResponse('Amount mismatch', { status: 400 });
    }

    if (order.status !== 'pending') {
      return new NextResponse(`OK${invId}`, { status: 200 });
    }

    // 4. Success! Mark as Paid!
    await db.update(orders)
      .set({
        status: 'paid',
        paymentId: invId, // Store Robokassa's generated ID
      })
      .where(eq(orders.id, order.id));

    console.log(`[Robokassa] Order ${shpId} successfully PAID!`);

    // Robokassa strictly expects "OK" + InvId
    return new NextResponse(`OK${invId}`, { status: 200 });
  } catch (err: any) {
    console.error("[Robokassa Webhook Error]", err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}