import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function cleanupTestOrders() {
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
    console.log("✅ Подключено успешно.");

    // First, count how many records will be deleted
    const countOrders = await client.query('SELECT COUNT(*) FROM orders');
    const countOrderItems = await client.query('SELECT COUNT(*) FROM order_items');

    console.log("\n📊 Текущее состояние:");
    console.log(`   Заказов: ${countOrders.rows[0].count}`);
    console.log(`   Позиций заказов: ${countOrderItems.rows[0].count}`);

    if (countOrders.rows[0].count === '0' && countOrderItems.rows[0].count === '0') {
      console.log("\n✅ Таблицы уже пусты. Нечего удалять.");
      return;
    }

    console.log("\n⚠️  ВНИМАНИЕ! Это удалит ВСЕ заказы и позиции заказов!");
    console.log("⚠️  Это действие НЕОБРАТИМО!");
    console.log("\nУдаление начнется через 5 секунд...");
    console.log("Нажмите Ctrl+C чтобы отменить.");

    // Wait 5 seconds to allow cancellation
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("\n🗑️  Удаление данных...");

    // Delete order_items first (due to foreign key constraint)
    console.log("   Удаление позиций заказов...");
    const deleteItemsResult = await client.query('DELETE FROM order_items');
    console.log(`   ✅ Удалено позиций: ${deleteItemsResult.rowCount}`);

    // Delete orders
    console.log("   Удаление заказов...");
    const deleteOrdersResult = await client.query('DELETE FROM orders');
    console.log(`   ✅ Удалено заказов: ${deleteOrdersResult.rowCount}`);

    // Also delete promocode usage records (optional, but good for cleanup)
    console.log("   Удаление записей использования промокодов...");
    const deletePromoUsage = await client.query('DELETE FROM promocode_usage');
    console.log(`   ✅ Удалено записей: ${deletePromoUsage.rowCount}`);

    console.log("\n✅ Очистка завершена успешно!");
    console.log("✅ База данных готова к запуску сайта!");

  } catch (error) {
    console.error("\n❌ Ошибка при очистке данных:");
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\nСоединение с базой данных закрыто.");
  }
}

cleanupTestOrders();
