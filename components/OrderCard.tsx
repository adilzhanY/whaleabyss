import {
  Clock,
  ListOrdered,
  PlayCircle,
  CheckCircle2,
  XCircle,
  RotateCcw
} from "lucide-react";

interface OrderItem {
  serviceId?: string;
  serviceTitle?: string;
  serviceImage?: string;
  serviceName?: string;
  quantity?: number;
  [key: string]: unknown;
}

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    createdAt: string;
    totalAmount?: number | string;
    items?: OrderItem[];
    [key: string]: unknown;
  };
  isGrayscale?: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
  pending: { label: "Ожидает оплаты", icon: Clock, colorClass: "bg-slate-100 text-slate-700" },
  paid: { label: "В очереди", icon: ListOrdered, colorClass: "bg-green-100 text-green-800" },
  in_progress: { label: "В процессе", icon: PlayCircle, colorClass: "bg-blue-100 text-blue-800" },
  completed: { label: "Выполнен", icon: CheckCircle2, colorClass: "bg-green-100 text-green-700" },
  cancelled: { label: "Отменен", icon: XCircle, colorClass: "bg-red-50 text-red-600" },
  refunded: { label: "Возвращен", icon: RotateCcw, colorClass: "bg-yellow-50 text-yellow-700" }
};

export default function OrderCard({ order, isGrayscale = false }: OrderCardProps) {
  const config = statusConfig[order.status] || { label: order.status, icon: Clock, colorClass: "bg-slate-100 text-slate-700" };
  const StatusIcon = config.icon;

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow text-left h-full ${isGrayscale ? "grayscale-[0.3] opacity-80 hover:opacity-100" : ""}`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            № {order.id.slice(0, 8)}
          </span>
          <span className={`inline-flex items-center justify-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider ${config.colorClass}`}>
            <StatusIcon className="w-4 h-4" strokeWidth={2.5} />
            {config.label}
          </span>
        </div>

        <div className="space-y-4 mb-6">
          {order.items?.map((item: OrderItem, idx: number) => {
            const imageUrl = item.serviceImage || '';
            const isYandexS3 = imageUrl && !imageUrl.startsWith('url(');
            const finalImage = isYandexS3 ? imageUrl : null;

            return (
              <div key={idx} className="flex gap-3 items-center">
                {finalImage ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={finalImage}
                      alt={item.serviceName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                    {item.serviceName || "Неизвестная услуга"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{item.quantity} шт.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Сумма</span>
          <span className="font-black text-slate-800 text-lg">
            {Number(order.totalPrice).toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}
