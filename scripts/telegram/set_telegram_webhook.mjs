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

  // Register a secret_token so Telegram echoes it back in the
  // X-Telegram-Bot-Api-Secret-Token header on every webhook call. The route
  // verifies this header to reject forged updates. Only sent if configured.
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.replace(/"/g, "");

  const params = new URLSearchParams({ url: webhookUrl });
  if (secretToken) {
    params.set("secret_token", secretToken);
    console.log("Using TELEGRAM_WEBHOOK_SECRET to authenticate the webhook.");
  } else {
    console.warn(
      "⚠️  TELEGRAM_WEBHOOK_SECRET not set — webhook will be UNAUTHENTICATED.",
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?${params.toString()}`,
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
