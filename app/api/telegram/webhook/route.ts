import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegramClient';

export async function POST(req: NextRequest) {
  try {
    if (!bot) {
      console.warn('[Telegram Webhook] Bot not initialised (TELEGRAM_BOT_TOKEN missing).');
      return NextResponse.json({ ok: false }, { status: 500 });
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
