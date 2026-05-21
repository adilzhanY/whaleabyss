import { config } from "dotenv";
config({ path: ".env" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, services, orders, orderItems } from "../../lib/schema";

const parsedUrl = process.env.DATABASE_URL!.split(' ')[0].replace(/"/g, '');
const pool = new Pool({ connectionString: parsedUrl });
const db = drizzle(pool);

async function createDummies() {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    console.error("No users found.");
    return;
  }
  const user = allUsers[0];

  const allServices = await db.select().from(services).limit(1);
  if (allServices.length === 0) {
    console.error("No services found.");
    return;
  }
  const service = allServices[0];

  for (let i = 0; i < 10; i++) {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - i * 2);

    const [order] = await db.insert(orders).values({
      userId: user.id,
      status: 'completed',
      totalPrice: (Number(service.price) * (i % 3 + 1)).toString(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }).returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      serviceId: service.id,
      quantity: i % 3 + 1,
      priceAtPurchase: service.price,
      createdAt: timestamp,
    });
  }
  console.log("Dummy orders created!");
}

createDummies().then(() => process.exit(0)).catch(console.error);