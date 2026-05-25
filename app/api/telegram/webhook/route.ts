import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegramClient';

export async function POST(req: NextRequest) {
  try {
    if (!bot) {
      console.warn('[Telegram Webhook] Bot not initialised (TELEGRAM_BOT_TOKEN missing).');
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Authenticate the request via Telegram's secret_token mechanism. When the
    // webhook is registered with a secret_token, Telegram echoes it back in the
    // X-Telegram-Bot-Api-Secret-Token header on every call. Verifying it here is
    // the ONLY trustworthy auth: the request body (incl. message.chat.id) is
    // attacker-controlled and must never be relied on for authorization.
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
      const expectedBuf = Buffer.from(expectedSecret);
      const providedBuf = Buffer.from(providedSecret);
      const secretOk =
        expectedBuf.length === providedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, providedBuf);
      if (!secretOk) {
        console.warn('[Telegram Webhook] Rejected request: invalid or missing secret token.');
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    } else {
      // Degrade gracefully in dev (matches lib/smartcaptcha.ts style) but make the
      // missing protection loud so it isn't shipped to production by accident.
      console.warn(
        '[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET not set — webhook is UNAUTHENTICATED. ' +
          'Set it (and re-run set_telegram_webhook.mjs) before exposing this endpoint publicly.'
      );
    }

    const update = await req.json();
    // Delegate the update to telegraf, which dispatches to the handlers defined
    // in lib/telegramClient.ts (commands, callback_query, etc).
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error processing update:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
