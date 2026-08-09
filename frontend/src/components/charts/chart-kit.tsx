import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Categorical slots, in fixed order — never cycled, never reassigned by rank.
 * Validated against a white chart surface: worst adjacent CVD ΔE 9.1, worst
 * adjacent normal-vision ΔE 19.6. Three slots sit under 3:1 contrast, so every
 * chart that uses them also ships a legend, hover values and the transactions
 * table (the relief rule).
 */
export const SERIES_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
] as const;

/** Single-series mark colour: the product's emerald, at 3.77:1 on white. */
export const ACCENT = "#059669";
export const ACCENT_SOFT = "#a7e0c8";
export const INCOME = "#2a78d6";

export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
} as const;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const formatMoney = (value: number) => inr.format(value);
export const formatMoneyPrecise = (value: number) => inrPrecise.format(value);

/** Axis ticks need to stay narrow: ₹1.2L rather than ₹1,20,000. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${Math.round(value / 1_000)}K`;
  return `₹${Math.round(value)}`;
}

export function formatMonth(month: string): string {
  const [year, monthPart] = month.split("-").map(Number);
  if (!year || !monthPart) return month;
  return new Date(year, monthPart - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export function formatMonthLong(month: string): string {
  const [year, monthPart] = month.split("-").map(Number);
  if (!year || !monthPart) return month;
  return new Date(year, monthPart - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * "Nice" axis ceiling and step, so gridlines land on round numbers instead of
 * whatever the maximum happens to be.
 */
export function niceScale(max: number, targetTicks = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] };

  const rawStep = max / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) *
    magnitude;

  const ceiling = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= ceiling + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return { max: ceiling, ticks };
}

/**
 * Charts are drawn at real pixel sizes rather than a scaled viewBox — stretching
 * a viewBox to fit would distort every label and stroke along with the geometry.
 */
export function useChartWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });

    observer.observe(element);
    setWidth(element.getBoundingClientRect().width || fallback);

    return () => observer.disconnect();
  }, [fallback]);

  return [ref, width] as const;
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
}

/**
 * A single floating tooltip per chart, positioned against the chart box and
 * flipped near the right edge so it never spills out of the card.
 */
export function ChartTooltip({
  tooltip,
  width,
}: {
  tooltip: TooltipState | null;
  width: number;
}) {
  if (!tooltip) return null;

  const flip = tooltip.x > width - 150;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-[9rem] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={{
        left: flip ? undefined : tooltip.x + 12,
        right: flip ? width - tooltip.x + 12 : undefined,
        top: Math.max(0, tooltip.y - 12),
      }}
    >
      <p className="font-medium text-slate-900">{tooltip.title}</p>
      <ul className="mt-1.5 space-y-1">
        {tooltip.rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
          />
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

/** Escape hatch used by every chart's hover handler. */
export function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const clear = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    const onScroll = () => setTooltip(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { tooltip, setTooltip, clear };
}

export const GRID_DASH = "3 4";
