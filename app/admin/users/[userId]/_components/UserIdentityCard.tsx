"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Chip } from "@heroui/react";
import { Copy, Check, Mail, Plus, ShieldCheck } from "lucide-react";
import TelegramIcon from "@/components/TelegramIcon";
import CopyableText from "../../../_components/CopyableText";
import UserRoleChip from "../../../_components/UserRoleChip";
import type { CartLine, Stats, UserDetails } from "./types";

export function money(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

export function shortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Russian plural picker: [1, 2–4, 5+] → «1 день», «2 дня», «5 дней». */
export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}

export function days(n: number) {
  return plural(n, ["день", "дня", "дней"]);
}

/** One column of the stat ribbon: value, label, and an optional second line. */
function Stat({
  value,
  label,
  sub,
}: {
  value: React.ReactNode;
  label: string;
  sub?: React.ReactNode;
}) {
  return (
    // Equal-width, centered cells: one value size and one alignment for every
    // stat, so the ribbon reads as a row of tiles rather than a ragged list.
    <div className="min-w-[128px] flex-1 border-r border-slate-100 px-4 py-2.5 text-center last:border-r-0">
      <div className="whitespace-nowrap font-extrabold text-slate-900 leading-tight tabular-nums text-[18px]">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      {sub && <div className="whitespace-nowrap text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/** Copies a support-ready block (name, e-mail, id, contacts) in one click. */
function CopyForSupport({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable (non-secure context) — ignore */
        }
      }}
      className="btn-outline btn-sm text-xs"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

/**
 * The cockpit header: identity, contacts, actions and the stat ribbon in ONE
 * card. Replaces the old hero + four equal stat tiles — the tiles gave four
 * numbers the same weight and, for the 78% of accounts with no orders, showed
 * four zeros.
 */
export default function UserIdentityCard({
  user,
  stats,
  cart,
  cartTotal,
}: {
  user: UserDetails;
  stats: Stats;
  cart: CartLine[];
  cartTotal: number;
}) {
  const role = user.role ?? "user";
  const telegram = user.telegramUsername?.replace(/^@/, "") ?? null;
  const hasOrders = stats.totalOrders > 0;
  const registeredDays = stats.daysSinceRegistration;

  const authLabel = [
    user.hasPassword ? "пароль" : null,
    ...user.authProviders.map((p) => (p === "yandex" ? "Яндекс ID" : p)),
  ]
    .filter(Boolean)
    .join(" + ") || "нет способа входа";

  const supportBlock = [
    `Пользователь: ${user.username}`,
    `Email: ${user.email}`,
    user.receiptEmail && user.receiptEmail !== user.email ? `Email для чеков: ${user.receiptEmail}` : null,
    telegram ? `Telegram: @${telegram}` : null,
    user.adventureRank != null ? `Ранг приключений: ${user.adventureRank}` : null,
    `ID: ${user.id}`,
    `Регистрация: ${shortDate(user.createdAt)}`,
    `Заказов: ${stats.totalOrders}, на сумму ${money(stats.totalSpent)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* identity + actions */}
      <div className="flex flex-wrap items-start gap-4 p-4">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.username}
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl font-black uppercase text-blue-700">
            {user.username.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-slate-900">{user.username}</h2>
            <UserRoleChip role={role} />
            {user.adventureRank != null && (
              <Chip size="sm" color="default" variant="secondary" className="text-[11px] font-bold text-slate-600">
                <Chip.Label>AR {user.adventureRank}</Chip.Label>
              </Chip>
            )}
            {!hasOrders && (
              <Chip size="sm" color="default" variant="secondary" className="text-[11px] font-bold text-slate-600">
                <Chip.Label>нет заказов</Chip.Label>
              </Chip>
            )}
            {cart.length > 0 && (
              <Chip size="sm" color="warning" variant="soft" className="text-[11px] font-bold">
                <Chip.Label>в корзине {money(cartTotal)}</Chip.Label>
              </Chip>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <CopyableText value={user.email} className="text-slate-600">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {user.email}
              </span>
            </CopyableText>
            {telegram ? (
              <a
                href={`https://t.me/${telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
              >
                <TelegramIcon className="h-3.5 w-3.5" />@{telegram}
              </a>
            ) : (
              <span>Telegram не указан</span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              вход: {authLabel}
            </span>
            <span>
              с {shortDate(user.createdAt)}
              {registeredDays <= 30 && ` · ${days(registeredDays)} назад`}
            </span>
            {user.adventureRank == null && user.gameUsername && (
              <span>ник (устар.): {user.gameUsername}</span>
            )}
            {user.receiptEmail && user.receiptEmail !== user.email && (
              <span className="text-amber-700">чеки на {user.receiptEmail}</span>
            )}
            <CopyableText value={user.id} className="font-mono text-[11px] text-slate-400">
              <span className="truncate">{user.id}</span>
            </CopyableText>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2">
          {telegram && (
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm text-xs"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              Написать
            </a>
          )}
          <CopyForSupport text={supportBlock} />
          <Link
            href={`/admin/orders/new?userId=${user.id}`}
            className="btn-primary btn-sm text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Заказ вручную
          </Link>
        </div>
      </div>

      {/* stat ribbon */}
      <div className="flex flex-wrap border-t border-slate-100">
        <Stat
          value={money(stats.totalSpent)}
          label="Потрачено"
          sub={
            hasOrders
              ? `${stats.paidOrders} оплачено${
                  stats.statusCounts.refunded ? ` · ${stats.statusCounts.refunded} возврат` : ""
                }`
              : "заказов не было"
          }
        />
        {hasOrders ? (
          <>
            <Stat value={money(stats.avgOrder)} label="Средний чек" sub={`макс. ${money(stats.maxOrder)}`} />
            <Stat value={stats.totalOrders} label="Заказов" sub={`первый ${shortDate(stats.firstOrderAt)}`} />
            <Stat
              value={stats.daysSinceLastOrder != null ? days(stats.daysSinceLastOrder) : "—"}
              label="С последнего"
              sub={shortDate(stats.lastOrderAt)}
            />
          </>
        ) : (
          <Stat value={days(registeredDays)} label="С регистрации" sub={shortDate(user.createdAt)} />
        )}
        {cart.length > 0 && (
          <Stat
            value={money(cartTotal)}
            label="В корзине"
            sub={plural(cart.length, ["позиция", "позиции", "позиций"])}
          />
        )}
        {stats.avgRating != null && (
          <Stat
            value={`${stats.avgRating.toFixed(1)}★`}
            label={stats.totalReviews === 1 ? "Отзыв" : "Отзывы"}
            sub={`${stats.totalReviews} шт.`}
          />
        )}
      </div>
    </div>
  );
}
