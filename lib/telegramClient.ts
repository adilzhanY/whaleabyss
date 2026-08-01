import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const adminRegisterSecret = process.env.TELEGRAM_ADMIN_REGISTER_SECRET || null;

export const bot = token ? new Telegraf(token) : null;

type OrderStatus = 'in_progress' | 'completed' | 'cancelled';

const STATUS_META: Record<OrderStatus, { humanRu: string }> = {
  in_progress: { humanRu: 'В работе' },
  completed: { humanRu: 'Выполнено' },
  cancelled: { humanRu: 'Отменён' },
};

if (bot) {
  bot.command('whoami', async (ctx) => {
    try {
      await ctx.reply(`Your chat id: ${ctx.chat?.id}`);
    } catch (err) {
      console.error('[Telegram] whoami handler error', err);
    }
  });

  bot.command('register', async (ctx) => {
    try {
      const text = ctx.message?.text || '';
      const parts = text.split(' ').filter(Boolean);
      const maybeSecret = parts[1] || null;
      if (!adminRegisterSecret) {
        await ctx.reply('Registration is disabled on this instance. Please contact the owner.');
        return;
      }
      if (maybeSecret !== adminRegisterSecret) {
        await ctx.reply('Invalid registration secret.');
        return;
      }
      await ctx.reply(
        `Registration OK. Your chat id: ${ctx.chat?.id}\nSend this id to the site owner (out-of-band).`
      );
    } catch (err) {
      console.error('[Telegram] register handler error', err);
    }
  });

  bot.start(async (ctx) => {
    await ctx.reply(
      'Hello! If you are the admin, run /whoami to get your chat id or /register <secret> to perform one-time registration.'
    );
  });

  // Status buttons were removed from notifications (2026-08-01): orders are
  // managed in the admin panel and the booster portal. Messages sent BEFORE
  // that still carry live buttons, so a stale press must not silently flip an
  // order status (and credit a booster) — answer with a pointer instead, and
  // strip the old keyboard so it can't be pressed again.
  bot.on('callback_query', async (ctx) => {
    try {
      await ctx.answerCbQuery('Кнопки отключены — управляйте заказами в админ-панели.');
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {
        /* non-fatal: message might be too old to edit */
      }
    } catch (err) {
      console.error('[Telegram] callback_query handler error', err);
    }
  });
}

export async function notifyAdminAboutOrder(orderData: {
  id: string;
  itemsDescription: string;
  totalAmount: string | number;
  userNotes: string | null;
}) {
  if (!bot || !adminChatId) {
    console.warn('[Telegram] Bot token or Admin Chat ID missing. Skipping notification.');
    return;
  }

  const { id, itemsDescription, totalAmount, userNotes } = orderData;
  // No action buttons: orders are managed in the admin panel / booster portal.
  const text = `\n🔥 <b>Новый оплаченный заказ!</b>\n➖➖➖➖➖➖➖➖➖➖\n<b>ID:</b> <code>${id}</code>\n<b>Сумма:</b> ${totalAmount} ₽\n<b>Услуги:</b>\n${itemsDescription}\n\n<b>Данные клиента:</b>\n${userNotes}\n➖➖➖➖➖➖➖➖➖➖`;

  try {
    await bot.telegram.sendMessage(adminChatId, text, { parse_mode: 'HTML' });
    console.log(`[Telegram] Notified admin about order ${id}`);
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
  }
}

/**
 * Notify the admin chat when a BOOSTER changes an order's status from the
 * portal (/portal). Full context: the order, the booster, and the new status.
 * Online/offline toggles deliberately do NOT notify — statuses only.
 */
export async function notifyAdminAboutBoosterStatusChange(info: {
  orderId: string;
  newStatus: string;
  boosterName: string;
  boosterTelegram: string | null;
  totalAmount: string;
  itemsDescription: string;
  userNotes: string | null;
}) {
  if (!bot || !adminChatId) {
    console.warn('[Telegram] Bot token or Admin Chat ID missing. Skipping notification.');
    return;
  }

  const statusLabel =
    info.newStatus in STATUS_META
      ? STATUS_META[info.newStatus as OrderStatus].humanRu
      : info.newStatus;

  const text =
    `\n🔧 <b>Качер изменил статус заказа</b>\n➖➖➖➖➖➖➖➖➖➖` +
    `\n<b>Качер:</b> ${info.boosterName}${info.boosterTelegram ? ` (${info.boosterTelegram})` : ''}` +
    `\n<b>Новый статус:</b> <b>${statusLabel}</b>` +
    `\n\n<b>ID заказа:</b> <code>${info.orderId}</code>` +
    `\n<b>Сумма:</b> ${info.totalAmount} ₽` +
    `\n<b>Услуги:</b>\n${info.itemsDescription}` +
    (info.userNotes ? `\n\n<b>Данные клиента:</b>\n${info.userNotes}` : '') +
    `\n➖➖➖➖➖➖➖➖➖➖`;

  try {
    await bot.telegram.sendMessage(adminChatId, text, { parse_mode: 'HTML' });
    console.log(`[Telegram] Notified admin about booster status change on ${info.orderId}`);
  } catch (error) {
    console.error('[Telegram] Error sending booster status message:', error);
  }
}
