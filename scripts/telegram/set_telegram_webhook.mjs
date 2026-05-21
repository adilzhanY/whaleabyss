import "dotenv/config";

async function setWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Replace this with your actual production domain when you deploy!
  // E.g., 'https://whaleabyss.ru'
  const domain =
    process.env.NEXTAUTH_URL || "https://YOUR_DOMAIN.com";

  if (!token) {
    console.error(
      "❌ Ошибка: В .env нет TELEGRAM_BOT_TOKEN",
    );
    process.exit(1);
  }

  const webhookUrl = `${domain}/api/telegram/webhook`;
  console.log(`Setting telegram webhook to: ${webhookUrl}`);

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`,
  );
  const data = await response.json();

  if (data.ok) {
    console.log("✅ Webhook успешно установлен!");
    console.log(data.description);
  } else {
    console.error("❌ Ошибка установки Webhook:", data);
  }
}

setWebhook();
