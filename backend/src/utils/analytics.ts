import {
    flowForCategory,
    inferExpenseCategory,
    type MoneyFlow,
} from './expense-category.js';
import { toLocalDayKey, toLocalMonthKey } from './date.js';
import {
    buildFlowResolver,
    buildInsights,
    displayMerchant,
    normalizeMerchantKey,
} from './insights.js';
import type { Direction } from '../documents/statement-schema.js';

export interface AnalyticsEntry {
    _id?: { toString(): string } | string;
    occurredAt: Date;
    amount: number;
    direction?: Direction;
    flow?: MoneyFlow;
    category?: string;
    description?: string;
    merchant?: string;
}

const money = (value: number) => Number(value.toFixed(2));

/** Every day between the first and last transaction, gaps included. */
function enumerateDays(from: Date, to: Date): string[] {
    const days: string[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    // Statements can span years; a hard stop keeps a corrupt date from building
    // an unbounded array.
    while (cursor <= end && days.length < 1500) {
        days.push(toLocalDayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

const FLOW_LABELS: Record<MoneyFlow, string> = {
    spend: 'Everyday spending',
    debt: 'Card bills & EMIs',
    investment: 'Investments & savings',
    transfer: 'Transfers & withdrawals',
    income: 'Money in',
};

export function buildAnalytics(entries: AnalyticsEntry[]) {
    const categorised = entries.map((entry) => {
        const category = inferExpenseCategory({
            category: entry.category,
            description: entry.description,
            merchant: entry.merchant,
        });
        const direction: Direction = entry.direction ?? 'debit';

        return {
            ...entry,
            category,
            direction,
            flow: entry.flow ?? flowForCategory(category, direction),
        };
    });

    // Resolve flows once, here, so the charts and the insights panel cannot
    // disagree about what counts as everyday spending.
    const resolveFlow = buildFlowResolver(categorised);
    const resolved = categorised.map((entry) => ({ ...entry, flow: resolveFlow(entry) }));

    const debits = resolved.filter((entry) => entry.direction === 'debit');
    const credits = resolved.filter((entry) => entry.direction === 'credit');

    const totalSpend = money(debits.reduce((sum, entry) => sum + entry.amount, 0));
    const totalIncome = money(credits.reduce((sum, entry) => sum + entry.amount, 0));
    const transactionCount = debits.length;
    const averageSpend = transactionCount ? money(totalSpend / transactionCount) : 0;

    const categoryTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, { spend: number; income: number }>();
    const monthlyCategoryTotals = new Map<string, Map<string, number>>();
    const dailyTotals = new Map<string, number>();
    const flowTotals = new Map<MoneyFlow, number>();
    // Keyed on a normalized merchant so "UPI/4421/SWIGGY" and "UPI/5533/SWIGGY"
    // roll up into a single row instead of fragmenting the leaderboard.
    const merchantTotals = new Map<string, { amount: number; label: string }>();

    for (const entry of resolved) {
        const monthLabel = toLocalMonthKey(entry.occurredAt);
        const monthBucket = monthlyTotals.get(monthLabel) || { spend: 0, income: 0 };

        if (entry.direction === 'credit') {
            monthBucket.income += entry.amount;
            monthlyTotals.set(monthLabel, monthBucket);
            continue;
        }

        monthBucket.spend += entry.amount;
        monthlyTotals.set(monthLabel, monthBucket);

        categoryTotals.set(
            entry.category,
            (categoryTotals.get(entry.category) || 0) + entry.amount
        );
        flowTotals.set(entry.flow, (flowTotals.get(entry.flow) || 0) + entry.amount);

        const dayLabel = toLocalDayKey(entry.occurredAt);
        dailyTotals.set(dayLabel, (dailyTotals.get(dayLabel) || 0) + entry.amount);

        const perCategory = monthlyCategoryTotals.get(monthLabel) || new Map<string, number>();
        perCategory.set(entry.category, (perCategory.get(entry.category) || 0) + entry.amount);
        monthlyCategoryTotals.set(monthLabel, perCategory);

        const merchantKey = normalizeMerchantKey(entry);
        const existing = merchantTotals.get(merchantKey);
        merchantTotals.set(merchantKey, {
            amount: (existing?.amount || 0) + entry.amount,
            label: existing?.label || displayMerchant(entry),
        });
    }

    const topCategories = [...categoryTotals.entries()]
        .map(([category, amount]) => ({
            category,
            amount: money(amount),
            percentage: totalSpend ? Number(((amount / totalSpend) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

    const monthlyTrend = [...monthlyTotals.entries()]
        .map(([month, totals]) => ({
            month,
            amount: money(totals.spend),
            income: money(totals.income),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // The stacked chart only has room for a handful of series, so anything
    // outside the leading categories is folded into a single "Other" band —
    // never dropped, or the bars would stop summing to the monthly total.
    const stackedCategories = topCategories.slice(0, 5).map((item) => item.category);
    const categoryTrend = monthlyTrend.map(({ month }) => {
        const perCategory = monthlyCategoryTotals.get(month) || new Map<string, number>();
        const segments: Record<string, number> = {};
        let other = 0;

        for (const [category, amount] of perCategory) {
            if (stackedCategories.includes(category)) segments[category] = money(amount);
            else other += amount;
        }

        if (other > 0) segments.Other = money(other);

        return { month, segments };
    });

    const sortedByDate = [...resolved].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
    );

    const dailyTrend = sortedByDate.length
        ? enumerateDays(
              sortedByDate[0].occurredAt,
              sortedByDate[sortedByDate.length - 1].occurredAt
          ).map((date) => ({ date, amount: money(dailyTotals.get(date) || 0) }))
        : [];

    const flowBreakdown = (['spend', 'debt', 'investment', 'transfer'] as const)
        .map((flow) => ({
            flow,
            label: FLOW_LABELS[flow],
            amount: money(flowTotals.get(flow) || 0),
            percentage: totalSpend
                ? Number((((flowTotals.get(flow) || 0) / totalSpend) * 100).toFixed(1))
                : 0,
        }))
        .filter((item) => item.amount > 0);

    const topMerchants = [...merchantTotals.values()]
        .map(({ label, amount }) => ({ merchant: label, amount: money(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

    const recentTransactions = resolved.slice(0, 12).map((entry, index) => ({
        id:
            typeof entry._id === 'string'
                ? entry._id
                : entry._id?.toString() || `temp-${index}`,
        date: toLocalDayKey(entry.occurredAt),
        amount: entry.amount,
        direction: entry.direction,
        flow: entry.flow,
        category: entry.category,
        description: entry.description || '',
        merchant: entry.merchant || '',
    }));

    return {
        totalSpend,
        totalIncome,
        netCashFlow: money(totalIncome - totalSpend),
        transactionCount,
        averageSpend,
        topCategories,
        monthlyTrend,
        categoryTrend,
        stackedCategories: [
            ...stackedCategories,
            ...(categoryTrend.some((month) => month.segments.Other) ? ['Other'] : []),
        ],
        dailyTrend,
        flowBreakdown,
        topMerchants,
        recentTransactions,
        insights: buildInsights(resolved),
    };
}

