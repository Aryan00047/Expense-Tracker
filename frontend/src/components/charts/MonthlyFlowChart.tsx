import { useMemo } from "react";
import {
  ACCENT,
  ACCENT_SOFT,
  ChartEmpty,
  ChartTooltip,
  GRID_DASH,
  INCOME,
  INK,
  formatCompact,
  formatMonth,
  formatMonthLong,
  formatMoneyPrecise,
  niceScale,
  useChartWidth,
  useTooltip,
} from "./chart-kit";
import type { MonthlySpend } from "../../models/ExpenseModel";

const PAD = { top: 16, right: 14, bottom: 26, left: 56 };
const LABEL_ROW = 22;
/**
 * Clearance above every facet after the first. The facet title and the top
 * gridline label both live in this band, and at the default padding they
 * collided with the "₹0" tick of the facet above.
 */
const FACET_GAP = 38;

interface Facet {
  key: "out" | "in";
  title: string;
  color: string;
  softColor: string;
  height: number;
  valueOf: (item: MonthlySpend) => number;
}

/**
 * Money out and money in as stacked facets rather than paired bars.
 *
 * One salary credit can be ten times any month's spending, and a shared axis
 * would squash every spend bar to a sliver. Two y-scales in one frame is worse
 * still — it lets the two series be made to cross wherever you like — so each
 * measure gets its own small chart over a shared month axis.
 */
const MonthlyFlowChart = ({
  data,
  showIncome,
}: {
  data: MonthlySpend[];
  showIncome: boolean;
}) => {
  const [wrapperRef, width] = useChartWidth<HTMLDivElement>();
  const { tooltip, setTooltip, clear } = useTooltip();

  const facets: Facet[] = showIncome
    ? [
        {
          key: "out",
          title: "Money out",
          color: ACCENT,
          softColor: ACCENT_SOFT,
          height: 150,
          valueOf: (item) => item.amount,
        },
        {
          key: "in",
          title: "Money in",
          color: INCOME,
          softColor: "#b7d3f6",
          height: 110,
          valueOf: (item) => item.income,
        },
      ]
    : [
        {
          key: "out",
          title: "Money out",
          color: ACCENT,
          softColor: ACCENT_SOFT,
          height: 230,
          valueOf: (item) => item.amount,
        },
      ];

  const geometry = useMemo(() => {
    if (!data.length) return null;

    const plotWidth = Math.max(120, width - PAD.left - PAD.right);
    const slot = plotWidth / data.length;
    const barWidth = Math.max(8, Math.min(40, slot * 0.5));

    return { plotWidth, slot, barWidth };
  }, [data, width]);

  if (!geometry) {
    return <ChartEmpty message="Monthly bars appear after your first import." />;
  }

  const { plotWidth, slot, barWidth } = geometry;
  // With more than one facet even the first needs the taller gap, or its title
  // is drawn above the top of the SVG and clipped away.
  const gapFor = (index: number) =>
    index === 0 && facets.length === 1 ? PAD.top : FACET_GAP;
  const totalHeight =
    facets.reduce((sum, facet, index) => sum + facet.height + gapFor(index), 0) + LABEL_ROW;

  let cursorY = 0;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <svg
        width={width}
        height={totalHeight}
        role="img"
        aria-label={
          showIncome ? "Money out and money in by month" : "Spending by month"
        }
        className="block"
      >
        {facets.map((facet, facetIndex) => {
          const top = cursorY + gapFor(facetIndex);
          cursorY += gapFor(facetIndex) + facet.height;

          const peak = Math.max(...data.map(facet.valueOf), 1);
          const scale = niceScale(peak, 3);
          const y = (value: number) => top + facet.height - (value / scale.max) * facet.height;
          const peakMonth = data.reduce((max, item) =>
            facet.valueOf(item) > facet.valueOf(max) ? item : max
          );

          return (
            <g key={facet.key}>
              {facets.length > 1 ? (
                <text x={0} y={top - 16} fontSize={11} fontWeight={600} fill={facet.color}>
                  {facet.title}
                </text>
              ) : null}

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

              {data.map((item, index) => {
                const center = PAD.left + slot * index + slot / 2;
                const value = facet.valueOf(item);
                const height = Math.max(value > 0 ? 2 : 0, facet.height - (y(value) - top));
                const isPeak = item.month === peakMonth.month && value > 0;

                return (
                  <g
                    key={item.month}
                    onMouseEnter={() =>
                      setTooltip({
                        x: center,
                        y: y(value),
                        title: formatMonthLong(item.month),
                        rows: [
                          { label: "Money out", value: formatMoneyPrecise(item.amount), color: ACCENT },
                          ...(showIncome
                            ? [
                                {
                                  label: "Money in",
                                  value: formatMoneyPrecise(item.income),
                                  color: INCOME,
                                },
                                {
                                  label: "Net",
                                  value: formatMoneyPrecise(item.income - item.amount),
                                },
                              ]
                            : []),
                        ],
                      })
                    }
                    onMouseLeave={clear}
                  >
                    <rect
                      x={PAD.left + slot * index}
                      y={top}
                      width={slot}
                      height={facet.height}
                      fill="transparent"
                    />
                    {height > 0 ? (
                      <rect
                        x={center - barWidth / 2}
                        y={top + facet.height - height}
                        width={barWidth}
                        height={height}
                        rx={4}
                        fill={isPeak ? facet.color : facet.softColor}
                      />
                    ) : null}
                    {isPeak ? (
                      <text
                        x={center}
                        y={y(value) - 7}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill={INK.secondary}
                        className="tabular-nums"
                      >
                        {formatCompact(value)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* One shared month axis under the whole stack. */}
        {data.map((item, index) => (
          <text
            key={item.month}
            x={PAD.left + slot * index + slot / 2}
            y={totalHeight - 7}
            textAnchor="middle"
            fontSize={11}
            fill={INK.muted}
          >
            {formatMonth(item.month)}
          </text>
        ))}
      </svg>

      <ChartTooltip tooltip={tooltip} width={width} />
    </div>
  );
};

export default MonthlyFlowChart;
