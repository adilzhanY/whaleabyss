import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const { Client } = pg;

/**
 * Script to manually test the webhook logic and mark a pending order as paid.
 * This helps verify that the database update works correctly.
 */

async function testWebhookLogic() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Ошибка: Не найдена переменная DATABASE_URL в файле .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace(/"/g, ''),
  });

  try {
    console.log("Подключение к базе данных...");
    await client.connect();
    console.log("✅ Подключено успешно.\n");

    // Get the most recent pending order
    console.log("Поиск последнего pending заказа...");
    const result = await client.query(`
      SELECT id, status, total_price, payment_id, created_at
      FROM orders
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      console.log("❌ Нет pending заказов для тестирования.");
      return;
    }

    const order = result.rows[0];
    console.log("\n=== Найден заказ ===");
    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Total: ${order.total_price} руб.`);
    console.log(`Created: ${order.created_at}`);

    // Generate signature for this order
    const SHOP_ID = process.env.FREEKASSA_SHOP_ID;
    const SECRET_2 = process.env.FREEKASSA_SECRET_2;
    const amount = parseFloat(order.total_price).toFixed(2);

    const signatureString = `${SHOP_ID}:${amount}:${SECRET_2}:${order.id}`;
    const signature = crypto.createHash("md5").update(signatureString).digest("hex");

    console.log("\n=== Тестовые данные для webhook ===");
    console.log(`MERCHANT_ID: ${SHOP_ID}`);
    console.log(`AMOUNT: ${amount}`);
    console.log(`MERCHANT_ORDER_ID: ${order.id}`);
    console.log(`SIGN: ${signature}`);

    console.log("\n=== Curl команда для тестирования ===");
    console.log(`curl -X POST https://whaleabyss.ru/api/payment/freekassa/notify \\`);
    console.log(`  -H 'Content-Type: application/x-www-form-urlencoded' \\`);
    console.log(`  -d 'MERCHANT_ID=${SHOP_ID}' \\`);
    console.log(`  -d 'AMOUNT=${amount}' \\`);
    console.log(`  -d 'MERCHANT_ORDER_ID=${order.id}' \\`);
    console.log(`  -d 'SIGN=${signature}' \\`);
    console.log(`  -d 'intid=test-12345'`);

    console.log("\n=== Симуляция обновления статуса ===");
    console.log("Обновляем статус на 'paid'...");

    const updateResult = await client.query(`
      UPDATE orders
      SET status = 'paid', payment_id = 'test-manual-update', updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, payment_id, updated_at;
    `, [order.id]);

    console.log("✅ Заказ обновлен:");
    console.log(updateResult.rows[0]);

    console.log("\n=== Проверка обновления ===");
    const checkResult = await client.query(`
      SELECT id, status, total_price, payment_id, updated_at
      FROM orders
      WHERE id = $1;
    `, [order.id]);

    console.log(checkResult.rows[0]);

  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await client.end();
    console.log("\nСоединение с базой данных закрыто.");
  }
}

testWebhookLogic();
