"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { type PortalOrder } from "./_components/PortalOrderCard";
import DashboardHero, {
  type RevenuePayload,
  type StatsPayload,
} from "./_components/DashboardHero";
import ShiftQueue from "./_components/ShiftQueue";
import { confirmDialog } from "@/store/useConfirm";

/**
 * Portal dashboard: «касса» (money with momentum + the milestone goal), the
 * «путь» strip, and the shift queue of ACTIVE orders (online toggle +
 * complete). Past orders live on /portal/orders. Auth/identity is enforced by
 * the layout + API.
 */

interface MePayload {
  profile: { firstName: string; lastName: string };
  revenue: RevenuePayload;
  stats: StatsPayload;
}

export default function PortalDashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, ordersRes] = await Promise.all([
        fetch("/api/portal/me"),
        fetch("/api/portal/orders"),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) {
      console.error("Failed to load portal data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOnline = async (order: PortalOrder) => {
    setBusyOrder(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/portal/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boosterOnline: !order.boosterOnline }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось изменить статус");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, boosterOnline: data.boosterOnline } : o))
      );
    } catch {
      setError("Не удалось изменить статус");
    } finally {
      setBusyOrder(null);
    }
  };

  const completeOrder = async (order: PortalOrder) => {
    const ok = await confirmDialog({
      title: "Завершить заказ?",
      description: "Администратор получит уведомление.",
      confirmLabel: "Завершить",
    });
    if (!ok) return;
    setBusyOrder(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/portal/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось завершить заказ");
        return;
      }
      // Refresh both: order status + revenue (commission was just credited).
      await load();
    } catch {
      setError("Не удалось завершить заказ");
    } finally {
      setBusyOrder(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status === "in_progress");

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Greeting */}
      <div>
        <h1
          className="text-3xl sm:text-4xl font-black text-blue-950"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          Здравствуйте, {me?.profile.firstName ?? "качер"}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Сегодня {today} · у вас {activeOrders.length}{" "}
          {pluralOrders(activeOrders.length)} в работе
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Касса + путь */}
      {me && <DashboardHero revenue={me.revenue} stats={me.stats} />}

      {/* Смена */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            Смена · {activeOrders.length} {pluralOrders(activeOrders.length)}
          </h2>
          <p className="text-xs text-slate-400">
            старые — сверху, чтобы ничего не зависало
          </p>
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          Включайте «Я на аккаунте», когда заходите на аккаунт клиента — клиент видит это в своём заказе.
        </p>
        <ShiftQueue
          orders={activeOrders}
          busyOrderId={busyOrder}
          onToggleOnline={toggleOnline}
          onComplete={completeOrder}
        />
      </section>
    </div>
  );
}

/** «1 заказ / 3 заказа / 6 заказов». */
function pluralOrders(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "заказ";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "заказа";
  return "заказов";
}
