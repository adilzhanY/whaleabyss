import "dotenv/config";
import crypto from "crypto";
import pg from "pg";

const { Client } = pg;

/**
 * Test script to manually trigger the webhook logic and verify signature calculation.
 * This helps diagnose why orders aren't updating to 'paid' status.
 */

async function testWebhook() {
  console.log("=== Freekassa Webhook Test ===\n");

  // 1. Check environment variables
  console.log("1. Checking environment variables...");
  const shopId = process.env.FREEKASSA_SHOP_ID;
  const secret1 = process.env.FREEKASSA_SECRET_1;
  const secret2 = process.env.FREEKASSA_SECRET_2;
  const apiKey = process.env.FREEKASSA_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!shopId || !secret1 || !secret2 || !apiKey) {
    console.error("❌ Missing Freekassa environment variables!");
    console.log("Required: FREEKASSA_SHOP_ID, FREEKASSA_SECRET_1, FREEKASSA_SECRET_2, FREEKASSA_API_KEY");
    process.exit(1);
  }

  console.log("✅ All Freekassa env vars present");
  console.log(`   SHOP_ID: ${shopId}`);
  console.log(`   SECRET_1: ${secret1.substring(0, 4)}...`);
  console.log(`   SECRET_2: ${secret2.substring(0, 4)}...`);
  console.log(`   API_KEY: ${apiKey.substring(0, 4)}...`);

  if (!dbUrl) {
    console.error("❌ Missing DATABASE_URL!");
    process.exit(1);
  }
  console.log("✅ DATABASE_URL present\n");

  // 2. Connect to database
  console.log("2. Connecting to database...");
  const client = new Client({
    connectionString: dbUrl.replace(/"/g, ''),
  });

  try {
    await client.connect();
    console.log("✅ Database connected\n");

    // 3. Find pending orders
    console.log("3. Looking for pending orders...");
    const result = await client.query(`
      SELECT id, total_price, status, created_at, user_notes
      FROM orders
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log("⚠️  No pending orders found in database");
      console.log("   Create a test order first, then run this script again.\n");
      await client.end();
      return;
    }

    console.log(`✅ Found ${result.rows.length} pending order(s):\n`);
    result.rows.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Order ID: ${order.id}`);
      console.log(`      Amount: ${order.total_price} RUB`);
      console.log(`      Created: ${order.created_at}`);
      console.log(`      Notes: ${order.user_notes?.substring(0, 50)}...`);
      console.log();
    });

    // 4. Calculate signature for the first pending order
    const testOrder = result.rows[0];
    const orderId = testOrder.id;
    const amount = parseFloat(testOrder.total_price).toFixed(2);

    console.log("4. Calculating webhook signature...");
    console.log(`   Using order: ${orderId}`);
    console.log(`   Amount: ${amount}`);
    
    const signatureString = `${shopId}:${amount}:${secret2}:${orderId}`;
    console.log(`   Signature string: "${signatureString}"`);
    
    const signature = crypto
      .createHash('md5')
      .update(signatureString)
      .digest('hex');
    
    console.log(`   MD5 signature: ${signature}\n`);

    // 5. Generate curl command for manual testing
    console.log("5. Test webhook with this curl command:\n");
    console.log("   Replace YOUR_DOMAIN with your actual domain (e.g., https://example.com)\n");
    console.log(`curl -X POST https://YOUR_DOMAIN/api/payment/freekassa/notify \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "MERCHANT_ID=${shopId}" \\
  -d "AMOUNT=${amount}" \\
  -d "MERCHANT_ORDER_ID=${orderId}" \\
  -d "SIGN=${signature}" \\
  -d "intid=test-12345" \\
  -d "P_EMAIL=test@example.com" \\
  -d "CUR_ID=1"
`);

    console.log("\n6. What to check:");
    console.log("   ✓ Make sure webhook URL is configured in Freekassa dashboard:");
    console.log("     https://YOUR_DOMAIN/api/payment/freekassa/notify");
    console.log("   ✓ Check server logs after payment for [Freekassa] messages");
    console.log("   ✓ Verify SECRET_2 in .env matches Freekassa dashboard exactly");
    console.log("   ✓ If using IP whitelist (FREEKASSA_CHECK_IP=true), disable it temporarily");
    console.log("   ✓ Make sure your server is accessible from Freekassa IPs\n");

    await client.end();
    console.log("✅ Test complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    await client.end();
    process.exit(1);
  }
}

testWebhook();
