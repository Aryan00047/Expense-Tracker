import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import DashboardCards from "./DashboardCards";
import Footer from "./Footer";
import DocumentUpload from "./DocumentUpload";
import BillResult from "./BillResult";
import SmartInsights from "./SmartInsights";
import CategoryBars from "./charts/CategoryBars";
import CategoryMixChart from "./charts/CategoryMixChart";
import FlowSplit from "./charts/FlowSplit";
import MonthlyFlowChart from "./charts/MonthlyFlowChart";
import SpendTrendChart from "./charts/SpendTrendChart";
import { ChartCard, formatMonthLong } from "./charts/chart-kit";
import { clearExpenseData, getExpenseAnalytics } from "../services/expenseService";
import type {
  BillAnalysis,
  DocumentUploadResult,
  ExpenseAnalytics,
} from "../models/ExpenseModel";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const header_items = [{ name: "Logout", link: "/" }];

const Dashboard = () => {
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [bill, setBill] = useState<BillAnalysis | null>(null);
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (nextFilters?: { from?: string; to?: string }) => {
      setLoadingAnalytics(true);
      setErrorMessage(null);

      try {
        const response = await getExpenseAnalytics(nextFilters);
        setAnalytics(response.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load analytics yet."
        );
      } finally {
        setLoadingAnalytics(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  /**
   * One upload, two possible answers. Which one arrived is read off `kind` —
   * the user was never asked to declare it.
   */
  const onUploaded = (result: DocumentUploadResult) => {
    if (result.kind === "bill") {
      // A bill's warnings are about that bill's figures, so they belong beside
      // them in the card. Repeating them at the top of the page said the same
      // sentence twice.
      setWarnings([]);
      setBill(result);
      // A bill adds a single row server-side, so the dashboard has to re-read
      // its analytics rather than being handed them.
      if (result.savedToAccount) {
        void loadAnalytics({
          from: filters.from || undefined,
          to: filters.to || undefined,
        });
      }
      return;
    }

    setBill(null);
    setWarnings(result.warnings ?? []);
    setAnalytics(result.analytics);

    // A saved import replaces what the server holds, so re-apply any active
    // date filter to keep the view consistent with the database.
    if (result.savedToAccount && (filters.from || filters.to)) {
      void loadAnalytics({
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
    }
  };

  const onApplyFilters = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadAnalytics({
      from: filters.from || undefined,
      to: filters.to || undefined,
    });
  };

  const onResetFilters = async () => {
    setFilters({ from: "", to: "" });
    await loadAnalytics();
  };

  const onClearData = async () => {
    setClearing(true);
    setErrorMessage(null);

    try {
      const response = await clearExpenseData();

      // The server hands back the analytics of an empty account, so the whole
      // dashboard can settle from this one response.
      setAnalytics(response.data.analytics);
      setWarnings([]);
      setBill(null);
      setFilters({ from: "", to: "" });
      setClearMessage(response.message);
      setConfirmClear(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not clear your stored data."
      );
    } finally {
      setClearing(false);
    }
  };

  const topCategory = analytics?.topCategories[0];
  const monthlyTrend = analytics?.monthlyTrend ?? [];
  const highestMonth = monthlyTrend.length
    ? monthlyTrend.reduce((max, item) => (item.amount > max.amount ? item : max))
    : undefined;
  const hasIncome = (analytics?.totalIncome ?? 0) > 0;
  const comparison = analytics?.insights.comparison ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fffc_0%,_#eef6f3_48%,_#e2ebe7_100%)]">
      <Header items={header_items} />

      <main className="w-full flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
          <section className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-slate-950 px-4 py-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:rounded-[1.9rem] sm:px-6 sm:py-8">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_minmax(320px,0.95fr)] lg:gap-8">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">
                  Statement analytics
                </p>
                <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl">
                  Turn bank statements and shopping bills into spending insights.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  Drop in a bank or wallet export and transactions are categorised
                  automatically, credits and refunds are ignored, and the smart
                  insights panel highlights recurring charges, duplicate payments
                  and where your spending is drifting. Drop in a single shopping
                  bill instead and it is read line by line — vendor, items, GST
                  and total. You do not have to say which is which.
                </p>

                <ul className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
                  {[
                    "CSV & PDF statements",
                    "Shopping bills & invoices",
                    "Auto categorisation",
                    "Recurring charge detection",
                    "Private mode (no storage)",
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="rounded-full border border-white/15 px-3 py-1.5"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <DocumentUpload onResult={onUploaded} />
            </div>
          </section>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}

          {warnings.length ? (
            <ul className="space-y-2">
              {warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <span aria-hidden="true" className="mr-2 font-semibold">
                    ▲
                  </span>
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <DashboardCards
              title="Total outflow"
              value={preciseCurrency.format(analytics?.totalSpend ?? 0)}
              helper="Everything that left the account in this range."
            />
            <DashboardCards
              title="Everyday spending"
              value={preciseCurrency.format(analytics?.insights.coreSpend ?? 0)}
              helper="Outflow minus card bills, EMIs, investments and transfers."
            />
            <DashboardCards
              title="Transactions"
              value={String(analytics?.transactionCount ?? 0)}
              helper="Rows parsed and counted as spend."
            />
            <DashboardCards
              title={hasIncome ? "Net cash flow" : "Average spend"}
              value={preciseCurrency.format(
                hasIncome ? analytics?.netCashFlow ?? 0 : analytics?.averageSpend ?? 0
              )}
              helper={
                hasIncome
                  ? "Money in minus money out."
                  : "Average value per transaction."
              }
            />
          </section>

          {bill ? <BillResult bill={bill} onDismiss={() => setBill(null)} /> : null}

          <SmartInsights
            insights={analytics?.insights}
            currency={preciseCurrency}
            loading={loadingAnalytics}
          />

          <section className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:rounded-[1.9rem] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
                  Filter analytics
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">
                  Narrow the date range
                </h2>
              </div>

              <form
                onSubmit={onApplyFilters}
                className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[auto_auto_auto_auto] sm:gap-3"
              >
                <label className="col-span-1 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-500">From</span>
                  <input
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, from: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="col-span-1 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-500">To</span>
                  <input
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, to: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-1 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:mt-auto"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:mt-auto"
                >
                  Reset
                </button>
              </form>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="min-w-0 rounded-2xl bg-emerald-50 p-4 sm:p-5">
                <p className="text-sm text-emerald-800">Top category</p>
                <h3 className="mt-2 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
                  {topCategory?.category ?? "No data yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {topCategory
                    ? `${preciseCurrency.format(topCategory.amount)} • ${topCategory.percentage}% of spend`
                    : "Import a statement to see your category leaders."}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-slate-100 p-4 sm:p-5">
                <p className="text-sm text-slate-600">Highest month</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  {highestMonth ? formatMonthLong(highestMonth.month) : "No data yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {highestMonth
                    ? preciseCurrency.format(highestMonth.amount)
                    : "Monthly trends appear after import."}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-slate-100 p-4 sm:p-5">
                <p className="text-sm text-slate-600">Month on month</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  {comparison
                    ? `${comparison.percent > 0 ? "+" : ""}${comparison.percent}%`
                    : "No data yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {comparison
                    ? `${formatMonthLong(comparison.latestMonth)} vs ${formatMonthLong(
                        comparison.previousMonth
                      )}${
                        comparison.partial
                          ? `, first ${comparison.throughDay} days of each`
                          : ""
                      }.`
                    : "Needs two consecutive months of data."}
                </p>
              </div>
            </div>

            {/* Deleting is irreversible, so it asks once rather than relying on
                a browser confirm the user has learned to dismiss reflexively. */}
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">Stored data</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Clearing removes every transaction you have saved to this account.
                  Filters only change the view — this changes what is stored.
                </p>
              </div>

              {confirmClear ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={onClearData}
                    disabled={clearing}
                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-300"
                  >
                    {clearing ? "Clearing…" : "Yes, clear everything"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    disabled={clearing}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setClearMessage(null);
                    setConfirmClear(true);
                  }}
                  className="shrink-0 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                >
                  Clear stored data
                </button>
              )}
            </div>

            {clearMessage ? (
              <p
                role="status"
                className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                {clearMessage}
              </p>
            ) : null}
          </section>

          <ChartCard
            title="Spending over time"
            subtitle="Every day in the range, with a 7-day average to show the underlying trend."
            action={
              loadingAnalytics ? (
                <span className="text-xs text-slate-400">Loading…</span>
              ) : null
            }
          >
            <SpendTrendChart data={analytics?.dailyTrend ?? []} />
          </ChartCard>

          <section className="grid min-w-0 items-start gap-3 sm:gap-4 xl:grid-cols-2">
            <ChartCard
              title={hasIncome ? "Money in and out by month" : "Spending by month"}
              subtitle={
                hasIncome
                  ? "Separate scales — one large salary credit would otherwise flatten every spending bar."
                  : "Month-by-month outflow across the imported range."
              }
            >
              <MonthlyFlowChart data={monthlyTrend} showIncome={hasIncome} />
            </ChartCard>

            <ChartCard
              title="What the money went on"
              subtitle="Each month's outflow split by category."
            >
              <CategoryMixChart
                data={analytics?.categoryTrend ?? []}
                categories={analytics?.stackedCategories ?? []}
              />
            </ChartCard>
          </section>

          {/* items-start stops a short card from stretching into a half-empty
              box beside a tall one. */}
          <section className="grid min-w-0 items-start gap-3 sm:gap-4 xl:grid-cols-2">
            <ChartCard
              title="Category breakdown"
              subtitle="Ranked by total outflow in the active range."
            >
              <CategoryBars data={analytics?.topCategories ?? []} />
            </ChartCard>

            <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
              <ChartCard
                title="Where your outflow actually goes"
                subtitle="A credit card bill settles purchases you already made — counting it as spending would double it."
              >
                <FlowSplit data={analytics?.flowBreakdown ?? []} />
              </ChartCard>

              <section className="min-w-0 rounded-[1.75rem] bg-slate-950 p-4 text-white shadow-sm sm:p-6">
                <h2 className="text-base font-semibold sm:text-lg">Top payees</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Grouped across reference numbers, so one merchant counts once.
                </p>

                <div className="mt-4 space-y-3">
                  {analytics?.topMerchants.length ? (
                    analytics.topMerchants.map((item) => (
                      <div
                        key={item.merchant}
                        className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3 text-sm last:border-0 last:pb-0"
                      >
                        <span className="min-w-0 truncate text-slate-200" title={item.merchant}>
                          {item.merchant}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {currency.format(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-300">
                      Payee insights are waiting on imported data.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Recent imported transactions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              A quick audit view so you can confirm the parsing looks right.
            </p>

            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Merchant</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Description</th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recentTransactions.length ? (
                    analytics.recentTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 text-slate-700 last:border-0"
                      >
                        <td className="whitespace-nowrap px-3 py-3">{transaction.date}</td>
                        <td className="max-w-[220px] truncate px-3 py-3" title={transaction.merchant}>
                          {transaction.merchant || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {transaction.direction === "credit" ? "Money in" : transaction.category}
                        </td>
                        <td className="max-w-[280px] truncate px-3 py-3" title={transaction.description}>
                          {transaction.description || "-"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums ${
                            transaction.direction === "credit"
                              ? "text-emerald-700"
                              : "text-slate-900"
                          }`}
                        >
                          {transaction.direction === "credit" ? "+" : "−"}
                          {preciseCurrency.format(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No imported transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 md:hidden">
              {analytics?.recentTransactions.length ? (
                analytics.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {transaction.merchant || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.date}</p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          transaction.direction === "credit"
                            ? "text-emerald-700"
                            : "text-slate-900"
                        }`}
                      >
                        {transaction.direction === "credit" ? "+" : "−"}
                        {preciseCurrency.format(transaction.amount)}
                      </p>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Category:</span>{" "}
                        {transaction.direction === "credit" ? "Money in" : transaction.category}
                      </p>
                      <p className="break-words">
                        <span className="font-medium text-slate-800">Description:</span>{" "}
                        {transaction.description || "-"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  No imported transactions yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
