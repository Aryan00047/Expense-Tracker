import { ChartEmpty, SERIES_COLORS, formatMoney, formatMoneyPrecise } from "./chart-kit";
import type { FlowBreakdown } from "../../models/ExpenseModel";

/** Fixed colour per flow — never assigned by rank, so the bar is stable. */
const FLOW_COLORS: Record<FlowBreakdown["flow"], string> = {
  spend: SERIES_COLORS[2],
  debt: SERIES_COLORS[1],
  investment: SERIES_COLORS[0],
  transfer: SERIES_COLORS[4],
};

/** Each band needs a sentence, or the split is just four numbers in a row. */
const FLOW_MEANING: Record<FlowBreakdown["flow"], string> = {
  spend: "Groceries, food, transport, bills — money actually consumed.",
  debt: "Card bills and EMIs settling purchases you already made.",
  investment: "SIPs, deposits and brokerage transfers — still yours.",
  transfer: "Moved to another account of yours, or withdrawn as cash.",
};

/**
 * A single 100% bar answering "how much of what left my account was actually
 * spending?" — the distinction the old dashboard collapsed by treating a credit
 * card bill and a coffee as the same kind of number.
 */
const FlowSplit = ({ data }: { data: FlowBreakdown[] }) => {
  if (!data.length) {
    return <ChartEmpty message="Import a statement to break down your outflow." />;
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0) || 1;
  const everyday = data.find((item) => item.flow === "spend");

  return (
    <div className="min-w-0">
      {everyday ? (
        <p className="text-sm text-slate-600">
          Of the {formatMoney(total)} that left the account,{" "}
          <span className="font-semibold text-slate-900">
            {formatMoney(everyday.amount)}
          </span>{" "}
          was everyday spending — {everyday.percentage}% of the total.
        </p>
      ) : null}

      <div className="mt-4 flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
        {data.map((item) => (
          <div
            key={item.flow}
            title={`${item.label}: ${formatMoneyPrecise(item.amount)}`}
            style={{
              width: `${Math.max((item.amount / total) * 100, 1)}%`,
              background: FLOW_COLORS[item.flow],
            }}
          />
        ))}
      </div>

      <dl className="mt-5 space-y-3.5">
        {data.map((item) => (
          <div
            key={item.flow}
            className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3.5 last:border-0 last:pb-0"
          >
            <dt className="flex min-w-0 gap-2.5">
              <span
                aria-hidden="true"
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: FLOW_COLORS[item.flow] }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {FLOW_MEANING[item.flow]}
                </span>
              </span>
            </dt>
            <dd className="shrink-0 text-right">
              <span className="block text-sm font-medium text-slate-900 tabular-nums">
                {formatMoney(item.amount)}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 tabular-nums">
                {item.percentage}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default FlowSplit;
