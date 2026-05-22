"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { TIME_RANGE_OPTIONS, type TimeRange } from "./timeRange";

export default function TimeRangeSelect({ value }: { value: TimeRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const qs = params.toString();
    const href = qs ? `/admin?${qs}` : "/admin";
    startTransition(() => router.push(href));
  };

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={pending}
      className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 cursor-pointer"
    >
      {TIME_RANGE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
