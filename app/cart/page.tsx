"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/store/useCart";
import Header from "@/components/Header";
import {
  Trash2,
  Plus,
  Minus,
  Edit2,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  CreditCard,
  FlaskConical,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import DataSecurityModal from "@/components/DataSecurityModal";
import AuthModal from "@/components/AuthModal";
import Checkbox from "@/components/Checkbox";
import CustomInput from "@/components/CustomInput";
import { useSession } from "next-auth/react";
import Breadcrumb from "@/components/Breadcrumb";
import { useAddonPrompt } from "@/store/useAddonPrompt";
import { confirmDialog } from "@/store/useConfirm";
import { useAddToCartWithAddons } from "@/components/QuestAddonModal";
import { ADDON_CHOICE_CART_LABEL, ADDON_CHOICE_TEXT_CLASS } from "@/lib/addonChoice";

/**
 * Available payment methods. The numeric `id` is the Freekassa method id
 * passed to the SCI redirect as `i=` (see lib/freekassa.ts → FREEKASSA_METHODS).
 * The UI intentionally does NOT mention the aggregator brand or use its logo.
 */
const PAYMENT_METHODS = [
  {
    id: 44,
    label: "СБП",
    sublabel: "Система быстрых платежей",
    logo: "/icons/sbp.png",
  },
] as const;

/**
 * Money is rendered in exactly one place so the summary can't mix formats.
 * It used to: the subtotal went through toLocaleString («2 200 ₽») while the
 * commission and the grand total went through toFixed(0) («2310 ₽»), so the
 * most important number on the page was the one missing its thousands space.
 */
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** ru pluralisation: 1 позиция, 2 позиции, 5 позиций. */
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

/** Display-only enrichment from /api/cart/meta — never a gate (see the route). */
interface CartLineMeta {
  title: string;
  subtitle: string;
  categoryTitle: string | null;
  minAdventureRank: number | null;
  hasQuestAddons: boolean;
  isPerDay: boolean;
  price: number;
}
interface RecCard {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  image: string;
  hasQuestAddons: boolean;
  minAdventureRank: number | null;
}
interface CartMeta {
  items: Record<string, CartLineMeta>;
  recommendations: RecCard[];
}

/** Bordered white panel used for every block in the left checkout column. */
function Section({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5">
          <h2 className="text-base font-bold text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            {title}
          </h2>
          {aside}
        </div>
      )}
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </div>
  );
}

const chipBase =
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold whitespace-nowrap";

/**
 * Not every service has an `imageUrl`, and an empty `background-image` renders
 * as a blank grey box. Fall back to the same brand gradient the cart drawer and
 * the cart line already use for missing images.
 */
const coverStyle = (image?: string) =>
  image
    ? { backgroundImage: `url(${image})` }
    : { background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" };

export default function CartPage() {
  const { data: session } = useSession();
  const { items, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";
  const openAddonPrompt = useAddonPrompt((s) => s.open);
  const { add: addRecommended, pending: addPending } = useAddToCartWithAddons();
  const total = cartTotal();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // Admin-only test purchase (see the button near the checkout CTA).
  const [testOrderPending, setTestOrderPending] = useState(false);
  const [isDataSecurityModalOpen, setIsDataSecurityModalOpen] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Form Fields
  const [adventureRank, setAdventureRank] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("@");

  const [isEditingAdventureRank, setIsEditingAdventureRank] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(true);
  const [isEditingTelegram, setIsEditingTelegram] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/profile")
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            if (data.adventureRank) {
              setAdventureRank(String(data.adventureRank));
              setIsEditingAdventureRank(false);
            }
            if (data.receiptEmail || data.email) {
              setEmail(data.receiptEmail || data.email);
              if (data.receiptEmail) {
                setIsEditingEmail(false);
              }
            }
            if (data.telegramUsername) {
              const tg = data.telegramUsername.startsWith("@")
                ? data.telegramUsername
                : `@${data.telegramUsername}`;
              setTelegram(tg);
              setIsEditingTelegram(false);
            }
          }
        })
        .catch(err => console.error("Failed to load profile", err));
    }
  }, [session]);

  // ── Cart metadata (category, rank gate, quest gate, recommendations) ──────
  // Purely cosmetic: a failed fetch leaves `meta` null and the cart renders
  // without chips or early warnings. The /api/checkout gates still hold.
  const [meta, setMeta] = useState<CartMeta | null>(null);
  const slugKey = useMemo(
    () => items.map((i) => i.id).sort().join(","),
    [items]
  );

  useEffect(() => {
    let cancelled = false;
    const qs = slugKey ? `?slugs=${encodeURIComponent(slugKey)}` : "";
    fetch(`/api/cart/meta${qs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // `items` is only present on a real success — the route never returns
        // a success-shaped body on failure.
        if (!cancelled && data && data.items) setMeta(data);
      })
      .catch(() => {
        /* enrichment is optional; stay silent */
      });
    return () => {
      cancelled = true;
    };
  }, [slugKey]);

  // Adventure Rank: digits only, max 2 characters (valid range is 1–60).
  const handleAdventureRankChange = (raw: string) => {
    setAdventureRank(raw.replace(/\D/g, "").slice(0, 2));
  };

  // Keep a single leading "@" and allow only ASCII (blocks Cyrillic / other
  // scripts) while still permitting digits and special symbols for the username.
  const handleTelegramChange = (raw: string) => {
    const username = raw
      .replace(/[^\x00-\x7F]/g, "") // strip non-English letters
      .replace(/@/g, ""); // we manage the leading @ ourselves
    setTelegram(`@${username}`);
  };

  const [paymentMethod, setPaymentMethod] = useState<number>(PAYMENT_METHODS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promocode state
  const [promocode, setPromocode] = useState("");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [appliedPromocode, setAppliedPromocode] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promocodeError, setPromocodeError] = useState<string | null>(null);
  const [isValidatingPromocode, setIsValidatingPromocode] = useState(false);

  // Payment commission (5%)
  const COMMISSION_PERCENT = 5;

  const handleValidatePromocode = async () => {
    if (!session?.user) {
      setPromocodeError("Войдите в систему, чтобы использовать промокод");
      return;
    }

    if (!promocode.trim()) {
      setPromocodeError("Введите промокод");
      return;
    }

    try {
      setIsValidatingPromocode(true);
      setPromocodeError(null);

      const res = await fetch("/api/promocode/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promocode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromocodeError(data.error || "Ошибка проверки промокода");
        return;
      }

      setAppliedPromocode({ code: data.code, discountPercent: data.discountPercent });
      setPromocodeError(null);
    } catch {
      setPromocodeError("Ошибка проверки промокода");
    } finally {
      setIsValidatingPromocode(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = total;
    const discount = appliedPromocode ? (subtotal * appliedPromocode.discountPercent) / 100 : 0;
    const afterDiscount = subtotal - discount;
    const commission = (afterDiscount * COMMISSION_PERCENT) / 100;
    const finalTotal = afterDiscount + commission;

    return { subtotal, discount, afterDiscount, commission, finalTotal };
  };

  const { subtotal, discount, afterDiscount, commission, finalTotal } = calculateTotals();
  const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);

  /**
   * Lines whose service needs a higher Adventure Rank than the one entered.
   * Mirrors the server's 422 gate (both read `parseMinAdventureRank`), so the
   * customer sees it on the line instead of hitting a dead end after paying.
   * Only computed once a rank is actually entered — an empty field is "unknown",
   * not "too low".
   */
  const rankIssues = useMemo(() => {
    const entered = Number(adventureRank);
    if (!adventureRank || !Number.isInteger(entered)) return [];
    return items
      .map((i) => ({ item: i, required: meta?.items[i.id]?.minAdventureRank ?? null }))
      .filter((r): r is { item: CartItem; required: number } =>
        r.required != null && entered < r.required
      );
  }, [items, meta, adventureRank]);

  /**
   * Quest-gated lines carrying no declaration. The server rejects these with
   * 409 at payment time (see handleCheckout); showing it on the line is the
   * friendlier half of the same rule — it also covers the legacy `cart_items`
   * rows created before the declaration existed.
   */
  const questIssues = useMemo(
    () => items.filter((i) => meta?.items[i.id]?.hasQuestAddons && !i.addonChoice),
    [items, meta]
  );

  /**
   * Removing a line is destructive and the trash sits right next to the
   * quantity controls, so it asks first — same shared site-wide dialog the
   * cart drawer uses, so both surfaces behave identically.
   */
  const requestRemove = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: "Удалить услугу из корзины?",
      description: name,
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (ok) removeFromCart(id);
  };

  /**
   * «−» at quantity 1 is a DELETE, not a decrement: the store drops any line
   * that falls to 0 (see updateQuantity). It has to ask exactly like the trash
   * does — otherwise the cheapest possible misclick silently empties a line.
   */
  const requestDecrement = (id: string, name: string, quantity: number) => {
    if (quantity <= 1) {
      void requestRemove(id, name);
      return;
    }
    updateQuantity(id, quantity - 1);
  };

  /**
   * Re-open QuestAddonModal for a cart line the server rejected as undeclared.
   * Returns false if we couldn't (line gone, addons unavailable) so the caller
   * falls back to showing the plain error instead of silently doing nothing.
   */
  const repromptAddonChoice = async (slug: unknown): Promise<boolean> => {
    if (typeof slug !== "string" || !slug) return false;
    const line = items.find((i) => i.id === slug);
    if (!line) return false;
    try {
      const res = await fetch(`/api/services/${encodeURIComponent(slug)}/addons`);
      if (!res.ok) return false;
      const data = await res.json();
      if (!Array.isArray(data.addons) || data.addons.length === 0) return false;
      const { quantity, ...parent } = line;
      openAddonPrompt(parent, data.addons, quantity, "declare");
      return true;
    } catch {
      return false;
    }
  };

  /**
   * ADMIN ONLY: turn this cart into a paid order without paying, so the admin
   * can see what an active order looks like from the customer's side. The order
   * is marked `isTestPayment` and is filtered out of every report, the orders
   * list, Telegram and the admin toast — it only shows up on /admin/testing.
   */
  const handleTestOrder = async () => {
    const ok = await confirmDialog({
      title: "Оформить как тестовый заказ?",
      description:
        "Заказ будет создан без оплаты и появится только в /admin/testing. Ни в «Заказы», ни в дашборд, ни в Telegram он не попадёт. Корзина очистится.",
      confirmLabel: "Оформить тестовый",
    });
    if (!ok) return;

    setTestOrderPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/testing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось создать тестовый заказ");
        return;
      }
      // The server already emptied cart_items; clear the browser copy too.
      clearCart();
      router.push("/orders");
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setTestOrderPending(false);
    }
  };

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!session?.user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!agreedToPrivacy) {
      setError("Необходимо согласиться на обработку персональных данных");
      return;
    }
    const ar = Number(adventureRank);
    if (!adventureRank || !email || telegram.replace("@", "").trim().length === 0) {
      setError("Пожалуйста, заполните все поля (Ранг приключений, Email, Telegram)");
      return;
    }
    if (!Number.isInteger(ar) || ar < 1 || ar > 60) {
      setError("Ранг приключений должен быть числом от 1 до 60");
      return;
    }

    // Both of these are re-checked server-side; stopping here just spares the
    // customer a round trip that ends in an error at the payment step.
    if (rankIssues.length > 0) {
      const { item, required } = rankIssues[0];
      setError(
        `«${item.subtitle || item.title}» доступна с ${required} ранга приключений, у вас указан ${ar}.`
      );
      return;
    }
    if (questIssues.length > 0) {
      const reprompted = await repromptAddonChoice(questIssues[0].id);
      if (reprompted) return;
      // Couldn't open the modal — fall through and let /api/checkout answer.
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          total: afterDiscount,
          email,
          telegram,
          adventureRank: ar,
          method: paymentMethod,
          promocode: appliedPromocode?.code || null,
        })
      });

      if (!res.ok) {
        // 422 = Adventure Rank gate: the server sends a ready Russian message
        // naming the service and ranks — show it verbatim.
        if (res.status === 422) {
          const msg = (await res.text()).trim();
          throw new Error(msg || "Услуга недоступна для вашего ранга приключений");
        }
        // 409 = a quest-gated service in the cart carries no declaration (the
        // upsell modal was missed, or its quest lines were deleted afterwards).
        // Re-open the modal for the offending line instead of failing the sale;
        // the cart is left untouched and the user just presses pay again.
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          if (data?.code === "ADDON_CHOICE_REQUIRED" && Array.isArray(data.slugs)) {
            const reprompted = await repromptAddonChoice(data.slugs[0]);
            if (reprompted) {
              setIsLoading(false);
              return;
            }
          }
          throw new Error(
            data?.error ||
              "Уточните, что делать с заданиями для услуг в корзине, и повторите оплату."
          );
        }
        throw new Error("Ошибка при создании заказа");
      }

      const data = await res.json();
      if (data.url) {
        // Redirect into the chosen acquiring channel.
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Произошла ошибка");
      setIsLoading(false);
    }
  };

  // ── Field blocks, shared by the "Ваши данные" section ─────────────────────
  const readOnlyField = (value: string, onEdit: () => void) => (
    <div className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-transparent bg-slate-100/50 text-sm font-semibold text-slate-700">
      <span className="truncate">{value}</span>
      <button onClick={onEdit} className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer ml-2 shrink-0" aria-label="Изменить">
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );

  const isEmpty = items.length === 0;

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setIsAuthModalOpen(true)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <DataSecurityModal isOpen={isDataSecurityModalOpen} onClose={() => setIsDataSecurityModalOpen(false)} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-28 md:pt-32 pb-32 lg:pb-20">
        <Breadcrumb />

        <div className="mb-6 mt-2 flex items-baseline gap-3">
          <h1 className="text-3xl sm:text-4xl font-black text-blue-950" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
            Корзина
          </h1>
          {!isEmpty && (
            <span className="text-sm font-semibold text-slate-400 shrink-0">
              {items.length} {plural(items.length, "позиция", "позиции", "позиций")}
            </span>
          )}
        </div>

        {isEmpty ? (
          /* ── Пустая корзина ─────────────────────────────────────────── */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <Image
                src="/images/valle_chibi_sad.png"
                alt=""
                width={120}
                height={120}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain shrink-0"
              />
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-black text-blue-950 mb-2" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                  Здесь пока пусто
                </h2>
                <p className="text-slate-500 mb-5 max-w-md">
                  Вэлль уже загрустила. Загляните в каталог — или начните с того, что берут прямо сейчас.
                </p>
                <Link href="/services" className="btn-primary inline-flex !py-2.5 !px-7 !font-bold">
                  Перейти к услугам
                </Link>
              </div>
            </div>

            {meta && meta.recommendations.length > 0 && (
              <div className="mt-10 pt-8 border-t border-slate-100">
                {/* Deliberately not «Популярное» — the row is the spotlight list
                    topped up from the catalogue, not a popularity ranking, and
                    invented trust claims are against the rules here. */}
                <h3 className="text-sm font-bold text-blue-950 mb-4">С чего начать</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {meta.recommendations.map((r) => (
                    <Link
                      key={r.id}
                      href={`/service/${r.id}`}
                      className="group rounded-xl border border-slate-100 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="h-20 bg-cover bg-center" style={coverStyle(r.image)} />
                      <div className="p-3">
                        <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2 mb-2 min-h-[2rem]">
                          {r.subtitle}
                        </p>
                        <p className="text-sm font-bold" style={{ color: "var(--text-price)" }}>
                          {rub(r.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ══════════ Левая колонка: чекаут ══════════ */}
            <div className="lg:col-span-8 space-y-4">

              {/* ── Товары ────────────────────────────────────────────── */}
              <Section
                title="Товары"
                aside={
                  <span className="text-xs font-semibold text-slate-400">
                    {totalQuantity} шт.
                  </span>
                }
              >
                <div className="-my-2">
                  {items.map((item, idx) => {
                    const m = meta?.items[item.id];
                    const rankIssue = rankIssues.find((r) => r.item.id === item.id);
                    const questIssue = questIssues.some((q) => q.id === item.id);
                    // A malformed persisted line (NaN price/quantity from an old
                    // localStorage shape) must never render as «NaN ₽» — show
                    // zeros and let the user remove the line, same as the drawer.
                    const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
                    const unitPrice = Number(item.price) || 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-start gap-4 py-4 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                      >
                        {/* image + title block */}
                        <div className="flex items-start gap-4 sm:flex-1 min-w-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              width={72}
                              height={72}
                              className="w-[72px] h-[72px] rounded-xl shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-[72px] h-[72px] rounded-xl shrink-0 flex items-center justify-center font-black text-[10px] text-white text-center leading-tight shadow-inner" style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}>
                              {item.title}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/service/${item.id}`}
                              className="font-semibold text-slate-800 break-words hover:text-blue-800 transition-colors"
                            >
                              {item.subtitle}
                            </Link>

                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m?.categoryTitle && (
                                <span className={`${chipBase} bg-slate-100 text-slate-600`}>
                                  {m.categoryTitle}
                                </span>
                              )}
                              {m?.minAdventureRank != null && (
                                <span
                                  className={`${chipBase} ${
                                    rankIssue ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-800"
                                  }`}
                                >
                                  Ранг {m.minAdventureRank}+
                                </span>
                              )}
                              {item.addonChoice && (
                                <span className={`${chipBase} bg-slate-100 ${ADDON_CHOICE_TEXT_CLASS[item.addonChoice]}`}>
                                  {ADDON_CHOICE_CART_LABEL[item.addonChoice]}
                                </span>
                              )}
                            </div>

                            {item.startDate && item.endDate && (
                              <p className="text-xs text-slate-500 mt-2">
                                {new Date(item.startDate).toLocaleDateString("ru-RU")} — {new Date(item.endDate).toLocaleDateString("ru-RU")}
                                {m?.isPerDay && ` · ${quantity} ${plural(quantity, "день", "дня", "дней")}`}
                              </p>
                            )}

                            {/* Ранг: предупреждение до оплаты, а не 422 после */}
                            {rankIssue && (
                              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-900 leading-relaxed">
                                  Нужен <span className="font-bold">{rankIssue.required} ранг приключений</span>, у вас указан {adventureRank}. Услугу нельзя выполнить на этом аккаунте.
                                </p>
                              </div>
                            )}

                            {/* Квесты: спрашиваем здесь, а не отказом на оплате */}
                            {questIssue && (
                              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 leading-relaxed">
                                  Не указано, что делать с заданиями региона — без этого заказ не оформится.
                                  <button
                                    onClick={() => repromptAddonChoice(item.id)}
                                    className="mt-2 block rounded-lg border border-amber-500 bg-white px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                                  >
                                    Указать
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* qty + price + remove — two rows, so the control column
                            never grows taller than the title block beside it.
                            The stepper is the drawer's: btn-sm + btn-icon-only is
                            the design system's square icon button, without which
                            the unlayered .btn-primary height wins and the circles
                            render as ellipses. */}
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                requestDecrement(item.id, item.subtitle || item.title, quantity)
                              }
                              className="btn-primary btn-sm btn-icon-only !rounded-full"
                              aria-label="Уменьшить"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-12 text-center text-sm font-medium whitespace-nowrap">{quantity} шт.</span>
                            <button
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                              className="btn-primary btn-sm btn-icon-only !rounded-full"
                              aria-label="Увеличить"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="text-right">
                              <p className="text-xl font-bold leading-tight" style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}>
                                {rub(unitPrice * quantity)}
                              </p>
                              {quantity > 1 && (
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {rub(unitPrice)} за {m?.isPerDay ? "день" : "шт."}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => requestRemove(item.id, item.subtitle || item.title)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* ── Ваши данные ───────────────────────────────────────── */}
              <Section
                title="Ваши данные"
                aside={
                  !session?.user ? (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="text-xs font-bold text-blue-800 hover:text-blue-950 transition-colors cursor-pointer"
                    >
                      Войти
                    </button>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Ранг приключений:</label>
                    {isEditingAdventureRank ? (
                      <CustomInput type="text" inputMode="numeric" value={adventureRank} onChange={e => handleAdventureRankChange(e.target.value)} placeholder="Например, 45" className="text-sm font-medium" />
                    ) : (
                      readOnlyField(adventureRank, () => setIsEditingAdventureRank(true))
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Username в Telegram:</label>
                    {isEditingTelegram ? (
                      <CustomInput type="text" value={telegram} onChange={e => handleTelegramChange(e.target.value)} placeholder="@username" className="text-sm font-medium" />
                    ) : (
                      readOnlyField(telegram, () => setIsEditingTelegram(true))
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5 ml-1 leading-relaxed">
                      Адрес вида @username, а не имя профиля — по нему мы свяжемся с вами.
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">E-mail для чека:</label>
                    {isEditingEmail ? (
                      <CustomInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="text-sm font-medium" />
                    ) : (
                      readOnlyField(email, () => setIsEditingEmail(true))
                    )}
                    {!session?.user && (
                      <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
                        Войдите в профиль, чтобы покупки сохранились в истории заказов.
                      </p>
                    )}
                  </div>
                </div>
              </Section>

              {/* ── Способ оплаты ─────────────────────────────────────── */}
              <Section title="Способ оплаты">
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => {
                    const selected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                          selected
                            ? "border-blue-900 bg-white shadow-sm"
                            : "border-slate-200 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "border-blue-900" : "border-slate-300"
                          }`}
                        >
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />}
                        </div>
                        <Image src={m.logo} alt={m.label} width={56} height={56} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold transition-colors ${selected ? "text-blue-950" : "text-slate-700"}`}>
                            {m.label}
                          </div>
                          <div className="text-xs text-slate-500">{m.sublabel}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* ── Что будет после оплаты ────────────────────────────── */}
              <Section title="Что будет после оплаты">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: CreditCard,
                      title: "Оплата",
                      text: "Переводите через СБП и возвращаетесь на сайт.",
                    },
                    {
                      icon: MessageCircle,
                      title: "Пишем в Telegram",
                      text: "Связываемся с вами на указанный @username и уточняем детали.",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Выполняем заказ",
                      text: "Статус виден в «Мои заказы», по готовности сообщим.",
                    },
                  ].map((s, i) => (
                    <div key={s.title} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <s.icon className="w-4 h-4 text-blue-900" />
                      </div>
                      <p className="text-[13px] font-bold text-blue-950 mb-1">{s.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── С этим часто покупают ─────────────────────────────── */}
              {meta && meta.recommendations.length > 0 && (
                <Section
                  title="С этим часто покупают"
                  aside={<span className="text-xs font-semibold text-slate-400">по товарам в корзине</span>}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {meta.recommendations.map((r) => (
                      <div key={r.id} className="rounded-xl border border-slate-100 overflow-hidden flex sm:block">
                        <Link href={`/service/${r.id}`} className="block shrink-0">
                          <div
                            className="w-24 h-full sm:w-auto sm:h-[70px] bg-cover bg-center"
                            style={coverStyle(r.image)}
                          />
                        </Link>
                        <div className="p-3 flex-1 min-w-0">
                          <Link
                            href={`/service/${r.id}`}
                            className="block text-xs font-semibold text-slate-700 leading-tight line-clamp-2 mb-2 sm:min-h-[2rem] hover:text-blue-800 transition-colors"
                          >
                            {r.subtitle}
                          </Link>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold" style={{ color: "var(--text-price)" }}>
                              {rub(r.price)}
                            </span>
                            <button
                              disabled={addPending}
                              onClick={() =>
                                addRecommended(
                                  {
                                    id: r.id,
                                    title: r.title,
                                    subtitle: r.subtitle,
                                    price: r.price,
                                    image: r.image || undefined,
                                  },
                                  1,
                                  r.minAdventureRank,
                                  r.hasQuestAddons
                                )
                              }
                              className="w-7 h-7 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                              aria-label={`Добавить «${r.subtitle}» в корзину`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* ══════════ Правая колонка: липкий итог ══════════ */}
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <Section title="Итог">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Товары:</span>
                    <span className="text-sm font-semibold text-slate-700">{totalQuantity} шт.</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Сумма заказа:</span>
                    <span className="text-sm font-semibold text-slate-700">{rub(subtotal)}</span>
                  </div>

                  {appliedPromocode && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">Скидка ({appliedPromocode.discountPercent}%):</span>
                      <span className="text-sm font-semibold text-green-600">−{rub(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Комиссия (5%):</span>
                    <span className="text-sm font-semibold text-slate-700">+{rub(commission)}</span>
                  </div>
                  {/* Always-visible caption rather than a hover tooltip — an
                      unexplained fee at the payment step costs conversions, and
                      there is no hover on the phones most of the traffic uses. */}
                  <p className="text-[11px] text-slate-400 -mt-1.5">Комиссия платёжной системы за перевод.</p>

                  {/* Промокод: свёрнут, пока не понадобится */}
                  {appliedPromocode ? (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-green-800 truncate">{appliedPromocode.code} применён</p>
                        <p className="text-xs text-green-600">Скидка {appliedPromocode.discountPercent}%</p>
                      </div>
                      <button
                        onClick={() => {
                          setAppliedPromocode(null);
                          setPromocode("");
                          setIsPromoOpen(false);
                        }}
                        className="text-xs font-semibold text-green-700 hover:text-green-900 underline shrink-0 cursor-pointer"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : isPromoOpen ? (
                    <div className="mt-2 space-y-2">
                      <CustomInput
                        type="text"
                        value={promocode}
                        onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                        placeholder="Введите промокод"
                        className="text-sm font-mono font-bold uppercase"
                        autoFocus
                      />
                      <button
                        onClick={handleValidatePromocode}
                        disabled={isValidatingPromocode || !promocode.trim()}
                        className="btn-secondary w-full !py-2.5"
                      >
                        {isValidatingPromocode ? "..." : "Применить"}
                      </button>
                      {promocodeError && <p className="text-xs text-red-600 font-semibold">{promocodeError}</p>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsPromoOpen(true)}
                      className="mt-2 w-full flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-bold text-blue-800 hover:border-blue-200 hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      Есть промокод?
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}

                  <div className="border-t border-slate-200 mt-2 pt-3 flex items-end justify-between gap-3">
                    <span className="text-base font-bold text-blue-950">К оплате:</span>
                    <span className="text-2xl font-black" style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}>
                      {rub(finalTotal)}
                    </span>
                  </div>

                  {/* Согласие на обработку ПД */}
                  <div className="mt-3 flex items-start gap-2.5 select-none">
                    <Checkbox
                      checked={agreedToPrivacy}
                      onChange={setAgreedToPrivacy}
                      size={20}
                      aria-label="Согласие на обработку персональных данных"
                    />
                    <span
                      onClick={() => setAgreedToPrivacy(!agreedToPrivacy)}
                      className="text-xs text-slate-600 font-medium cursor-pointer leading-relaxed"
                    >
                      Оформляя заказ, я соглашаюсь на{' '}
                      <Link
                        href="/privacy"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-800 underline hover:text-blue-950 transition-colors"
                      >
                        обработку персональных данных
                      </Link>
                    </span>
                  </div>

                  {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}

                  <button
                    disabled={isLoading}
                    onClick={handleCheckout}
                    className="btn-primary w-full mt-2 !py-3.5"
                  >
                    {isLoading ? "Обработка..." : "Перейти к оплате"}
                  </button>

                  {isAdmin && (
                    <button
                      disabled={testOrderPending}
                      onClick={handleTestOrder}
                      className="btn-outline w-full mt-2 text-sm"
                    >
                      <FlaskConical className="h-4 w-4" />
                      {testOrderPending ? "Создаём…" : "Оформить как тестовый"}
                    </button>
                  )}

                  <button
                    onClick={() => setIsDataSecurityModalOpen(true)}
                    className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Как мы защищаем ваши данные
                  </button>
                </div>
              </Section>
            </div>
          </div>
        )}
      </main>

      {/* ── Мобильная панель оплаты ──────────────────────────────────────
          Ниже lg колонки схлопываются в одну и кнопка уезжает в самый низ
          страницы, поэтому итог и CTA дублируются фиксированной полосой. */}
      {!isEmpty && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.15)]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 leading-none mb-1">К оплате</p>
            <p className="text-lg font-black leading-none" style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}>
              {rub(finalTotal)}
            </p>
          </div>
          <button
            disabled={isLoading}
            onClick={handleCheckout}
            className="btn-primary !py-3 !px-6 shrink-0"
          >
            {isLoading ? "Обработка..." : "Оплатить"}
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
