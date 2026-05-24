"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { TIME_RANGE_OPTIONS, type TimeRange } from "./timeRange";
import CustomSelect from "@/components/CustomSelect";

export default function TimeRangeSelect({ value }: { value: TimeRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
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
    <CustomSelect
      value={value}
      onChange={onChange}
      disabled={pending}
      buttonClassName="bg-white px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
      options={TIME_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
    />
  );
}
