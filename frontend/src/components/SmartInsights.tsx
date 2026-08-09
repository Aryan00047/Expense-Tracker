import WeekdayChart from "./charts/WeekdayChart";
import type { InsightTone, SmartInsights as SmartInsightsData } from "../models/ExpenseModel";

interface SmartInsightsProps {
  insights: SmartInsightsData | undefined;
  currency: Intl.NumberFormat;
  loading: boolean;
}

/**
 * Status colours never carry meaning alone — each tone ships with an icon and a
 * written label so the state is readable without colour vision.
 */
const TONE_STYLES: Record<
  InsightTone,
  { label: string; icon: string; accent: string; chip: string }
> = {
  critical: {
    label: "Needs attention",
    icon: "!",
    accent: "border-l-rose-600",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  warning: {
    label: "Watch this",
    icon: "▲",
    accent: "border-l-amber-600",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  positive: {
    label: "Good news",
    icon: "✓",
    accent: "border-l-emerald-600",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  neutral: {
    label: "Context",
    icon: "•",
    accent: "border-l-slate-500",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

const SectionShell = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    <div className="mt-4">{children}</div>
  </div>
);

const SmartInsights = ({ insights, currency, loading }: SmartInsightsProps) => {
  if (loading && !insights) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  if (!insights || !insights.items.length) {
    return (
      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-6 text-center sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Smart insights</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Import a CSV or PDF statement and this panel fills up with recurring
          charges, duplicate payments, unusual transactions, and where your money
          is drifting month to month.
        </p>
      </section>
    );
  }

  const busiestDay = insights.weekdayPattern.reduce((max, day) =>
    day.amount > max.amount ? day : max
  );

  const stats = [
    { label: "Everyday spend", value: currency.format(insights.coreSpend) },
    { label: "Per active day", value: currency.format(insights.dailyAverage) },
    { label: "Projected month", value: currency.format(insights.projectedMonthlySpend) },
    { label: "Median txn", value: currency.format(insights.medianTransaction) },
    { label: "Largest txn", value: currency.format(insights.largestTransaction) },
    {
      label: "Recurring / mo",
      value: currency.format(insights.recurringMonthlyTotal),
    },
  ];

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
            Smart insights
          </p>
          {loading ? (
            <span className="text-xs text-slate-400">Refreshing…</span>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-lg font-medium leading-7 sm:text-xl sm:leading-8">
          {insights.headline}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-2xl bg-white/10 px-3 py-3">
              <dt className="truncate text-[11px] uppercase tracking-wide text-slate-300">
                {stat.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-semibold sm:text-base">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.items.map((item) => {
          const tone = TONE_STYLES[item.tone];

          return (
            <article
              key={item.id}
              className={`min-w-0 rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${tone.accent}`}
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone.chip}`}
              >
                <span aria-hidden="true">{tone.icon}</span>
                {tone.label}
              </span>
              <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-2">
        <SectionShell
          title="Spending by day of week"
          subtitle={`${busiestDay.day} is your heaviest day.`}
        >
          <WeekdayChart data={insights.weekdayPattern} />
        </SectionShell>

        <SectionShell
          title="Recurring payments"
          subtitle={
            insights.recurring.length
              ? `About ${currency.format(insights.recurringMonthlyTotal)} repeats every month.`
              : undefined
          }
        >
          {insights.recurring.length ? (
            <ul className="space-y-3">
              {insights.recurring.map((item) => (
                <li
                  key={`${item.merchant}-${item.averageAmount}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.merchant}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.category} • {item.occurrences}× over {item.monthsSeen} month
                      {item.monthsSeen === 1 ? "" : "s"} • last {item.lastSeen}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {currency.format(item.estimatedMonthlyCost)}
                    <span className="ml-1 text-xs font-normal text-slate-500">/mo</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No repeating charges found yet. Import at least two months of data to
              surface subscriptions.
            </p>
          )}
        </SectionShell>
      </div>

      {insights.outliers.length || insights.duplicates.length ? (
        <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-2">
          {insights.outliers.length ? (
            <SectionShell
              title="Unusually large transactions"
              subtitle="Well above your typical transaction size."
            >
              <ul className="space-y-3">
                {insights.outliers.map((item) => (
                  <li
                    key={`${item.date}-${item.merchant}-${item.amount}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.merchant}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.date} • {item.category} • {item.timesAverage}× average
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {currency.format(item.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionShell>
          ) : null}

          {insights.duplicates.length ? (
            <SectionShell
              title="Possible duplicate charges"
              subtitle="Same merchant and amount within three days."
            >
              <ul className="space-y-3">
                {insights.duplicates.map((item) => (
                  <li
                    key={`${item.merchant}-${item.amount}-${item.dates.join()}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.merchant}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.dates.join(" and ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {currency.format(item.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionShell>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default SmartInsights;
