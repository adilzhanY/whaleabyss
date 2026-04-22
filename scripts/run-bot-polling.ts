/**
 * Local development helper: runs the Telegram bot in long-polling mode so that
 * button clicks (callback_query) are delivered without a public webhook.
 *
 * Usage:
 *   1. Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID are in .env
 *   2. Run in a separate terminal:   npm run bot:dev
 *   3. IMPORTANT: do NOT also have a webhook registered at the same time.
 *      If you registered one before, remove it with:
 *        https://api.telegram.org/bot<TOKEN>/deleteWebhook
 */
import 'dotenv/config';
import { bot } from '../lib/telegramClient';

async function main() {
  if (!bot) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing from environment.');
  }

  // Safety: delete any existing webhook so long polling can take over.
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });
  } catch (err) {
    console.warn('[bot:dev] deleteWebhook failed (can usually be ignored):', err);
  }

  console.log('[bot:dev] Starting long polling...');
  await bot.launch();
  console.log('[bot:dev] Bot is running. Press Ctrl+C to stop.');
}

process.once('SIGINT', () => {
  console.log('[bot:dev] SIGINT received, stopping...');
  bot?.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  console.log('[bot:dev] SIGTERM received, stopping...');
  bot?.stop('SIGTERM');
  process.exit(0);
});

main().catch((err) => {
  console.error('[bot:dev] fatal:', err);
  process.exit(1);
});
