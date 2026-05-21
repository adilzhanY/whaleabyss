import fs from "fs";
import "dotenv/config";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Ошибка: Не найдена переменная DATABASE_URL в файле .env",
    );
    process.exit(1);
  }

  // Создаем клиента для подключения к БД
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // Если база данных локальная, SSL не нужен.
    // Если облачная (Supabase/Neon), может потребоваться раскомментировать строку ниже:
    // ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Подключение к базе данных...");
    await client.connect();
    console.log("✅ Подключено успешно.");

    // Читаем наш SQL файл
    const sqlFilePath = path.join(
      __dirname,
      "migrations.sql",
    );
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    console.log("Выполняем миграции (создание таблиц)...");

    // Выполняем SQL запрос
    await client.query(sql);

    console.log("✅ Все таблицы успешно созданы!");
  } catch (error) {
    console.error("❌ Ошибка при выполнении миграций:");
    console.error(error);
  } finally {
    // Обязательно закрываем соединение
    await client.end();
    console.log("Соединение с базой данных закрыто.");
  }
}

runMigrations();
