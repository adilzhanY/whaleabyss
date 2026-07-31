"use client";

import { useEffect, useState } from "react";
import ServiceCard from "@/components/ServiceCard";
import { getOrderStatusMeta } from "@/lib/orderStatus";
import type { ServiceItem } from "@/lib/services";

/**
 * The hero's right column: the product as proof, instead of the full-height
 * mascot (which read as an anime poster to a first-time visitor).
 *
 * Three floating cards. The two service cards are the REAL `ServiceCard` fed
 * with live data from the server — a mock copy would silently drift on the next
 * card redesign or price change, which is exactly what a first screen must not
 * do. The front card is a vignette of the customer order card that plays the
 * order's life on loop: оплачен → в работе (качер на аккаунте) → выполнен.
 *
 * The whole stack is `inert` + aria-hidden: it is a picture of the product, not
 * the product — the real entry points are the CTA on the left and the catalogue
 * below. (Plain aria-hidden would be a violation with focusable links inside;
 * inert removes them from the tab order too.)
 *
 * Choreography lives in globals.css keyed off `data-phase`; this component only
 * advances the phase. Reduced-motion visitors get a static «в работе» frame —
 * the most informative single frame — with no timers running.
 */

type Phase = "paid" | "in_progress" | "completed";

const CYCLE: Phase[] = ["paid", "in_progress", "completed"];
/** How long each status holds before the story advances. */
const HOLD_MS = 3400;
/** The loop restart: fade out at «выполнен», snap back, fade in at «оплачен».
 *  Without the fade the connectors visibly rewind, which reads as a glitch. */
const RESET_FADE_MS = 380;

const TIMING_LINE: Record<Phase, string> = {
  paid: "Оплачен только что · ждёт качера",
  in_progress: "Взят в работу · качер на задании",
  completed: "Выполнен · аккаунт снова ваш",
};

/** Mocked order lines — real services, real prices (2 700 + 2 × 300). */
const ORDER_ITEMS = [
  { name: "ИНАДЗУМА 100%", qty: 1 },
  { name: "В ГОРАХ", qty: 2 },
];
const ORDER_TOTAL = "3 300 ₽";

export default function HeroShowcase({ services }: { services: ServiceItem[] }) {
  const [phase, setPhase] = useState<Phase>("paid");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => alive && fn(), ms));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // One static frame, the most informative one. Scheduled (not set inline)
      // so hydration still starts from the server-rendered «paid» frame.
      later(() => setPhase("in_progress"), 0);
      return () => {
        alive = false;
        timers.forEach(clearTimeout);
      };
    }
    const advance = (idx: number) =>
      later(() => {
        const next = (idx + 1) % CYCLE.length;
        if (next === 0) {
          setResetting(true);
          later(() => setPhase("paid"), RESET_FADE_MS);
          later(() => {
            setResetting(false);
            advance(0);
          }, RESET_FADE_MS + 80);
        } else {
          setPhase(CYCLE[next]);
          advance(next);
        }
      }, HOLD_MS);
    advance(0);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const meta = getOrderStatusMeta(phase);
  const StatusIcon = meta.icon;

  return (
    <div className="hs-stack" inert aria-hidden="true">
      {/* Fan layout: the order card front and centre, a service card peeking
          out from behind on each side, tilted outward like a hand of cards. */}
      {services[0] && (
        <div className="hs-svc hs-svc--left">
          <ServiceCard item={services[0]} categorySlug={services[0].categorySlug} />
        </div>
      )}
      {services[1] && (
        <div className="hs-svc hs-svc--right">
          <ServiceCard item={services[1]} categorySlug={services[1].categorySlug} />
        </div>
      )}

      <div className={`hs-order ${resetting ? "hs-order--resetting" : ""}`} data-phase={phase}>
        <div className="hs-order__body">
          <div className="flex items-start justify-between gap-3">
            {/* key={phase} restarts the enter animation, so the pill rolls in
                instead of snapping when the status changes */}
            <span
              key={phase}
              className={`hs-swap inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.classes}`}
            >
              <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {meta.label}
            </span>
            <span className="text-lg font-extrabold tabular-nums text-slate-900">
              {ORDER_TOTAL}
            </span>
          </div>
          <p key={`line-${phase}`} className="hs-swap mt-1 text-[12.5px] text-slate-500">
            {TIMING_LINE[phase]}
          </p>

          {/* Fixed-height slot: the badge fades in during «в работе» without
              reflowing the card. */}
          <div className="mt-1.5 h-7">
            <span className="hs-live inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="hs-pulse" />
              Качер на аккаунте
            </span>
          </div>

          <div className="mt-1.5 rounded-xl bg-slate-50 px-3 py-3">
            <div className="hs-track">
              <div className="hs-step">
                <span className="hs-dot hs-dot--paid" />
                <span className="hs-cap hs-cap--paid">Оплачен</span>
              </div>
              <span className="hs-conn hs-conn--1" />
              <div className="hs-step">
                <span className="hs-dot hs-dot--work" />
                <span className="hs-cap hs-cap--work">В работе</span>
              </div>
              <span className="hs-conn hs-conn--2" />
              <div className="hs-step">
                {/* Grows into a larger circle with a check on «выполнен». The
                    check is drawn as a dash-offset stroke so it draws itself in
                    rather than fading in. */}
                <span className="hs-dot hs-dot--done">
                  <svg viewBox="0 0 10 10" className="hs-check" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.3 5.3 4.3 7.2 7.9 3.1" />
                  </svg>
                </span>
                <span className="hs-cap hs-cap--done">Выполнен</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ORDER_ITEMS.map(({ name, qty }) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold uppercase text-slate-500">
                  {name.charAt(0)}
                </span>
                <span className="text-[12.5px] font-medium text-slate-700">{name}</span>
                {qty > 1 && (
                  <span className="text-[12px] font-semibold text-slate-400">×{qty}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
