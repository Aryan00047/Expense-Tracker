import { ACCENT, ChartEmpty, formatMoney } from "./chart-kit";
import type { CategorySpend } from "../../models/ExpenseModel";

/**
 * One series, so no legend and no colour coding — length carries the magnitude
 * and every bar is directly labelled with its rupee value and share.
 */
const CategoryBars = ({ data }: { data: CategorySpend[] }) => {
  if (!data.length) {
    return <ChartEmpty message="Upload a statement to see where your money goes." />;
  }

  const peak = Math.max(...data.map((item) => item.amount), 1);

  return (
    <ul className="space-y-3.5">
      {data.map((item) => (
        <li key={item.category} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">{item.category}</span>
            <span className="shrink-0 font-medium text-slate-900 tabular-nums">
              {formatMoney(item.amount)}
              <span className="ml-1.5 font-normal text-slate-500">{item.percentage}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((item.amount / peak) * 100, 1.5)}%`,
                background: ACCENT,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default CategoryBars;
