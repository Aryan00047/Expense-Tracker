import { useEffect, useState } from "react";
import Header from "./Header";
import DashboardCards from "./DashboardCards";
import Footer from "./Footer";
import { getExpenseAnalytics, uploadExpenseCsv } from "../services/expenseService";
import type { ExpenseAnalytics } from "../models/ExpenseModel";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const Dashboard = () => {
  const header_items = [
    {
      name: "Logout",
      link: "/",
    },
  ];

  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
  });

  const loadAnalytics = async (nextFilters?: { from?: string; to?: string }) => {
    setLoadingAnalytics(true);
    setErrorMessage(null);

    try {
      const response = await getExpenseAnalytics(nextFilters);
      setAnalytics(response.data);
    } catch (error) {
      let messageText = "Could not load analytics yet.";
      if (error instanceof Error) {
        messageText = error.message;
      }
      setErrorMessage(messageText);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const onUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setErrorMessage("Choose a CSV file first.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const csvText = await file.text();
      const response = await uploadExpenseCsv(
        csvText,
        replaceExisting,
        saveToAccount
      );
      setAnalytics(response.data.analytics);
      setMessage(
        saveToAccount
          ? `Imported ${response.data.importedCount} rows, skipped ${response.data.skippedRows}, and saved them to your account.`
          : `Analyzed ${response.data.importedCount} rows and skipped ${response.data.skippedRows} without saving anything to the database.`
      );

      if (saveToAccount && (filters.from || filters.to)) {
        await loadAnalytics({
          from: filters.from || undefined,
          to: filters.to || undefined,
        });
      }
    } catch (error) {
      let messageText = "CSV upload failed.";
      if (error instanceof Error) {
        messageText = error.message;
      }
      setErrorMessage(messageText);
    } finally {
      setUploading(false);
    }
  };

  const onApplyFilters = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadAnalytics({
      from: filters.from || undefined,
      to: filters.to || undefined,
    });
  };

  const topCategory = analytics?.topCategories[0];
  const highestMonth = analytics?.monthlyTrend.reduce(
    (max, item) => (item.amount > max.amount ? item : max),
    analytics.monthlyTrend[0]
  );

  return (
    <>
      <Header items={header_items} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fffc_0%,_#eef6f3_48%,_#e2ebe7_100%)] px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
          <section className="rounded-[1.9rem] border border-white/60 bg-slate-950 px-4 py-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:px-6 sm:py-8">
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-300">
                  CSV Expense Analytics
                </p>
                <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight sm:text-4xl">
                  Upload a bank or wallet CSV and turn raw transactions into
                  spending insights.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  This dashboard now works best with exported transaction data.
                  Upload a CSV, replace old imports if needed, and review
                  category, merchant, and monthly spend trends instantly.
                </p>
              </div>

              <form
                onSubmit={onUpload}
                className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur sm:p-5"
              >
                <label className="text-sm font-medium text-slate-100">
                  Upload CSV
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-3 block w-full rounded-2xl border border-dashed border-emerald-300/40 bg-slate-900/50 px-4 py-5 text-sm text-slate-200 file:mb-3 file:mr-0 file:block file:rounded-full file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-emerald-300 sm:file:mb-0 sm:file:mr-4 sm:file:inline-block"
                />
                <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                    disabled={!saveToAccount}
                    className="h-4 w-4 rounded border-white/30"
                  />
                  Replace previous imported transactions
                </label>
                <label className="mt-3 flex items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={saveToAccount}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSaveToAccount(checked);
                      if (!checked) {
                        setReplaceExisting(true);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-white/30"
                  />
                  <span>
                    Save imported data to my account
                    <span className="mt-1 block text-xs text-slate-400">
                      Leave this off to analyze the CSV privately without storing
                      any transactions in the database.
                    </span>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`mt-5 w-full rounded-full px-4 py-3 text-sm font-medium transition ${
                    uploading
                      ? "cursor-not-allowed bg-slate-600 text-slate-300"
                      : "bg-emerald-300 text-slate-950 hover:bg-emerald-200"
                  }`}
                >
                  {uploading ? "Importing CSV..." : "Import CSV"}
                </button>
                <p className="mt-3 text-xs text-slate-400">
                  Expected columns: date, amount or debit, plus optional
                  category, description, and merchant.
                </p>
                {message ? (
                  <p className="mt-3 text-sm text-emerald-300">{message}</p>
                ) : null}
                {errorMessage ? (
                  <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>
                ) : null}
              </form>
            </div>
          </section>

          <section className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardCards
              title="Total spend"
              value={currency.format(analytics?.totalSpend ?? 0)}
              helper="Total expenses from imported CSV records in the active range."
            />
            <DashboardCards
              title="Transactions"
              value={String(analytics?.transactionCount ?? 0)}
              helper="Expense rows successfully parsed and counted as spend."
            />
            <DashboardCards
              title="Average spend"
              value={currency.format(analytics?.averageSpend ?? 0)}
              helper="Average spend per imported transaction."
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
            <div className="min-w-0 rounded-[1.9rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
                    Filter analytics
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                    Time range and imported spend
                  </h2>
                </div>
                <form
                  onSubmit={onApplyFilters}
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                  />
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 sm:justify-self-start xl:justify-self-stretch"
                  >
                    Apply
                  </button>
                </form>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-emerald-50 p-4 sm:p-5">
                  <p className="text-sm text-emerald-800">Top category</p>
                  <h3 className="mt-3 break-words text-2xl font-semibold text-slate-900">
                    {topCategory?.category ?? "No data yet"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {topCategory
                      ? `${currency.format(topCategory.amount)} • ${topCategory.percentage}% of spend`
                      : "Import a CSV to see your category leaders."}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-100 p-4 sm:p-5">
                  <p className="text-sm text-slate-600">Highest month</p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                    {highestMonth?.month ?? "No data yet"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {highestMonth
                      ? currency.format(highestMonth.amount)
                      : "Monthly trends appear after import."}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Category breakdown
                  </h3>
                  {loadingAnalytics ? (
                    <span className="text-sm text-slate-400">Loading...</span>
                  ) : null}
                </div>
                <div className="mt-4 space-y-4">
                  {analytics?.topCategories.length ? (
                    analytics.topCategories.map((item) => (
                      <div key={item.category}>
                        <div className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                          <span className="pr-4">{item.category}</span>
                          <span className="text-left sm:text-right">
                            {currency.format(item.amount)} • {item.percentage}%
                          </span>
                        </div>
                        <div className="mt-2 h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No category analytics yet. Upload a CSV to populate this view.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.9rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Monthly trend
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                A simple month-by-month view of imported spending.
              </p>
              <div className="mt-6 space-y-4">
                {analytics?.monthlyTrend.length ? (
                  analytics.monthlyTrend.map((item) => {
                    const maxAmount = Math.max(
                      ...analytics.monthlyTrend.map((trend) => trend.amount),
                      1
                    );
                    const width = (item.amount / maxAmount) * 100;

                    return (
                      <div key={item.month}>
                        <div className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                          <span>{item.month}</span>
                          <span className="text-left sm:text-right">
                            {currency.format(item.amount)}
                          </span>
                        </div>
                        <div className="mt-2 h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-slate-900"
                            style={{ width: `${Math.max(width, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Monthly bars will appear after your first import.
                  </p>
                )}
              </div>

              <div className="mt-8 rounded-3xl bg-slate-950 p-4 text-white sm:p-5">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
                  Top merchants
                </p>
                <div className="mt-4 space-y-3">
                  {analytics?.topMerchants.length ? (
                    analytics.topMerchants.map((item) => (
                      <div
                        key={item.merchant}
                        className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="max-w-full break-all pr-0 sm:max-w-[70%] sm:truncate sm:break-normal sm:pr-4">
                          {item.merchant}
                        </span>
                        <span className="text-left sm:text-right">
                          {currency.format(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-300">
                      Merchant insights are waiting on imported data.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Recent imported transactions
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              A quick audit view so you can confirm that parsing looks right.
            </p>

            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Merchant</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Description</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recentTransactions.length ? (
                    analytics.recentTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 text-slate-700"
                      >
                        <td className="px-3 py-3">{transaction.date}</td>
                        <td className="px-3 py-3">{transaction.merchant || "-"}</td>
                        <td className="px-3 py-3">{transaction.category}</td>
                        <td className="px-3 py-3">
                          {transaction.description || "-"}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {currency.format(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No imported transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-3 md:hidden">
              {analytics?.recentTransactions.length ? (
                analytics.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {transaction.merchant || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.date}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {currency.format(transaction.amount)}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Category:</span>{" "}
                        {transaction.category}
                      </p>
                      <p className="break-words">
                        <span className="font-medium text-slate-800">
                          Description:
                        </span>{" "}
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
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
