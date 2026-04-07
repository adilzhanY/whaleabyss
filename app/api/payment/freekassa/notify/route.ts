import { NextRequest, NextResponse } from "next/server";
import { verifyFreekassaSignature } from "@/lib/freekassa";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";

const ALLOWED_IPS = [
  '168.119.157.136',
  '168.119.60.227',
  '178.154.197.79',
  '51.250.54.238'
];

export async function POST(req: NextRequest) {
  return handleFreekassaNotification(req, true);
}

export async function GET(req: NextRequest) {
  return handleFreekassaNotification(req, false);
}

async function handleFreekassaNotification(req: NextRequest, isPost: boolean) {
  try {
    // 1. IP Whitelist Verification
    // In Next.js, getting the real IP depends on headers passed by reverse proxies (like reverse proxying Nginx to Node).
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    // Naively extract the first IP if forwardedFor is a list
    const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown');

    if (ip && !ALLOWED_IPS.includes(ip)) {
      console.warn(`[Freekassa] Unauthorized IP attempt: ${ip}`);
      return new NextResponse('hacking attempt!', { status: 403 });
    }

    // 2. Parse Form Data
    // For POST we parse formData, for GET we parse URL searchParams
    let merchantId, amount, intId, orderId, sign;

    if (isPost) {
      const formData = await req.formData();
      merchantId = formData.get('MERCHANT_ID') as string;
      amount = formData.get('AMOUNT') as string;
      intId = formData.get('intid') as string;
      orderId = formData.get('MERCHANT_ORDER_ID') as string;
      sign = formData.get('SIGN') as string;
    } else {
      const searchParams = req.nextUrl.searchParams;
      merchantId = searchParams.get('MERCHANT_ID') as string;
      amount = searchParams.get('AMOUNT') as string;
      intId = searchParams.get('intid') as string;
      orderId = searchParams.get('MERCHANT_ORDER_ID') as string;
      sign = searchParams.get('SIGN') as string;
    }

    if (!merchantId || !amount || !intId || !orderId || !sign) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // 3. Verify Signature
    const isValid = verifyFreekassaSignature(merchantId, amount, orderId, sign);
    if (!isValid) {
      console.warn(`[Freekassa] Invalid signature for order ${orderId}`);
      return new NextResponse('wrong sign', { status: 400 });
    }

    // 4. Validate Order Exists and has correct amounts
    // (You should also check that the order status is currently 'pending')
    const orderData = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (orderData.length === 0) {
      return new NextResponse('Order not found', { status: 404 });
    }

    const order = orderData[0];

    // Sometimes the amount returned can be formatted (e.g. 100 vs 100.00), parse as float to be safe
    // Note: It's best if you strictly match strings, but Freekassa can send strings out.
    if (parseFloat(amount) !== parseFloat(order.totalPrice.toString())) {
      console.warn(`[Freekassa] Amount mismatch for order ${orderId}. Expected ${order.totalPrice}, got ${amount}`);
      return new NextResponse('Amount mismatch', { status: 400 });
    }

    if (order.status !== 'pending') {
      // Order already processed before (or is refunded/cancelled)
      // Just return YES so Freekassa stops trying.
      return new NextResponse('YES', { status: 200 });
    }

    // 5. Success! Mark as Paid!
    await db.update(orders)
      .set({
        status: 'paid',
        paymentId: intId,
      })
      .where(eq(orders.id, order.id));

    console.log(`[Freekassa] Order ${orderId} successfully PAID!`);

    // Must strictly return "YES" for Freekassa to stop pinging us
    return new NextResponse('YES', { status: 200 });

  } catch (err: any) {
    console.error("[Freekassa Webhook Error]", err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
