import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { orders, orderItems, services, users } from "@/lib/schema";
import { eq, inArray, desc, and, or, ne, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, session.user.email));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, user.id),
          inArray(orders.status, ["completed", "cancelled", "refunded"]),
          // Hide never-paid auto-cancelled orders from history.
          or(ne(orders.status, "cancelled"), isNotNull(orders.paymentId))
        )
      )
      .orderBy(desc(orders.createdAt));

    // For each order, fetch items and service names
    const enrichedOrders = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select({
            quantity: orderItems.quantity,
            serviceName: services.title,
            serviceId: services.id,
            serviceImage: services.imageUrl,
          })
          .from(orderItems)
          .leftJoin(services, eq(orderItems.serviceId, services.id))
          .where(eq(orderItems.orderId, order.id));

        return { ...order, items };
      })
    );

    return NextResponse.json(enrichedOrders);
  } catch (error) {
    console.error("Fetch past orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
