import pg from "pg";
import "dotenv/config";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing in .env");
    return;
  }

  await client.connect();
  console.log("Connected to DB over SSH tunnel.");

  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      DO $$ BEGIN
          CREATE TYPE order_status AS ENUM ('pending', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded');
      EXCEPTION
          WHEN duplicate_object THEN
              NULL;
      END $$;
    `);

    // Safely attempt to add 'refunded' if the enum already existed but was missing it.
    try {
      await client.query(
        `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';`,
      );
    } catch (e) {
      // It's fine if this fails or already exists
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          status order_status DEFAULT 'pending',
          total_price DECIMAL(10, 2) NOT NULL,
          payment_id VARCHAR(255),
          user_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          service_id UUID REFERENCES services(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
          price_at_purchase DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log(
      "✅ 'orders' and 'order_items' tables successfully created via pg client!",
    );
  } catch (error) {
    console.error("❌ SQL Error:", error);
  } finally {
    await client.end();
  }
}

migrate();
