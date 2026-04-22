import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegramClient";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";

type OrderStatus = "in_progress" | "completed" | "cancelled";

const STATUS_META: Record<OrderStatus, { label: string; ack: string }> = {
  in_progress: { label: "⏳ В РАБОТЕ", ack: "Статус изменен на В работе!" },
  completed: { label: "✅ ДОСТАВЛЕНО", ack: "Статус изменен на Выполнено!" },
  cancelled: { label: "❌ ОТМЕНЕН", ack: "Заказ отменен." },
};

function parseCallbackData(data: string): { status: OrderStatus; orderId: string } | null {
  // Expected format: status_<status>_<uuid>. Status may contain underscores (e.g. "in_progress").
  if (!data.startsWith("status_")) return null;
  const rest = data.slice("status_".length);
  const lastUnderscore = rest.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  const status = rest.slice(0, lastUnderscore) as OrderStatus;
  const orderId = rest.slice(lastUnderscore + 1);
  if (!(status in STATUS_META) || !orderId) return null;
  return { status, orderId };
}

function buildFollowupKeyboard(status: OrderStatus, orderId: string) {
  // After taking the order, still allow marking completed or cancelled.
  if (status === "in_progress") {
    return {
      inline_keyboard: [
        [{ text: "✅ Выполнить заказ", callback_data: `status_completed_${orderId}` }],
        [{ text: "❌ Отменить", callback_data: `status_cancelled_${orderId}` }],
      ],
    };
  }
  // Terminal states — no further buttons.
  return { inline_keyboard: [] };
}

export async function POST(req: NextRequest) {
  try {
    if (!bot) {
      console.warn("Telegram bot token not provided.");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const body = await req.json();

    if (!body.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const callbackQuery = body.callback_query;
    const data: string = callbackQuery.data ?? "";
    const chatId = callbackQuery.message.chat.id.toString();
    const messageId = callbackQuery.message.message_id;
    const originalText: string = callbackQuery.message.text ?? "";

    // Security: only the configured admin can change statuses.
    if (adminChatId && chatId !== adminChatId) {
      console.warn(`[Telegram Security Warning] Unauthorized user (${chatId}) tried to change status.`);
      await bot.telegram.answerCbQuery(callbackQuery.id, "Недостаточно прав.");
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const parsed = parseCallbackData(data);
    if (!parsed) {
      return NextResponse.json({ ok: true });
    }

    const { status, orderId } = parsed;

    // 1. Update DB.
    await db.update(orders).set({ status }).where(eq(orders.id, orderId));

    // 2. Ack callback to stop loading spinner.
    await bot.telegram.answerCbQuery(callbackQuery.id, STATUS_META[status].ack);

    // 3. Edit message to reflect new status and (maybe) remaining actions.
    const cleanedText = originalText
      .replace(/\n?Текущий статус:[\s\S]*$/, "")
      .replace("Выберите статус заказа ниже:", "")
      .trimEnd();

    const newText = `${cleanedText}\n\nТекущий статус: ${STATUS_META[status].label}`;

    await bot.telegram.editMessageText(chatId, messageId, undefined, newText, {
      reply_markup: buildFollowupKeyboard(status, orderId),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error processing update:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
