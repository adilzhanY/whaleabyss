import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const res = await pool.query("SELECT * FROM order_items LIMIT 5;");
  console.log(res.rows);
}
main().catch(console.error).finally(() => pool.end());
