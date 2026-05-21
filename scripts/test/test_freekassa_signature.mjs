import "dotenv/config";
import crypto from "crypto";

/**
 * Test script to verify FreeKassa notification signature generation.
 * This helps debug why the webhook might not be updating order status.
 */

const SHOP_ID = process.env.FREEKASSA_SHOP_ID;
const SECRET_2 = process.env.FREEKASSA_SECRET_2;

console.log("=== FreeKassa Signature Test ===\n");
console.log("Shop ID:", SHOP_ID);
console.log("Secret 2:", SECRET_2 ? "***" + SECRET_2.slice(-4) : "NOT SET");
console.log("");

// Test with sample data
const testData = {
  MERCHANT_ID: SHOP_ID,
  AMOUNT: "10.00",
  MERCHANT_ORDER_ID: "test-order-123",
};

console.log("Test notification data:");
console.log(JSON.stringify(testData, null, 2));
console.log("");

// Generate signature the way FreeKassa does it
const signatureString = `${testData.MERCHANT_ID}:${testData.AMOUNT}:${SECRET_2}:${testData.MERCHANT_ORDER_ID}`;
console.log("Signature string:", signatureString);

const signature = crypto
  .createHash("md5")
  .update(signatureString)
  .digest("hex");

console.log("Generated signature:", signature);
console.log("");

console.log("=== Test Notification Payload ===");
console.log("You can use this to test the webhook:");
console.log("");
console.log("curl -X POST https://whaleabyss.ru/api/payment/freekassa/notify \\");
console.log("  -H 'Content-Type: application/x-www-form-urlencoded' \\");
console.log(`  -d 'MERCHANT_ID=${testData.MERCHANT_ID}' \\`);
console.log(`  -d 'AMOUNT=${testData.AMOUNT}' \\`);
console.log(`  -d 'MERCHANT_ORDER_ID=${testData.MERCHANT_ORDER_ID}' \\`);
console.log(`  -d 'SIGN=${signature}' \\`);
console.log(`  -d 'intid=12345'`);
console.log("");

console.log("=== Debugging Tips ===");
console.log("1. Check server logs for [Freekassa] entries");
console.log("2. Verify FREEKASSA_SECRET_2 matches the one in FreeKassa dashboard");
console.log("3. Make sure the webhook URL is set to: https://whaleabyss.ru/api/payment/freekassa/notify");
console.log("4. Check if IP filtering is enabled (FREEKASSA_CHECK_IP)");
console.log("5. Verify the order exists in the database before testing");
