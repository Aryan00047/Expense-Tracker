import { useMemo, useState } from "react";
import {
  ACCENT,
  ACCENT_SOFT,
  ChartEmpty,
  ChartTooltip,
  GRID_DASH,
  INK,
  INCOME,
  Legend,
  formatCompact,
  formatDay,
  formatMoneyPrecise,
  niceScale,
  useChartWidth,
  useTooltip,
} from "./chart-kit";
import type { DailySpend } from "../../models/ExpenseModel";

const HEIGHT = 240;
const PAD = { top: 14, right: 14, bottom: 28, left: 56 };
const AVERAGE_WINDOW = 7;

/** Centred-trailing mean; the first days simply average what exists so far. */
function rollingAverage(values: number[], window: number): number[] {
  const output: number[] = [];
  let sum = 0;

  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= window) sum -= values[index - window];
    output.push(sum / Math.min(index + 1, window));
  }

  return output;
}

const SpendTrendChart = ({ data }: { data: DailySpend[] }) => {
  const [wrapperRef, width] = useChartWidth<HTMLDivElement>();
  const { tooltip, setTooltip, clear } = useTooltip();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (data.length < 2) return null;

    const plotWidth = Math.max(120, width - PAD.left - PAD.right);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const amounts = data.map((point) => point.amount);
    const average = rollingAverage(amounts, AVERAGE_WINDOW);
    const scale = niceScale(Math.max(...amounts, 1));

    const x = (index: number) =>
      PAD.left + (index / (data.length - 1)) * plotWidth;
    const y = (value: number) =>
      PAD.top + plotHeight - (value / scale.max) * plotHeight;

    const linePath = data
      .map((point, index) => `${index ? "L" : "M"}${x(index)} ${y(point.amount)}`)
      .join(" ");

    const areaPath = `${linePath} L${x(data.length - 1)} ${PAD.top + plotHeight} L${PAD.left} ${
      PAD.top + plotHeight
    } Z`;

    const averagePath = average
      .map((value, index) => `${index ? "L" : "M"}${x(index)} ${y(value)}`)
      .join(" ");

    // One tick per month start keeps the axis legible across a long statement.
    const monthTicks = data
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.date.endsWith("-01"));

    return { plotWidth, plotHeight, scale, x, y, linePath, areaPath, averagePath, average, monthTicks };
  }, [data, width]);

  if (!geometry) {
    return <ChartEmpty message="A day-by-day trend appears once your statement covers more than one day." />;
  }

  const { plotWidth, plotHeight, scale, x, y, linePath, areaPath, averagePath, average, monthTicks } =
    geometry;

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - bounds.left;
    const ratio = (offset - PAD.left) / plotWidth;
    const index = Math.round(Math.min(1, Math.max(0, ratio)) * (data.length - 1));
    const point = data[index];

    setActiveIndex(index);
    setTooltip({
      x: x(index),
      y: y(point.amount),
      title: formatDay(point.date),
      rows: [
        { label: "Spent", value: formatMoneyPrecise(point.amount), color: ACCENT },
        {
          label: `${AVERAGE_WINDOW}-day average`,
          value: formatMoneyPrecise(average[index]),
          color: INCOME,
        },
      ],
    });
  };

  const onLeave = () => {
    setActiveIndex(null);
    clear();
  };

  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Daily spending from ${formatDay(data[0].date)} to ${formatDay(
          data[data.length - 1].date
        )}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="block touch-none"
      >
        <defs>
          <linearGradient id="spend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT_SOFT} stopOpacity="0.85" />
            <stop offset="100%" stopColor={ACCENT_SOFT} stopOpacity="0.08" />
          </linearGradient>
        </defs>

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

        <path d={areaPath} fill="url(#spend-area)" />
        <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
        <path
          d={averagePath}
          fill="none"
          stroke={INCOME}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="5 4"
        />

        {monthTicks.map(({ point, index }) => (
          <text
            key={point.date}
            x={x(index)}
            y={HEIGHT - 8}
            textAnchor={index === 0 ? "start" : "middle"}
            fontSize={11}
            fill={INK.muted}
          >
            {new Date(point.date).toLocaleDateString("en-IN", { month: "short" })}
          </text>
        ))}

        {active && activeIndex !== null ? (
          <g>
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke={INK.axis}
              strokeWidth={1}
            />
            <circle
              cx={x(activeIndex)}
              cy={y(active.amount)}
              r={5}
              fill={ACCENT}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        ) : null}
      </svg>

      <ChartTooltip tooltip={tooltip} width={width} />

      <Legend
        items={[
          { label: "Daily spend", color: ACCENT },
          { label: `${AVERAGE_WINDOW}-day average`, color: INCOME },
        ]}
      />
    </div>
  );
};

export default SpendTrendChart;
