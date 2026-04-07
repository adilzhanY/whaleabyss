import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, services } from "@/lib/schema";
import { generateFreekassaPaymentUrl } from "@/lib/freekassa";
import { inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, total, email, telegram, inGameName } = body;

    if (!items || items.length === 0 || !total) {
      return new NextResponse("Invalid request data", { status: 400 });
    }

    // Capture user notes to store the user's provided details
    const userNotes = `Email: ${email}\nTelegram: ${telegram}\nIn-Game Name: ${inGameName}`;

    // Map frontend slugs (item.id) to actual database UUIDs
    const slugs = items.map((item: any) => item.id);
    const dbServices = await db.select({ id: services.id, slug: services.slug })
      .from(services)
      .where(inArray(services.slug, slugs));

    const slugToIdMap = new Map();
    dbServices.forEach(s => slugToIdMap.set(s.slug, s.id));

    // 1. Create a "pending" Order in the database
    // Drizzle's insert returns the created rows when using .returning()
    const newOrderRaw = await db.insert(orders).values({
      totalPrice: total.toString(),
      status: 'pending',
      userNotes,
      // userId is set to null for guests, but here we could get it from the session if logged in
    }).returning({ id: orders.id });

    const newOrderId = newOrderRaw[0].id;

    // 2. Insert the Order Items
    const insertItems = items.map((item: any) => {
      const actualServiceId = slugToIdMap.get(item.id);
      if (!actualServiceId) {
        throw new Error(`Service not found for slug: ${item.id}`);
      }
      return {
        orderId: newOrderId,
        serviceId: actualServiceId,
        quantity: item.quantity,
        priceAtPurchase: item.price.toString(),
      };
    });

    await db.insert(orderItems).values(insertItems);

    // 3. Generate Freekassa Payment URL
    // We pass the newOrderId to freekassa so it can refer back to it during webhooks
    const paymentUrl = generateFreekassaPaymentUrl(newOrderId, Number(total), email);

    // 4. Return the URL so the frontend can redirect the user
    return NextResponse.json({ url: paymentUrl });

  } catch (error) {
    console.error("[Checkout Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
