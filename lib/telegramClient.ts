import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const adminRegisterSecret = process.env.TELEGRAM_ADMIN_REGISTER_SECRET || null;

export const bot = token ? new Telegraf(token) : null;

if (bot) {
  bot.command('whoami', async (ctx) => {
    try {
      const chatId = ctx.chat?.id;
      await ctx.reply(`Your chat id: ${chatId}`);
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

      const chatId = ctx.chat?.id;
      await ctx.reply(`Registration OK. Your chat id: ${chatId}\nSend this id to the site owner (out-of-band).`);
    } catch (err) {
      console.error('[Telegram] register handler error', err);
    }
  });

  bot.start(async (ctx) => {
    await ctx.reply(
      'Hello! If you are the admin, run /whoami to get your chat id or /register <secret> to perform one-time registration (ask the site owner for the secret).'
    );
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
