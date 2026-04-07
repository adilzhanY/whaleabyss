import crypto from "crypto";

// Replace with your local Next.js URL or production URL
const BASE_URL =
  "http://localhost:3000/api/payment/freekassa";

// Use same data you configured in lib/freekassa.ts
const MERCHANT_ID =
  process.env.FREEKASSA_MERCHANT_ID || "TEST_ID";
const SECRET_2 =
  process.env.FREEKASSA_SECRET2 || "TEST_SECRET2";

async function testWebhooks() {
  console.log("🚀 Testing Freekassa Endpoints...\n");

  // 1. DUMMY DATA
  const orderId = "test-order-123";
  const amount = "100.00";
  const intId = "55555555";

  // Generate MD5 signature (Freekassa webhook uses SECRET_2)
  const signString = `${MERCHANT_ID}:${amount}:${SECRET_2}:${orderId}`;
  const sign = crypto
    .createHash("md5")
    .update(signString)
    .digest("hex");

  // 2. TEST SUCCESS URL
  console.log("➡️  Testing /success redirect...");
  const successRes = await fetch(
    `${BASE_URL}/success?MERCHANT_ORDER_ID=${orderId}&intid=${intId}`,
  );
  console.log(
    `✅ Success Endpoint Redirected to: ${successRes.url} (Status: ${successRes.status})\n`,
  );

  // 3. TEST FAIL URL
  console.log("➡️  Testing /fail redirect...");
  const failRes = await fetch(
    `${BASE_URL}/fail?MERCHANT_ORDER_ID=${orderId}&intid=${intId}`,
  );
  console.log(
    `✅ Fail Endpoint Redirected to: ${failRes.url} (Status: ${failRes.status})\n`,
  );

  // 4. TEST NOTIFY URL (Webhook)
  console.log(
    "➡️  Testing /notify endpoint (Spoofing Freekassa IP)...",
  );

  const formData = new URLSearchParams();
  formData.append("MERCHANT_ID", MERCHANT_ID);
  formData.append("AMOUNT", amount);
  formData.append("intid", intId);
  formData.append("MERCHANT_ORDER_ID", orderId);
  formData.append("SIGN", sign);

  const notifyRes = await fetch(`${BASE_URL}/notify`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Freekassa approved IP to bypass our IP check:
      "x-real-ip": "168.119.157.136",
    },
  });

  const notifyText = await notifyRes.text();
  console.log(
    `✅ Notify Endpoint Response Status: ${notifyRes.status}`,
  );
  console.log(`✅ Notify Endpoint Body: "${notifyText}"`);

  if (notifyText === "YES") {
    console.log(
      "🎉 SUCCESS! The script returned 'YES' (This is exactly what Freekassa wants).",
    );
  } else if (notifyText === "Order not found") {
    console.log(
      "💡 This is expected! We didn't actually create 'test-order-123' in the database yet.",
    );
  } else {
    console.log(
      "⚠️ Unexpected result. We might have an issue!",
    );
  }
}

testWebhooks().catch(console.error);
