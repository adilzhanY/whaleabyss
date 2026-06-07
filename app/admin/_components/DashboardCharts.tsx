"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Dashboard chart set. Chart type per metric:
 * - Revenue   → area chart: continuous money flow over time, the filled area
 *               conveys volume.
 * - Orders    → bar chart: discrete counts per period.
 * - Clients   → line chart: growth trend of registrations.
 * - Top services → horizontal bars: ranking comparison, labels stay readable.
 * - Order statuses → donut: composition of a whole.
 *
 * Colors come from the --chart-* tokens (brand palette) in globals.css.
 */

export type TimeUnit = "hour" | "day" | "week" | "month";

export interface SeriesPoint {
  /** Bucket start, epoch milliseconds (UTC). */
  t: number;
  revenue: number;
  orders: number;
  clients: number;
}

const tickFormatter = (unit: TimeUnit) => (t: number) => {
  const d = new Date(t);
  switch (unit) {
    case "hour":
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    case "month":
      return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
    default:
      return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  }
};

const labelFormatter = (unit: TimeUnit) => (_label: unknown, payload: readonly { payload?: { t?: number } }[]) => {
  const t = payload?.[0]?.payload?.t;
  if (!t) return "";
  const d = new Date(t);
  if (unit === "hour") {
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  if (unit === "month") {
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
};

// NBSP-joined so recharts' <Text> never wraps the tick onto two lines.
const compactRub = (v: number) =>
  `${new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 })
    .format(v)
    .replace(/\s/g, " ")} ₽`;

const fullRub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;

// ── Revenue: area chart ──────────────────────────────────────────────────────

const revenueConfig = {
  revenue: { label: "Выручка", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RevenueAreaChart({ data, unit }: { data: SeriesPoint[]; unit: TimeUnit }) {
  return (
    // aspect-auto kills ChartContainer's base aspect-video — without it a
    // full-width chart forces a 16:9 height (~560px) and the page scrolls.
    <ChartContainer config={revenueConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={tickFormatter(unit)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={72}
          tickFormatter={(v: number) => compactRub(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={labelFormatter(unit)}
              formatter={(value, _name, item) => (
                <>
                  <div
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  Выручка
                  <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                    {fullRub(Number(value))}
                  </span>
                </>
              )}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#fillRevenue)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Orders: bar chart ────────────────────────────────────────────────────────

const ordersConfig = {
  orders: { label: "Заказы", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function OrdersBarChart({ data, unit }: { data: SeriesPoint[]; unit: TimeUnit }) {
  return (
    <ChartContainer config={ordersConfig} className="aspect-auto h-[160px] w-full">
      <BarChart accessibilityLayer data={data}>
        <defs>
          <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-orders)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={tickFormatter(unit)}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={labelFormatter(unit)} />} />
        <Bar dataKey="orders" fill="url(#fillOrders)" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  );
}

// ── New clients: line chart ──────────────────────────────────────────────────

const clientsConfig = {
  clients: { label: "Новые клиенты", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ClientsLineChart({ data, unit }: { data: SeriesPoint[]; unit: TimeUnit }) {
  return (
    <ChartContainer config={clientsConfig} className="aspect-auto h-[160px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={tickFormatter(unit)}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={labelFormatter(unit)} />} />
        <Line
          dataKey="clients"
          type="monotone"
          stroke="var(--color-clients)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

// ── Top services: horizontal bars ────────────────────────────────────────────

export interface TopServicePoint {
  title: string;
  sold: number;
  revenue: number;
}

const topServicesConfig = {
  sold: { label: "Продажи", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function TopServicesChart({ data }: { data: TopServicePoint[] }) {
  return (
    <ChartContainer
      config={topServicesConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(data.length, 1) * 42 + 12 }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 36 }}
      >
        <XAxis type="number" dataKey="sold" hide />
        <YAxis
          type="category"
          dataKey="title"
          tickLine={false}
          axisLine={false}
          width={104}
          tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="flex flex-col gap-0.5">
                  <span>
                    Продажи: <span className="font-mono font-medium">{String(value)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Выручка: {fullRub(item.payload?.revenue ?? 0)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="sold" radius={6} maxBarSize={28}>
          {data.map((entry, idx) => (
            <Cell key={entry.title} fill={`var(--chart-${(idx % 5) + 1})`} />
          ))}
          <LabelList
            dataKey="sold"
            position="right"
            className="fill-foreground font-bold"
            fontSize={13}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ── Boosters: horizontal bars ────────────────────────────────────────────────
// Same grammar as top services: a small set of named people compared by
// workload. Bar = orders handled in the range; tooltip adds their commission.

export interface BoosterPoint {
  name: string;
  orders: number;
  earned: number;
}

const boostersConfig = {
  orders: { label: "Заказы", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function BoostersChart({ data }: { data: BoosterPoint[] }) {
  return (
    <ChartContainer
      config={boostersConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(data.length, 1) * 42 + 12 }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 36 }}
      >
        <XAxis type="number" dataKey="orders" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={104}
          tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="flex flex-col gap-0.5">
                  <span>
                    Заказы: <span className="font-mono font-medium">{String(value)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Заработок: {fullRub(item.payload?.earned ?? 0)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={6} maxBarSize={28}>
          <LabelList
            dataKey="orders"
            position="right"
            className="fill-foreground font-bold"
            fontSize={13}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// ── Order statuses: donut ────────────────────────────────────────────────────

export interface StatusPoint {
  status: string;
  count: number;
}

const statusConfig = {
  count: { label: "Заказы" },
  paid: { label: "Оплачен", color: "var(--chart-1)" },
  in_progress: { label: "В работе", color: "var(--chart-4)" },
  completed: { label: "Завершён", color: "var(--chart-3)" },
  refunded: { label: "Возврат", color: "var(--chart-5)" },
  cancelled: { label: "Отменён", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function OrderStatusDonut({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="flex flex-col items-center gap-3">
      {/* The legend lives outside the SVG so the ring centers exactly in the
          container — the total is an HTML overlay, dead-center by flexbox. */}
      <div className="relative">
        <ChartContainer config={statusConfig} className="aspect-square h-[170px]">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={50}
              outerRadius={72}
              cornerRadius={6}
              strokeWidth={2}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {total.toLocaleString("ru-RU")}
          </span>
          <span className="text-xs text-muted-foreground">{pluralizeOrders(total)}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d) => {
          const cfg = (statusConfig as Record<string, { label?: string; color?: string }>)[d.status];
          return (
            <span key={d.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: cfg?.color }}
              />
              {cfg?.label ?? d.status}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function pluralizeOrders(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "заказа";
  return "заказов";
}
