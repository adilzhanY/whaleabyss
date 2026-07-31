"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Check, ListChecks } from "lucide-react";
import { useCart, CartItem } from "@/store/useCart";
import { useAddonPrompt } from "@/store/useAddonPrompt";
import { useRankGate } from "@/store/useRankGate";
import { useAddonError } from "@/store/useAddonError";
import {
  fetchWithTimeout,
  fetchQuestAddons,
  PROFILE_TIMEOUT_MS,
} from "@/lib/questAddons";

/**
 * Upsell modal shown when an exploration service with linked quest addons is
 * added to the cart. The client has three choices, and EVERY one of them writes
 * a positive declaration onto the parent line:
 *  1. tick quests → addonChoice: 'quests' + the quests as separate cart lines;
 *  2. «Все задания уже выполнены» → addonChoice: 'completed';
 *  3. «Пройду их сам» → addonChoice: 'self'.
 * The declaration travels cart → checkout → order and is visible to admins.
 *
 * In 'declare' mode the parent is already in the cart and only the declaration
 * is applied — quantity is left alone. That mode is used for the re-prompt
 * /cart opens when /api/checkout rejects an undeclared quest-gated line.
 */
export default function QuestAddonModal() {
  const { isOpen, parent, parentQuantity, addons, mode, close } = useAddonPrompt();
  const { addToCart, addManyToCart, declareAddon, openCart } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Enter/exit choreography — the same two-flag recipe as AuthModal: `show`
  // keeps the modal mounted for the exit animation (the store's close() only
  // flips isOpen, the content stays), `animate` drives the transition classes
  // a frame after mount so the enter transition actually plays.
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (isOpen) {
      timers.push(setTimeout(() => setShow(true), 0));
      timers.push(setTimeout(() => setAnimate(true), 20));
    } else {
      timers.push(setTimeout(() => setAnimate(false), 0));
      timers.push(setTimeout(() => setShow(false), 300));
    }
    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  // Reset selection each time the modal opens for a (possibly different)
  // service. Render-time state adjustment, not an effect — the React-blessed
  // «reset state when a prop changes» pattern, and lint-clean.
  const promptKey = isOpen ? parent?.id ?? null : null;
  const [lastPromptKey, setLastPromptKey] = useState<string | null>(null);
  if (promptKey !== lastPromptKey) {
    setLastPromptKey(promptKey);
    if (promptKey) setSelected(new Set());
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!show || !parent) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedAddons = addons.filter((a) => selected.has(a.id));
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  const finish = () => {
    close();
    // In 'declare' mode the user is already looking at their cart — popping the
    // drawer on top of it would just be in the way.
    if (mode === "add") openCart();
  };

  const questLines = () =>
    selectedAddons.map((a) => ({
      item: {
        id: a.id,
        title: a.title,
        subtitle: a.subtitle,
        price: a.price,
        image: a.image || "/images/genshin_background.jpg",
      },
    }));

  const addWithQuests = () => {
    // 'quests' is a POSITIVE declaration: it used to be left undefined here, so
    // deleting the quest lines in the cart afterwards silently reverted the
    // parent to "no declaration" and the booster was left guessing. Checkout
    // now also rejects 'quests' with no quest lines actually in the order.
    //
    // One batched store update + one db sync (looped addToCart calls would
    // fire concurrent syncs that race and duplicate cart_items rows).
    if (mode === "declare") {
      declareAddon(parent.id, "quests", questLines());
    } else {
      addManyToCart([
        { item: { ...parent, addonChoice: "quests" }, quantity: parentQuantity },
        ...questLines(),
      ]);
    }
    finish();
  };

  const addWithChoice = (choice: NonNullable<CartItem["addonChoice"]>) => {
    if (mode === "declare") {
      declareAddon(parent.id, choice);
    } else {
      addToCart({ ...parent, addonChoice: choice }, parentQuantity);
    }
    finish();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
      />

      {/* Card. Mobile: a bottom sheet sliding up from below the viewport (no
          fade — a sheet moves, it doesn't materialise); ≥sm: the AuthModal
          enter — rise + scale + fade on the same spring-like curve. */}
      <div
        className={`relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          animate
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-100 sm:translate-y-8 sm:scale-95 sm:opacity-0"
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-start gap-4 pr-8">
            <Image
              src="/images/valle_chibi_sad.png"
              alt="Valle"
              width={56}
              height={56}
              className="w-14 h-14 shrink-0 object-contain"
            />
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-[#0B5191]"
                style={{ fontFamily: "var(--font-primary), sans-serif" }}
              >
                На этой локации есть задания
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-snug">
                {mode === "declare"
                  ? "Чтобы оформить заказ, уточните, что делать с заданиями этой локации — без них мы не сможем полностью зачистить карту."
                  : "Для 100% исследования нужно пройти задания ниже — без них мы не сможем полностью зачистить карту."}
              </p>
            </div>
          </div>
        </div>

        {/* Quest checkbox list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="flex flex-col gap-2">
            {addons.map((a) => {
              const checked = selected.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors cursor-pointer ${
                      checked
                        ? "border-[#0B5191] bg-blue-50/60"
                        : "border-slate-100 hover:border-blue-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        checked
                          ? "bg-[#0B5191] border-[#0B5191]"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 break-words">
                      {a.subtitle}
                    </span>
                    <span
                      className="shrink-0 text-sm font-bold"
                      style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}
                    >
                      {a.price.toLocaleString("ru-RU")} ₽
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 px-6 py-4 space-y-2.5">
          <button
            onClick={addWithQuests}
            disabled={selectedAddons.length === 0}
            className="btn-primary w-full !py-3 !text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ListChecks className="w-4 h-4" />
            <span>
              {selectedAddons.length === 0
                ? "Выберите задания"
                : mode === "declare"
                  ? `Добавить задания (+${addonsTotal.toLocaleString("ru-RU")} ₽)`
                  : `Добавить с заданиями (+${addonsTotal.toLocaleString("ru-RU")} ₽)`}
            </span>
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => addWithChoice("completed")}
              className="w-full py-2.5 rounded-full text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:border-[#0B5191] hover:text-[#0B5191] transition-colors cursor-pointer"
            >
              Задания уже выполнены
            </button>
            <button
              onClick={() => addWithChoice("self")}
              className="w-full py-2.5 rounded-full text-sm font-semibold border-2 border-slate-200 text-slate-700 hover:border-[#0B5191] hover:text-[#0B5191] transition-colors cursor-pointer"
            >
              Пройду их сам
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center leading-snug">
            Ваш выбор будет указан в заказе — бустер будет знать, что задания на
            вас.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Read the signed-in user's Adventure Rank for the add-to-cart gate.
 * Distinguishes "not logged in" (401) from a network/other error so the caller
 * can decide whether to enforce the gate or fall through to checkout.
 *
 * Failing open here is safe: `/api/checkout` re-parses the requirement and
 * rejects with 422, so a missed client check can't complete a purchase.
 */
async function fetchUserAdventureRank(): Promise<
  | { state: "anon" }
  | { state: "ok"; rank: number | null }
  | { state: "error" }
> {
  try {
    const res = await fetchWithTimeout("/api/user/profile", PROFILE_TIMEOUT_MS);
    if (res.status === 401) return { state: "anon" };
    if (!res.ok) return { state: "error" };
    const data = await res.json();
    const raw = data?.adventureRank;
    const rank = raw == null || raw === "" ? null : Number(raw);
    return { state: "ok", rank: Number.isFinite(rank) ? (rank as number) : null };
  } catch {
    return { state: "error" };
  }
}

/**
 * Drop-in replacement for addToCart+openCart. Before adding it:
 *  1. enforces the service's Adventure Rank gate (`minAdventureRank`, parsed
 *     from the description by the caller) for logged-in users — blocking with
 *     the RankGateModal when their rank is below the requirement or unset;
 *  2. for a quest-gated service, opens the upsell modal so the client declares
 *     what happens to the gating quests. If that list can't be loaded the add
 *     is REFUSED (AddonUnavailableModal), never silently degraded.
 *
 * Anonymous users are not blocked by the rank gate here (we can't read their
 * rank) — `/api/checkout` re-parses the requirement server-side regardless.
 *
 * `hasQuestAddons` comes from server-rendered data (lib/services.ts), so
 * whether a declaration is required never depends on a request succeeding. For
 * a non-gated service nothing is fetched at all — the common path got faster
 * and lost its failure surface entirely.
 *
 * Returns `pending` so call sites can disable their button and show a spinner;
 * an in-flight guard makes a second tap a no-op, because two racing chains used
 * to be able to add a bare line behind the open modal.
 */
export function useAddToCartWithAddons() {
  const { addToCart, openCart } = useCart();
  const openPrompt = useAddonPrompt((s) => s.open);
  const openRankGate = useRankGate((s) => s.open);
  const openAddonError = useAddonError((s) => s.open);
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);

  const add = useCallback(
    async (
      item: Omit<CartItem, "quantity">,
      quantity = 1,
      minAdventureRank: number | null = null,
      hasQuestAddons = false
    ): Promise<void> => {
      // Double-tap guard. A ref, not `pending`, because state updates are async
      // and two taps in the same tick would both see pending === false.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setPending(true);
      try {
        if (minAdventureRank != null) {
          const profile = await fetchUserAdventureRank();
          // Only block when we positively know a logged-in user's rank is too
          // low (or unset). Anonymous/error → fall through; checkout backstops.
          if (profile.state === "ok") {
            if (profile.rank == null || profile.rank < minAdventureRank) {
              openRankGate({
                requiredRank: minAdventureRank,
                currentRank: profile.rank,
              });
              return;
            }
          }
        }

        if (hasQuestAddons) {
          const addons = await fetchQuestAddons(item.id);
          if (addons === null) {
            // Couldn't find out what to ask. Refuse rather than add an
            // undeclared line — /api/checkout would reject it at the payment
            // step anyway, and failing here is recoverable in one tap.
            openAddonError(item.subtitle || item.title, () =>
              add(item, quantity, minAdventureRank, hasQuestAddons)
            );
            return;
          }
          if (addons.length > 0) {
            openPrompt(item, addons, quantity);
            return;
          }
          // Flag was stale (quests unlinked/hidden since this page rendered) —
          // there is genuinely nothing to declare, so add normally.
        }

        addToCart(item, quantity);
        openCart();
      } finally {
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [addToCart, openCart, openPrompt, openRankGate, openAddonError]
  );

  return { add, pending };
}
