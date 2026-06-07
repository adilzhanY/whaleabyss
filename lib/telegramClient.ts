import { Telegraf } from 'telegraf';
import { db } from './db';
import { orders } from './schema';
import { eq } from 'drizzle-orm';
import { creditBoosterForCompletedOrder } from './boosterPayout';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const adminRegisterSecret = process.env.TELEGRAM_ADMIN_REGISTER_SECRET || null;

export const bot = token ? new Telegraf(token) : null;

type OrderStatus = 'in_progress' | 'completed' | 'cancelled';

const STATUS_META: Record<OrderStatus, { label: string; ack: string; humanRu: string }> = {
  in_progress: { label: '⏳ В РАБОТЕ', ack: 'Статус изменён на "В работе"', humanRu: 'В работе' },
  completed: { label: '✅ ДОСТАВЛЕНО', ack: 'Статус изменён на "Выполнено"', humanRu: 'Выполнено' },
  cancelled: { label: '❌ ОТМЕНЁН', ack: 'Заказ отменён', humanRu: 'Отменён' },
};

function parseCallbackData(data: string): { status: OrderStatus; orderId: string } | null {
  if (!data.startsWith('status_')) return null;
  const rest = data.slice('status_'.length);
  const lastUnderscore = rest.lastIndexOf('_');
  if (lastUnderscore === -1) return null;
  const status = rest.slice(0, lastUnderscore) as OrderStatus;
  const orderId = rest.slice(lastUnderscore + 1);
  if (!(status in STATUS_META) || !orderId) return null;
  return { status, orderId };
}

function buildFollowupKeyboard(status: OrderStatus, orderId: string) {
  if (status === 'in_progress') {
    return {
      inline_keyboard: [
        [{ text: '✅ Выполнить заказ', callback_data: `status_completed_${orderId}` }],
        [{ text: '❌ Отменить', callback_data: `status_cancelled_${orderId}` }],
      ],
    };
  }
  return { inline_keyboard: [] };
}

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

  // Handle button presses on order notifications.
  bot.on('callback_query', async (ctx) => {
    try {
      const cq = ctx.callbackQuery as any;
      const data: string = cq.data ?? '';
      const fromChatId = cq.message?.chat?.id?.toString();

      // Defense-in-depth: the real authentication now happens at the webhook
      // level (X-Telegram-Bot-Api-Secret-Token header verified in
      // app/api/telegram/webhook/route.ts). This chat-id check is kept as an
      // extra guard, but note that fromChatId comes from the (attacker-spoofable)
      // update body and must NOT be the sole authorization mechanism.
      if (adminChatId && fromChatId !== adminChatId) {
        console.warn(`[Telegram] Unauthorized user (${fromChatId}) tried to change status.`);
        await ctx.answerCbQuery('Недостаточно прав.');
        return;
      }

      const parsed = parseCallbackData(data);
      if (!parsed) {
        await ctx.answerCbQuery();
        return;
      }

      const { status, orderId } = parsed;

      // 1. Update DB.
      await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));

      // 1a. On completion, credit the assigned booster's commission (idempotent).
      if (status === 'completed') {
        await creditBoosterForCompletedOrder(orderId);
      }

      // 2. Answer the callback (stops spinner on button, shows toast).
      await ctx.answerCbQuery(STATUS_META[status].ack);

      // 3. Edit the original notification: strip old status / prompt, append current.
      const originalText: string = cq.message?.text ?? '';
      const cleanedText = originalText
        .replace(/\n?Текущий статус:[\s\S]*$/, '')
        .replace('Выберите статус заказа ниже:', '')
        .trimEnd();
      const newText = `${cleanedText}\n\nТекущий статус: ${STATUS_META[status].label}`;

      try {
        await ctx.editMessageText(newText, {
          reply_markup: buildFollowupKeyboard(status, orderId),
        });
      } catch (editErr) {
        // Non-fatal: message might be too old to edit.
        console.warn('[Telegram] editMessageText failed', editErr);
      }

      // 4. Send a follow-up confirmation message so the admin gets a clear log entry.
      await ctx.reply(
        `Статус заказа <code>${orderId}</code> изменён на: <b>${STATUS_META[status].humanRu}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      console.error('[Telegram] callback_query handler error', err);
      try {
        await ctx.answerCbQuery('Ошибка при обновлении статуса');
      } catch {}
    }
  });
}

export async function notifyAdminAboutOrder(orderData: any) {
  if (!bot || !adminChatId) {
    console.warn('[Telegram] Bot token or Admin Chat ID missing. Skipping notification.');
    return;
  }

  const { id, itemsDescription, totalAmount, userNotes } = orderData;
  const text = `\n🔥 <b>Новый оплаченный заказ!</b>\n➖➖➖➖➖➖➖➖➖➖\n<b>ID:</b> <code>${id}</code>\n<b>Сумма:</b> ${totalAmount} ₽\n<b>Услуги:</b>\n${itemsDescription}\n\n<b>Данные клиента:</b>\n${userNotes}\n➖➖➖➖➖➖➖➖➖➖\nВыберите статус заказа ниже:`;

  try {
    await bot.telegram.sendMessage(adminChatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏳ Взять в работу', callback_data: `status_in_progress_${id}` }],
          [{ text: '✅ Выполнено', callback_data: `status_completed_${id}` }],
          [{ text: '❌ Отменить', callback_data: `status_cancelled_${id}` }],
        ],
      },
    });
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
