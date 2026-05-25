"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Tag,
} from "lucide-react";
import Input from "@/components/Input";

interface UserOption {
  id: string;
  username: string;
  email: string;
}
interface ServiceOption {
  id: string;
  title: string;
  price: string;
}
interface LineItem {
  serviceId: string;
  title: string;
  unit: number;
  quantity: number;
}

const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ManualOrderForm({
  users,
  services,
}: {
  users: UserOption[];
  services: ServiceOption[];
}) {
  const router = useRouter();

  // Customer
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Services
  const [serviceSearch, setServiceSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  // Promocode
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    const list = q
      ? users.filter(
          (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        )
      : users;
    return list.slice(0, 50);
  }, [users, userSearch]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return services.slice(0, 50);
    return services.filter((s) => s.title.toLowerCase().includes(q)).slice(0, 50);
  }, [services, serviceSearch]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.unit * it.quantity, 0),
    [items]
  );
  const discount = appliedPromo ? (subtotal * appliedPromo.discountPercent) / 100 : 0;
  const total = Math.round((subtotal - discount) * 100) / 100;

  const pickUser = (u: UserOption) => {
    setSelectedUser(u);
    setUserMenuOpen(false);
    setUserSearch("");
    // Promo validity is per-customer — reset it when the customer changes.
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput("");
  };

  const addService = (s: ServiceOption) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.serviceId === s.id);
      if (existing) {
        return prev.map((it) =>
          it.serviceId === s.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { serviceId: s.id, title: s.title, unit: Number(s.price), quantity: 1 }];
    });
  };

  const setQty = (serviceId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((it) => (it.serviceId === serviceId ? { ...it, quantity: qty } : it)));
  };

  const removeItem = (serviceId: string) => {
    setItems((prev) => prev.filter((it) => it.serviceId !== serviceId));
  };

  const applyPromo = async () => {
    if (!selectedUser) {
      setPromoError("Сначала выберите клиента");
      return;
    }
    const code = promoInput.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/admin/orders/validate-promocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId: selectedUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Промокод недействителен");
      setAppliedPromo({ code: data.code, discountPercent: data.discountPercent });
    } catch (e: any) {
      setAppliedPromo(null);
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput("");
  };

  const canSubmit = !!selectedUser && items.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!selectedUser || items.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          items: items.map((it) => ({ serviceId: it.serviceId, quantity: it.quantity })),
          promocode: appliedPromo?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать заказ");
      router.push(`/admin/orders/${data.orderId}`);
    } catch (e: any) {
      setSubmitError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" style={{ fontFamily: "Onest, sans-serif" }}>
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ручной заказ</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Для оплат вне сайта. Заказ создаётся со статусом «оплачен».
          </p>
        </div>
      </div>

      {/* Customer */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Клиент</h2>
        {selectedUser ? (
          <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{selectedUser.username}</div>
              <div className="text-xs text-slate-500 truncate">{selectedUser.email}</div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-sm font-medium text-indigo-600 hover:underline shrink-0"
            >
              Изменить
            </button>
          </div>
        ) : (
          <div className="relative">
            {userMenuOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            )}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-30 pointer-events-none" />
            <Input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserMenuOpen(true);
              }}
              onFocus={() => setUserMenuOpen(true)}
              placeholder="Поиск по имени или email..."
              className="relative z-20 pl-10 text-sm"
            />
            {userMenuOpen && (
              <div className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                {filteredUsers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">Никого не найдено</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => pickUser(u)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800">{u.username}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Services */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Услуги</h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <Input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Найти услугу для добавления..."
            className="pl-10 text-sm"
          />
          {serviceSearch.trim() && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
              {filteredServices.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">Ничего не найдено</div>
              ) : (
                filteredServices.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      addService(s);
                      setServiceSearch("");
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="text-sm text-slate-800">{s.title}</span>
                    <span className="text-sm font-semibold text-slate-600 shrink-0">
                      {fmt(Number(s.price))} ₽
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Услуги не добавлены</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.serviceId}
                className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{it.title}</div>
                  <div className="text-xs text-slate-500">{fmt(it.unit)} ₽ / шт.</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setQty(it.serviceId, it.quantity - 1)}
                    disabled={it.quantity <= 1}
                    className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => setQty(it.serviceId, Math.floor(Number(e.target.value)) || 1)}
                    className="w-12 text-center text-sm font-semibold bg-transparent outline-none"
                  />
                  <button
                    onClick={() => setQty(it.serviceId, it.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-24 text-right text-sm font-semibold text-slate-800 shrink-0">
                  {fmt(it.unit * it.quantity)} ₽
                </div>
                <button
                  onClick={() => removeItem(it.serviceId)}
                  className="p-1.5 rounded-full text-red-500 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Promocode */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Промокод</h2>
        {appliedPromo ? (
          <div className="flex items-center justify-between gap-3 bg-emerald-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <Check className="w-4 h-4" />
              <span className="font-semibold font-mono">{appliedPromo.code}</span>
              <span className="text-sm">−{appliedPromo.discountPercent}%</span>
            </div>
            <button onClick={removePromo} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <Input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Код промокода"
                  className="pl-10 text-sm font-mono uppercase"
                  disabled={!selectedUser}
                />
              </div>
              <button
                onClick={applyPromo}
                disabled={!selectedUser || !promoInput.trim() || promoLoading}
                className="px-5 rounded-full bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors disabled:opacity-40"
              >
                {promoLoading ? "..." : "Применить"}
              </button>
            </div>
            {!selectedUser && (
              <p className="text-xs text-slate-400 mt-2">Сначала выберите клиента</p>
            )}
            {promoError && <p className="text-xs text-red-600 mt-2 font-medium">{promoError}</p>}
          </>
        )}
      </section>

      {/* Summary + submit */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Подытог</span>
          <span className="font-medium">{fmt(subtotal)} ₽</span>
        </div>
        {appliedPromo && (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>Скидка ({appliedPromo.discountPercent}%)</span>
            <span className="font-medium">−{fmt(Math.round(discount * 100) / 100)} ₽</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-base font-semibold text-slate-700">Итого</span>
          <span className="text-2xl font-black text-blue-950">{fmt(total)} ₽</span>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-700">{submitError}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full !py-3 !rounded-full !shadow-lg hover:!shadow-xl transition-shadow disabled:opacity-50"
        >
          {submitting ? "Создание..." : "Создать заказ (оплачен)"}
        </button>
      </section>
    </div>
  );
}
