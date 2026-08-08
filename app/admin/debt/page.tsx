"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import { Calendar, PartyPopper, Plus, Trash2 } from "lucide-react";
import PageHeader from "../_components/PageHeader";
import DataTable, { type Column } from "../_components/DataTable";
import { confirmDialog } from "@/store/useConfirm";
import { formatUsdt } from "@/lib/debt";
import AddPaymentModal from "./AddPaymentModal";

interface DebtPayment {
  id: string;
  amount: string;
  paidAt: string;
  note: string | null;
}

interface DebtSummary {
  creditor: string;
  total: number;
  paid: number;
  remaining: number;
  payments: DebtPayment[];
}

const PAYMENTS_PER_PAGE = 10;

export default function DebtPage() {
  const [data, setData] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDebt = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/debt");
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error("Failed to fetch debt:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebt();
  }, [fetchDebt]);

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: "Удалить этот платёж?",
      confirmLabel: "Удалить",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/debt/${id}`, { method: "DELETE" });
      if (res.ok) fetchDebt();
      else alert("Ошибка при удалении платежа");
    } catch (error) {
      console.error("Failed to delete payment:", error);
      alert("Ошибка при удалении платежа");
    }
  };

  const columns: Column<DebtPayment>[] = [
    {
      key: "amount",
      header: "Сумма",
      render: (p) => (
        <span className="text-base font-bold text-blue-950">{formatUsdt(Number(p.amount))}</span>
      ),
    },
    {
      key: "paidAt",
      header: "Дата платежа",
      render: (p) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          {new Date(p.paidAt).toLocaleDateString("ru-RU")}
        </span>
      ),
    },
    {
      key: "note",
      header: "Комментарий",
      render: (p) => <span className="text-sm text-slate-600">{p.note || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "Действия",
      render: (p) => (
        <button onClick={() => handleDelete(p.id)} className="btn-danger-soft btn-sm text-xs">
          <Trash2 className="h-4 w-4" />
          Удалить
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Не удалось загрузить данные о долге</div>
      </div>
    );
  }

  const cleared = data.remaining <= 0;
  const progress = data.total > 0 ? Math.min(100, (data.paid / data.total) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader subtitle={`Долг перед ${data.creditor} и история платежей`} />

      <div className="flex items-center justify-end">
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-4"
        >
          <Plus className="w-4 h-4" />
          Добавить платёж
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500">
              {cleared ? "Долг погашен" : "Осталось выплатить"}
            </div>
            <div className="text-4xl font-black tracking-tight text-blue-950 mt-1">
              {formatUsdt(cleared ? 0 : data.remaining)}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              получатель — <span className="font-semibold text-slate-700">{data.creditor}</span>
            </div>
          </div>
          <Chip
            size="sm"
            variant="soft"
            color={cleared ? "success" : "warning"}
            className="text-[11px] font-bold"
          >
            <Chip.Label>{cleared ? "Закрыт" : "Активен"}</Chip.Label>
          </Chip>
        </div>

        <div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                cleared ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-slate-500">
              Выплачено{" "}
              <span className="font-semibold text-slate-700">{formatUsdt(data.paid)}</span> из{" "}
              {formatUsdt(data.total)}
            </span>
            <span className="font-semibold text-slate-700">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {cleared && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <PartyPopper className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <p
            className="text-2xl font-black text-emerald-700"
            style={{ fontFamily: "var(--font-primary), sans-serif" }}
          >
            Поздравляем! Долг полностью выплачен 🎉
          </p>
          <p className="text-sm text-emerald-700/80 mt-1">
            {data.creditor} получил все {formatUsdt(data.total)}.
          </p>
        </div>
      )}

      {data.payments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Платежей пока нет</p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4"
          >
            <Plus className="w-4 h-4" />
            Добавить первый платёж
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data.payments}
          getRowKey={(p) => p.id}
          page={page}
          {...(data.payments.length > PAYMENTS_PER_PAGE ? { pageSize: PAYMENTS_PER_PAGE } : {})}
          onPageChange={setPage}
        />
      )}

      {modalOpen && (
        <AddPaymentModal onClose={() => setModalOpen(false)} onAdded={fetchDebt} />
      )}
    </div>
  );
}
