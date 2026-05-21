import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Creating deletion_tokens table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "deletion_tokens" (
      "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "token" varchar(255) NOT NULL UNIQUE,
      "expires_at" timestamp with time zone NOT NULL,
      "created_at" timestamp with time zone DEFAULT now()
    );
  `);
  console.log("Success");
  process.exit(0);
}

main().catch((err) => {
  console.error("error:", err);
  process.exit(1);
});
