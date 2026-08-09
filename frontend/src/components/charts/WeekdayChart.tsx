import { useMemo } from "react";
import {
  ACCENT,
  ACCENT_SOFT,
  ChartEmpty,
  ChartTooltip,
  GRID_DASH,
  INK,
  formatCompact,
  formatMoneyPrecise,
  niceScale,
  useChartWidth,
  useTooltip,
} from "./chart-kit";
import type { WeekdaySpend } from "../../models/ExpenseModel";

const HEIGHT = 200;
const PAD = { top: 18, right: 8, bottom: 26, left: 52 };

const WeekdayChart = ({ data }: { data: WeekdaySpend[] }) => {
  const [wrapperRef, width] = useChartWidth<HTMLDivElement>();
  const { tooltip, setTooltip, clear } = useTooltip();

  const geometry = useMemo(() => {
    const plotWidth = Math.max(120, width - PAD.left - PAD.right);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const slot = plotWidth / Math.max(data.length, 1);
    const barWidth = Math.max(8, Math.min(38, slot * 0.56));
    const scale = niceScale(Math.max(...data.map((day) => day.amount), 1), 3);

    return { plotWidth, plotHeight, slot, barWidth, scale };
  }, [data, width]);

  if (!data.length || data.every((day) => day.amount === 0)) {
    return <ChartEmpty message="No spending recorded yet." />;
  }

  const { plotWidth, plotHeight, slot, barWidth, scale } = geometry;
  const y = (value: number) => PAD.top + plotHeight - (value / scale.max) * plotHeight;
  const peak = data.reduce((max, day) => (day.amount > max.amount ? day : max));

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <svg width={width} height={HEIGHT} role="img" aria-label="Spending by day of week" className="block">
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? INK.axis : INK.grid}
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : GRID_DASH}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={INK.muted}
              className="tabular-nums"
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        {data.map((day, index) => {
          const center = PAD.left + slot * index + slot / 2;
          const height = Math.max(day.amount > 0 ? 2 : 0, plotHeight - (y(day.amount) - PAD.top));
          const isPeak = day.day === peak.day && day.amount > 0;

          return (
            <g
              key={day.day}
              onMouseEnter={() =>
                setTooltip({
                  x: center,
                  y: y(day.amount),
                  title: day.day,
                  rows: [
                    { label: "Spent", value: formatMoneyPrecise(day.amount), color: ACCENT },
                    { label: "Transactions", value: String(day.count) },
                  ],
                })
              }
              onMouseLeave={clear}
            >
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
              />
              {height > 0 ? (
                <rect
                  x={center - barWidth / 2}
                  y={PAD.top + plotHeight - height}
                  width={barWidth}
                  height={height}
                  rx={4}
                  fill={isPeak ? ACCENT : ACCENT_SOFT}
                />
              ) : null}
              <text x={center} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={INK.muted}>
                {day.day.slice(0, 3)}
              </text>
              {isPeak ? (
                <text
                  x={center}
                  y={y(day.amount) - 7}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={INK.secondary}
                  className="tabular-nums"
                >
                  {formatCompact(day.amount)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <ChartTooltip tooltip={tooltip} width={width} />
    </div>
  );
};

export default WeekdayChart;
