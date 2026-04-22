import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({
  message = "Оплата успешно прошла, заказ в очереди!",
  show,
  onClose,
}: {
  message?: string;
  show: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-lg bg-white p-4 shadow-xl border border-[#e2e8f0] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <CheckCircle2 className="h-6 w-6 text-green-500" />
      <p className="mr-8 text-sm font-bold text-slate-800">{message}</p>
      <button
        onClick={onClose}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
