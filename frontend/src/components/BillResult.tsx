import { formatDay, formatMoneyPrecise } from "./charts/chart-kit";
import type { BillAnalysis } from "../models/ExpenseModel";

const Row = ({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div
    className={`flex items-baseline justify-between gap-4 ${
      emphasis ? "border-t border-slate-200 pt-2.5" : ""
    }`}
  >
    <span className={emphasis ? "text-sm font-medium text-slate-900" : "text-sm text-slate-500"}>
      {label}
    </span>
    <span
      className={`shrink-0 tabular-nums ${
        emphasis ? "text-base font-semibold text-slate-900" : "text-sm text-slate-700"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * The breakdown of a single bill.
 *
 * Rendered only when an upload turned out to be one — it is a result, not a
 * second place to upload things, which is what the old bill card had become.
 */
const BillResult = ({ bill, onDismiss }: { bill: BillAnalysis; onDismiss: () => void }) => (
  <section className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[1.9rem] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
          Bill read
        </p>
        <h2 className="mt-2 truncate text-lg font-semibold text-slate-900 sm:text-xl">
          {bill.vendor}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {bill.billDate ? formatDay(bill.billDate) : "Date not found"}
          {bill.invoiceNumber ? ` • ${bill.invoiceNumber}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
          {bill.category}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700"
        >
          Dismiss
        </button>
      </div>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {bill.lineItems.length ? (
          <ul className="space-y-2 border-t border-slate-200 pt-3">
            {bill.lineItems.map((item, index) => (
              <li
                key={`${item.description}-${index}`}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="min-w-0 truncate text-slate-700" title={item.description}>
                  {item.description}
                  {item.quantity ? (
                    <span className="ml-1.5 text-xs text-slate-500">
                      {item.quantity} × {formatMoneyPrecise(item.unitPrice ?? 0)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-slate-900 tabular-nums">
                  {formatMoneyPrecise(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-slate-200 pt-3 text-sm text-slate-500">
            No individual line items could be read off this document.
          </p>
        )}
      </div>

      <div className="min-w-0">
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
          {bill.subtotal !== null ? (
            <Row label="Subtotal" value={formatMoneyPrecise(bill.subtotal)} />
          ) : null}
          {bill.discount !== null ? (
            <Row label="Discount" value={`− ${formatMoneyPrecise(bill.discount)}`} />
          ) : null}
          {bill.taxTotal !== null ? (
            <Row label="Tax" value={formatMoneyPrecise(bill.taxTotal)} />
          ) : null}
          <Row
            label="Total"
            value={bill.total === null ? "—" : formatMoneyPrecise(bill.total)}
            emphasis
          />
        </div>

        {bill.savedToAccount ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Saved as a {bill.category} expense.
          </p>
        ) : null}

        {bill.warnings.length ? (
          <ul className="mt-3 space-y-2">
            {bill.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
              >
                <span aria-hidden="true" className="mr-1.5 font-semibold">
                  ▲
                </span>
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  </section>
);

export default BillResult;
