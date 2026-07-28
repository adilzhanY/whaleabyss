"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trash2, ShoppingBag, Plus, Minus, X } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useRouter } from "next/navigation";
import { ADDON_CHOICE_CART_LABEL, ADDON_CHOICE_TEXT_CLASS } from "@/lib/addonChoice";
import { confirmDialog, useConfirmStore } from "@/store/useConfirm";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * Below sm the cart comes up from the bottom (thumb-reachable, native-feeling
 * sheet with a drag handle); from sm up it slides in from the right like the
 * old panel. SSR renders nothing open, so the pre-hydration default is safe.
 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

/** Gradient placeholder shared by "no image" and "image failed to load". */
function ItemImageFallback({ title }: { title: string }) {
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-center text-[10px] font-black leading-tight text-white shadow-inner"
      style={{ background: "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)" }}
    >
      {title}
    </div>
  );
}

export default function CartModal() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const total = cartTotal();
  const router = useRouter();
  const isNarrow = useIsNarrow();
  const confirmOpen = useConfirmStore((s) => s.open);

  /**
   * A confirmation dialog is portaled OUTSIDE the drawer's DOM subtree, so
   * every click inside it reads as an "outside interaction" to vaul and used
   * to dismiss the whole cart the moment the user pressed «Удалить». Keep the
   * drawer put while a dialog is stacked above it.
   */
  const keepOpenBehindDialog = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (confirmOpen || target?.closest?.("[data-slot=dialog-content],[data-slot=dialog-overlay]")) {
      event.preventDefault();
    }
  };

  /**
   * Focus moving out must never close the cart. Removing a line unmounts the
   * trash button that held focus, so focus falls back to <body> — which vaul
   * would otherwise read as "the user left" and dismiss the drawer right after
   * a delete. Only the X, Escape or an overlay click may close it.
   */
  const ignoreFocusOutside = (event: Event) => event.preventDefault();

  // Services whose S3 image 404s or fails to decode fall back to the gradient
  // placeholder instead of a broken-image icon.
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Removing a line is destructive and the trash sits next to the quantity
  // controls, so it asks first (the shared site-wide confirmation dialog).
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

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeCart();
      }}
      direction={isNarrow ? "bottom" : "right"}
    >
      <DrawerContent
        // A floating panel, not an edge-to-edge slab: inset from every side so
        // all four corners are visibly rounded, echoing the floating header.
        className="!rounded-[24px] !border-0 shadow-[0_24px_60px_-15px_rgba(9,14,23,0.35)] data-[vaul-drawer-direction=right]:!inset-y-3 data-[vaul-drawer-direction=right]:!right-3 data-[vaul-drawer-direction=right]:!w-[420px] data-[vaul-drawer-direction=right]:!max-w-[calc(100vw-1.5rem)] data-[vaul-drawer-direction=bottom]:!inset-x-3 data-[vaul-drawer-direction=bottom]:!bottom-3 data-[vaul-drawer-direction=bottom]:!max-h-[85vh]"
        style={{
          backgroundColor: "var(--bg-card)",
          fontFamily: "var(--font-primary), sans-serif",
        }}
        aria-describedby={undefined}
        onPointerDownOutside={keepOpenBehindDialog}
        onInteractOutside={keepOpenBehindDialog}
        onFocusOutside={ignoreFocusOutside}
        onEscapeKeyDown={keepOpenBehindDialog}
      >
        <DrawerHeader
          className="flex-row items-center justify-between border-b !px-6 !py-4 !text-left"
          style={{ borderColor: "var(--accent-border)" }}
        >
          <DrawerTitle
            className="!text-lg !font-bold"
            style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
          >
            Корзина
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Выбранные услуги и переход к оплате
          </DrawerDescription>
          <DrawerClose
            aria-label="Закрыть корзину"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
          </DrawerClose>
        </DrawerHeader>

        {/* Items */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag className="h-16 w-16" style={{ color: "var(--accent-border)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Ваша корзина пуста
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Добавьте услугу, чтобы начать
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => {
                // A malformed persisted line (NaN price/quantity from an old
                // localStorage shape) must never crash the drawer - render
                // zeros and let the user remove the line.
                const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
                const linePrice = (Number(item.price) || 0) * quantity;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    {/* Top row: image + title/date */}
                    <div className="flex items-start gap-3">
                      {item.image && !failedImages[item.id] ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                        />
                      ) : (
                        <ItemImageFallback title={item.title} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-800">
                          {item.subtitle}
                        </p>
                        {item.startDate && item.endDate && (
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(item.startDate).toLocaleDateString("ru-RU")} -{" "}
                            {new Date(item.endDate).toLocaleDateString("ru-RU")}
                          </p>
                        )}
                        {item.addonChoice && (
                          <p className={`mt-1 text-xs font-semibold ${ADDON_CHOICE_TEXT_CLASS[item.addonChoice]}`}>
                            {ADDON_CHOICE_CART_LABEL[item.addonChoice]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: trash | qty | price (matches /cart mobile layout) */}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => requestRemove(item.id, item.subtitle || item.title)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-3">
                        {/* btn-sm + btn-icon-only is the design system's square
                            icon button (36px, 32px from md) - without it the
                            unlayered .btn-primary height won and the circles
                            rendered as ellipses. */}
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
                      <p
                        className="text-base font-bold"
                        style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}
                      >
                        {linePrice.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter
            className="border-t !px-6 !py-5 !pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            style={{ borderColor: "var(--accent-border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Итого
              </span>
              <span
                className="text-xl font-bold"
                style={{ color: "var(--text-price)", fontFamily: "var(--font-primary), sans-serif" }}
              >
                {total.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <button
              onClick={() => {
                closeCart();
                router.push("/cart");
              }}
              className="btn-primary w-full !py-3 !text-sm"
            >
              Перейти к оплате
            </button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
