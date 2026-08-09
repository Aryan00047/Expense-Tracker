import { useMemo } from "react";
import {
  ChartEmpty,
  ChartTooltip,
  GRID_DASH,
  INK,
  Legend,
  SERIES_COLORS,
  formatCompact,
  formatMonth,
  formatMonthLong,
  formatMoneyPrecise,
  niceScale,
  useChartWidth,
  useTooltip,
} from "./chart-kit";
import type { CategoryTrendMonth } from "../../models/ExpenseModel";

const HEIGHT = 260;
const PAD = { top: 16, right: 14, bottom: 30, left: 56 };
/** Surface gap so neighbouring segments never read as one block. */
const SEGMENT_GAP = 2;

/**
 * Where each month's spend went. Categories are assigned a colour slot once, by
 * identity — filtering the date range must not repaint the survivors.
 */
const CategoryMixChart = ({
  data,
  categories,
}: {
  data: CategoryTrendMonth[];
  categories: string[];
}) => {
  const [wrapperRef, width] = useChartWidth<HTMLDivElement>();
  const { tooltip, setTooltip, clear } = useTooltip();

  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category, index) => {
      map.set(category, SERIES_COLORS[index % SERIES_COLORS.length]);
    });
    return map;
  }, [categories]);

  const geometry = useMemo(() => {
    if (!data.length || !categories.length) return null;

    const plotWidth = Math.max(120, width - PAD.left - PAD.right);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const slot = plotWidth / data.length;
    const barWidth = Math.max(10, Math.min(46, slot * 0.6));

    const totals = data.map((month) =>
      Object.values(month.segments).reduce((sum, value) => sum + value, 0)
    );
    const scale = niceScale(Math.max(...totals, 1));

    return { plotWidth, plotHeight, slot, barWidth, scale, totals };
  }, [data, categories, width]);

  if (!geometry) {
    return <ChartEmpty message="Category mix needs at least one categorised month." />;
  }

  const { plotWidth, plotHeight, slot, barWidth, scale, totals } = geometry;
  const toPixels = (value: number) => (value / scale.max) * plotHeight;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <svg width={width} height={HEIGHT} role="img" aria-label="Spending mix by month" className="block">
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotWidth}
              y1={PAD.top + plotHeight - toPixels(tick)}
              y2={PAD.top + plotHeight - toPixels(tick)}
              stroke={tick === 0 ? INK.axis : INK.grid}
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : GRID_DASH}
            />
            <text
              x={PAD.left - 8}
              y={PAD.top + plotHeight - toPixels(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={INK.muted}
              className="tabular-nums"
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        {data.map((month, monthIndex) => {
          const center = PAD.left + slot * monthIndex + slot / 2;
          let cursor = PAD.top + plotHeight;

          const present = categories
            .map((category) => ({ category, value: month.segments[category] || 0 }))
            .filter((entry) => entry.value > 0);

          return (
            <g
              key={month.month}
              onMouseEnter={() =>
                setTooltip({
                  x: center,
                  y: PAD.top + plotHeight - toPixels(totals[monthIndex]),
                  title: formatMonthLong(month.month),
                  rows: [
                    ...[...present]
                      .sort((a, b) => b.value - a.value)
                      .map((entry) => ({
                        label: entry.category,
                        value: formatMoneyPrecise(entry.value),
                        color: colorOf.get(entry.category),
                      })),
                    { label: "Total", value: formatMoneyPrecise(totals[monthIndex]) },
                  ],
                })
              }
              onMouseLeave={clear}
            >
              <rect
                x={PAD.left + slot * monthIndex}
                y={PAD.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
              />

              {present.map((entry, entryIndex) => {
                const raw = toPixels(entry.value);
                const isTop = entryIndex === present.length - 1;
                const height = Math.max(1, raw - (isTop ? 0 : SEGMENT_GAP));
                const y = cursor - raw;
                cursor -= raw;

                return (
                  <rect
                    key={entry.category}
                    x={center - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={isTop ? 4 : 0}
                    fill={colorOf.get(entry.category)}
                  />
                );
              })}

              <text
                x={center}
                y={HEIGHT - 10}
                textAnchor="middle"
                fontSize={11}
                fill={INK.muted}
              >
                {formatMonth(month.month)}
              </text>
            </g>
          );
        })}
      </svg>

      <ChartTooltip tooltip={tooltip} width={width} />

      <Legend
        items={categories.map((category) => ({
          label: category,
          color: colorOf.get(category) || SERIES_COLORS[0],
        }))}
      />
    </div>
  );
};

export default CategoryMixChart;
