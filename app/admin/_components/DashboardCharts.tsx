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

export interface SeriesPoint {
  /** X-axis label — a quarter of the selected month, e.g. "1–7" or "22–31". */
  label: string;
  revenue: number;
  orders: number;
  clients: number;
  /** Booster commission paid out for orders in this bucket (what we give). */
  commission: number;
  /** Revenue kept after paying booster commission (revenue − commission). */
  net: number;
}

// NBSP-joined so recharts' <Text> never wraps the tick onto two lines.
const compactRub = (v: number) =>
  `${new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 })
    .format(v)
    .replace(/\s/g, " ")} ₽`;

const fullRub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;

// ── Net revenue: gross vs after-commission area chart ────────────────────────
// Two stacked-look areas: the full revenue (what we take) and the net kept after
// paying booster commission (what's left). The gap between them is what we give.

const netRevenueConfig = {
  revenue: { label: "Выручка", color: "var(--chart-2)" },
  net: { label: "Чистая выручка", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Shared shadcn-style tooltip shell so custom tooltips match ChartTooltipContent. */
function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border/50 bg-background grid min-w-[10rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      {children}
    </div>
  );
}

function TooltipRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      {color ? (
        <div className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
      ) : (
        <div className="size-2.5 shrink-0" />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground ml-auto font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}

type TooltipPayload = readonly { payload?: SeriesPoint }[];

function NetRevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <TooltipBox>
      <div className="font-medium">{p.label}</div>
      <TooltipRow label="Выручка" value={fullRub(p.revenue)} color="var(--chart-2)" />
      <TooltipRow label="Бустерам" value={fullRub(p.commission)} color="var(--muted-foreground)" />
      <TooltipRow label="Чистыми" value={fullRub(p.net)} color="var(--chart-3)" />
    </TooltipBox>
  );
}

export function NetRevenueAreaChart({ data }: { data: SeriesPoint[] }) {
  return (
    // aspect-auto kills ChartContainer's base aspect-video — without it a
    // full-width chart forces a 16:9 height (~560px) and the page scrolls.
    <ChartContainer config={netRevenueConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-net)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-net)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={72}
          tickFormatter={(v: number) => compactRub(v)}
        />
        <ChartTooltip content={<NetRevenueTooltip />} />
        {/* Gross drawn first (behind), net on top — the visible band between the
            two strokes is the commission paid to boosters. */}
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="url(#fillGross)"
        />
        <Area
          dataKey="net"
          type="monotone"
          stroke="var(--color-net)"
          strokeWidth={2}
          fill="url(#fillNet)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Booster earnings: total commission over time, top-5 breakdown in tooltip ──

export interface BoosterSeriesPoint {
  /** X-axis label — a quarter of the selected month, e.g. "1–7" or "22–31". */
  label: string;
  /** Total commission earned by all boosters in this bucket. */
  total: number;
  /** Highest-earning boosters in this bucket (already sorted desc, ≤5). */
  top: { name: string; earned: number }[];
}

const boosterRevenueConfig = {
  total: { label: "Заработок бустеров", color: "var(--chart-4)" },
} satisfies ChartConfig;

function BoosterRevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: BoosterSeriesPoint }[];
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <TooltipBox>
      <div className="font-medium">{p.label}</div>
      <TooltipRow label="Всего" value={fullRub(p.total)} color="var(--chart-4)" />
      {p.top.length > 0 && (
        <>
          <div className="text-muted-foreground mt-0.5 border-t pt-1 text-[11px] uppercase tracking-wide">
            Топ бустеров
          </div>
          {p.top.map((b, i) => (
            <div key={b.name} className="flex items-center gap-2">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="truncate">{b.name}</span>
              <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                {fullRub(b.earned)}
              </span>
            </div>
          ))}
        </>
      )}
    </TooltipBox>
  );
}

export function BoosterRevenueChart({ data }: { data: BoosterSeriesPoint[] }) {
  return (
    <ChartContainer config={boosterRevenueConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id="fillBoosterRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={72}
          tickFormatter={(v: number) => compactRub(v)}
        />
        <ChartTooltip content={<BoosterRevenueTooltip />} />
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="url(#fillBoosterRevenue)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Orders: bar chart ────────────────────────────────────────────────────────

const ordersConfig = {
  orders: { label: "Заказы", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function OrdersBarChart({ data }: { data: SeriesPoint[] }) {
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
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="orders" fill="url(#fillOrders)" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  );
}

// ── New clients: line chart ──────────────────────────────────────────────────

const clientsConfig = {
  clients: { label: "Новые клиенты", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ClientsLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartContainer config={clientsConfig} className="aspect-auto h-[160px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
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
