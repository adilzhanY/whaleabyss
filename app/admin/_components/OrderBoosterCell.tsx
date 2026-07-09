"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import AssignBoosterModal from "../orders/AssignBoosterModal";

interface OrderBoosterCellProps {
  orderId: string;
  status: string;
  boosterId: string | null;
  boosterFirstName: string | null;
  /**
   * Optional state updater for client-side tables (e.g. /admin/orders) so the
   * row reflects the new booster/status without a refetch. When omitted (e.g.
   * the server-rendered dashboard), the cell calls router.refresh() instead so
   * sibling cells like the status badge stay in sync.
   */
  onResult?: (boosterId: string, boosterFirstName: string, newStatus: string) => void;
}

export default function OrderBoosterCell({
  orderId,
  status,
  boosterId,
  boosterFirstName,
  onResult,
}: OrderBoosterCellProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const handleAssigned = (newBoosterId: string, firstName: string, newStatus: string) => {
    if (onResult) onResult(newBoosterId, firstName, newStatus);
    else router.refresh();
  };

  const hasBooster = boosterId && boosterFirstName;
  const blocked =
    status === "cancelled" || status === "pending" || status === "refunded";

  return (
    <>
      {hasBooster ? (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/booster/${boosterId}`}
            className="font-medium text-indigo-600 hover:underline"
          >
            {boosterFirstName}
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            title="Сменить качера"
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : blocked ? (
        <span className="text-slate-300">—</span>
      ) : (
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary !px-3 !py-1.5 text-xs"
        >
          Назначить
        </button>
      )}

      {modalOpen && (
        <AssignBoosterModal
          orderId={orderId}
          currentBoosterId={boosterId}
          onClose={() => setModalOpen(false)}
          onAssigned={handleAssigned}
        />
      )}
    </>
  );
}
