import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Ошибка: Не найдена переменная DATABASE_URL в файле .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace(/"/g, ""),
  });

  try {
    console.log("Подключение к базе данных...");
    await client.connect();
    console.log("✅ Подключено успешно.");

    // Step 1: pending older than 1h → cancelled
    console.log("Отмена просроченных pending-заказов (старше 1 часа)...");
    const cancelRes = await client.query(`
      UPDATE orders
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '1 hour'
      RETURNING id;
    `);
    console.log(`✅ Отменено: ${cancelRes.rowCount}`);

    // Step 2: cancelled + never paid + updated > 1 day ago → delete
    console.log(
      "Удаление отменённых неоплаченных заказов (старше 1 дня после отмены)..."
    );
    const deleteRes = await client.query(`
      DELETE FROM orders
      WHERE status = 'cancelled'
        AND payment_id IS NULL
        AND updated_at < NOW() - INTERVAL '1 day'
      RETURNING id;
    `);
    console.log(`✅ Удалено: ${deleteRes.rowCount}`);

    console.log("✅ Очистка завершена.");
  } catch (err) {
    console.error("❌ Ошибка при выполнении очистки:");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Соединение с базой данных закрыто.");
  }
}

run();
