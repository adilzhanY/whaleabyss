"use client";

import { useEffect, useState } from "react";
import {
  Hash,
  Percent,
  CreditCard,
  Cake,
  CalendarDays,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { fmtDate } from "../_components/PortalOrderCard";

/**
 * /portal/profile — the booster's full profile. Legal data is read-only:
 * changes go through the administrator.
 */

interface Profile {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  inn: string | null;
  payoutDetails: string | null;
  commissionPercent: number;
  startDate: string | null;
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/me");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-24 text-sm text-slate-500">Не удалось загрузить профиль</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black">
          {profile.firstName.charAt(0)}
          {profile.lastName.charAt(0)}
        </div>
        <div>
          <h1
            className="text-3xl font-black text-blue-950"
            style={{ fontFamily: "var(--font-primary), sans-serif" }}
          >
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Профиль качера</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Данные</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow icon={Hash} label="Имя" value={profile.firstName} />
          <InfoRow icon={Hash} label="Фамилия" value={profile.lastName} />
          <InfoRow icon={Cake} label="Дата рождения" value={fmtDate(profile.birthDate)} />
          <InfoRow icon={Hash} label="ИНН" value={profile.inn || "—"} mono />
          <InfoRow icon={CreditCard} label="Реквизиты для выплат" value={profile.payoutDetails || "—"} />
          <InfoRow icon={Percent} label="Комиссия" value={`${profile.commissionPercent}%`} />
          <InfoRow icon={CalendarDays} label="В команде с" value={fmtDate(profile.startDate)} />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
        Это юридические данные — изменить их самостоятельно нельзя. Если что-то
        неверно, обратитесь к администратору.
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`text-sm text-slate-700 break-words ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
