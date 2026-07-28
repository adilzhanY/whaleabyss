"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import PortalOrderCard, { type PortalOrder, rub } from "./_components/PortalOrderCard";
import { confirmDialog } from "@/store/useConfirm";

/**
 * Portal dashboard: greeting, revenue/work metrics, and ACTIVE orders only
 * (with the online toggle + complete action). Past orders live on
 * /portal/orders. Auth/identity is enforced by the layout + API.
 */

interface MePayload {
  profile: { firstName: string; lastName: string };
  revenue: { balance: number; totalEarned: number };
  stats: { totalOrders: number; activeOrders: number; completedOrders: number };
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1
          className="text-3xl sm:text-4xl font-black text-blue-950"
          style={{ fontFamily: "var(--font-primary), sans-serif" }}
        >
          Здравствуйте, {me?.profile.firstName ?? "качер"}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ваша сводка: заработок и активные заказы
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          tone="bg-emerald-50 text-emerald-600"
          label="К выплате"
          value={rub(me?.revenue.balance ?? 0)}
        />
        <StatCard
          icon={TrendingUp}
          tone="bg-blue-50 text-blue-700"
          label="Заработано всего"
          value={rub(me?.revenue.totalEarned ?? 0)}
        />
        <StatCard
          icon={ShoppingBag}
          tone="bg-amber-50 text-amber-600"
          label="В работе"
          value={String(me?.stats.activeOrders ?? 0)}
        />
        <StatCard
          icon={CheckCircle2}
          tone="bg-slate-100 text-slate-600"
          label="Выполнено"
          value={String(me?.stats.completedOrders ?? 0)}
        />
      </div>

      {/* Active orders */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Активные заказы</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Включайте «Я на аккаунте», когда заходите на аккаунт клиента — клиент видит это в своём заказе.
          </p>
        </div>
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Сейчас нет заказов в работе
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeOrders.map((o) => (
              <PortalOrderCard
                key={o.id}
                order={o}
                busy={busyOrder === o.id}
                onToggleOnline={toggleOnline}
                onComplete={completeOrder}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-2xl ${tone} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</div>
    </div>
  );
}
