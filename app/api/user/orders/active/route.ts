import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { orders, orderItems, services, users } from "@/lib/schema";
import { eq, inArray, desc, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Resolve by the uuid in the token, not by email: emails are normalised to
    // lowercase now, and a JWT minted before that migration still carries the
    // old casing for up to 30 days — an email lookup would 404 those users.
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        boosterOnline: orders.boosterOnline,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, user.id),
          inArray(orders.status, ["pending", "paid", "in_progress"])
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
    console.error("Fetch active orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
