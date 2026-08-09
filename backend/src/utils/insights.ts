import {
    DEFAULT_CATEGORY,
    DISCRETIONARY_CATEGORIES,
    flowForCategory,
    inferExpenseCategory,
    type MoneyFlow,
} from './expense-category.js';
import { toLocalDayKey, toLocalMonthKey } from './date.js';

export interface InsightSourceEntry {
    occurredAt: Date;
    amount: number;
    direction?: 'debit' | 'credit';
    flow?: MoneyFlow;
    category?: string;
    description?: string;
    merchant?: string;
}

export type InsightTone = 'positive' | 'warning' | 'critical' | 'neutral';

export interface InsightItem {
    id: string;
    tone: InsightTone;
    title: string;
    detail: string;
    /** Headline figure for the card, already formatted as a plain number. */
    value?: number;
    /** Percentage change where relevant, e.g. month over month movement. */
    changePercent?: number;
    priority: number;
}

export interface RecurringPayment {
    merchant: string;
    category: string;
    averageAmount: number;
    occurrences: number;
    monthsSeen: number;
    lastSeen: string;
    estimatedMonthlyCost: number;
}

export interface OutlierTransaction {
    date: string;
    merchant: string;
    category: string;
    amount: number;
    timesAverage: number;
}

export interface DuplicateCharge {
    merchant: string;
    amount: number;
    dates: string[];
}

export interface WeekdaySpend {
    day: string;
    amount: number;
    count: number;
}

export interface MonthComparison {
    latestMonth: string;
    previousMonth: string;
    latestAmount: number;
    previousAmount: number;
    percent: number;
    /** True when the latest month is still in progress in this statement. */
    partial: boolean;
    /** Both months are summed only up to this day when the latest is partial. */
    throughDay: number;
}

export interface SmartInsights {
    headline: string;
    items: InsightItem[];
    recurring: RecurringPayment[];
    outliers: OutlierTransaction[];
    duplicates: DuplicateCharge[];
    weekdayPattern: WeekdaySpend[];
    dailyAverage: number;
    activeDays: number;
    medianTransaction: number;
    largestTransaction: number;
    projectedMonthlySpend: number;
    monthOverMonthPercent: number | null;
    comparison: MonthComparison | null;
    recurringMonthlyTotal: number;
    /** Outflow excluding transfers, card bills and investments. */
    coreSpend: number;
    totalOutflow: number;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const round = (value: number) => Number(value.toFixed(2));

const dayKey = toLocalDayKey;
const monthKey = toLocalMonthKey;

function daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Month key one calendar month before the given one, e.g. 2026-01 → 2025-12. */
function previousMonthKey(key: string): string {
    const [year, month] = key.split('-').map(Number);
    return month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, '0')}`;
}

function median(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(sortedAscending: number[], fraction: number): number {
    if (!sortedAscending.length) return 0;
    const index = Math.min(
        sortedAscending.length - 1,
        Math.max(0, Math.ceil(fraction * sortedAscending.length) - 1)
    );
    return sortedAscending[index];
}

export function normalizeMerchantKey(entry: InsightSourceEntry): string {
    const raw = (entry.merchant || entry.description || '').toLowerCase();

    return (
        raw
            // Drop UPI/ref noise so "UPI/9832133/SWIGGY" and "UPI/1121/SWIGGY" group together.
            .replace(/\b[a-z]*\d{4,}[a-z]*\b/g, ' ')
            .replace(/\b(upi|neft|imps|rtgs|ach|nach|pos|ecom|txn|trxn|ref|no|dr|cr|paid|via)\b/g, ' ')
            .replace(/[^a-z\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .slice(0, 3)
            .join(' ') || 'unknown'
    );
}

/** Words that describe the rail a payment travelled on, not who was paid. */
const RAIL_WORDS = new Set([
    'upi',
    'neft',
    'imps',
    'rtgs',
    'ach',
    'nach',
    'bil',
    'inf',
    'inft',
    'cms',
    'pos',
    'mmt',
    'trf',
    'txn',
    'trxn',
    'ref',
    'payment',
    'paid',
    'via',
    'credit',
    'debit',
    'fund',
    'transfer',
    'intent',
    'upiintent',
]);

/**
 * Pulls a human name out of a slash-delimited narration.
 *
 * "NACH trxn ACH/HDFC BANK LIMITED/ICIC70224…" should read as HDFC BANK
 * LIMITED, not "NACH trxn ACH" — so rail words are trimmed off each segment's
 * ends and a segment that is nothing but rail words is skipped entirely.
 */
export function displayMerchant(entry: InsightSourceEntry): string {
    const raw = (entry.merchant || entry.description || '').trim();
    if (!raw) return 'Unknown';

    for (const segment of raw.split('/')) {
        const words = segment.trim().split(/\s+/).filter(Boolean);

        while (words.length && RAIL_WORDS.has(words[0].toLowerCase())) words.shift();
        while (words.length && RAIL_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();

        const candidate = words.join(' ');
        if (/[a-z]{3}/i.test(candidate)) return candidate.slice(0, 60);
    }

    return raw.slice(0, 60);
}

function categoryOf(entry: InsightSourceEntry): string {
    return (
        entry.category ||
        inferExpenseCategory({
            description: entry.description,
            merchant: entry.merchant,
        })
    );
}

function declaredFlow(entry: InsightSourceEntry): MoneyFlow {
    return entry.flow ?? flowForCategory(categoryOf(entry), entry.direction ?? 'debit');
}

/**
 * Money sent to a counterparty that also sends money back is a transfer between
 * your own accounts, not a purchase — the ₹20,000 to your own UPI handle should
 * not become "your biggest drain".
 *
 * Restricted to uncategorised rows on purpose: a shop that happens to refund you
 * once is still a shop, and it will already carry a real category.
 */
export function buildFlowResolver(entries: InsightSourceEntry[]) {
    const creditKeys = new Set(
        entries
            .filter((entry) => entry.direction === 'credit')
            .map((entry) => normalizeMerchantKey(entry))
    );

    return (entry: InsightSourceEntry): MoneyFlow => {
        const flow = declaredFlow(entry);

        if (
            flow === 'spend' &&
            categoryOf(entry) === DEFAULT_CATEGORY &&
            creditKeys.has(normalizeMerchantKey(entry))
        ) {
            return 'transfer';
        }

        return flow;
    };
}

function buildRecurring(entries: InsightSourceEntry[]): {
    payments: RecurringPayment[];
    keys: Set<string>;
} {
    const groups = new Map<string, InsightSourceEntry[]>();

    for (const entry of entries) {
        const key = normalizeMerchantKey(entry);
        if (key === 'unknown') continue;
        const bucket = groups.get(key) || [];
        bucket.push(entry);
        groups.set(key, bucket);
    }

    const recurring: RecurringPayment[] = [];
    const keys = new Set<string>();

    for (const [key, bucket] of groups) {
        const months = new Set(bucket.map((entry) => monthKey(entry.occurredAt)));
        if (bucket.length < 3 || months.size < 2) continue;

        const amounts = bucket.map((entry) => entry.amount);
        const average = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
        if (average <= 0) continue;

        // Subscriptions repeat at a stable price; noisy amounts are just a frequent merchant.
        const spread = Math.max(...amounts) - Math.min(...amounts);
        const isStable = spread <= average * 0.35;
        if (!isStable) continue;

        const sorted = [...bucket].sort(
            (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
        );

        keys.add(key);
        recurring.push({
            merchant: displayMerchant(sorted[0]),
            category: categoryOf(sorted[0]),
            averageAmount: round(average),
            occurrences: bucket.length,
            monthsSeen: months.size,
            lastSeen: dayKey(sorted[0].occurredAt),
            estimatedMonthlyCost: round((average * bucket.length) / months.size),
        });
    }

    return {
        payments: recurring
            .sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost)
            .slice(0, 6),
        keys,
    };
}

/**
 * "Unusual" is measured against the median and the 95th percentile rather than
 * the mean and standard deviation. A single ₹3.5 lakh transfer drags a mean so
 * far right that nothing else can ever clear the bar, which is exactly the
 * situation a real bank statement produces.
 */
function buildOutliers(
    entries: InsightSourceEntry[],
    recurringKeys: Set<string>
): OutlierTransaction[] {
    if (entries.length < 5) return [];

    const sorted = entries.map((entry) => entry.amount).sort((a, b) => a - b);
    const middle = median(sorted);
    if (middle <= 0) return [];

    const threshold = Math.max(percentile(sorted, 0.95), middle * 4);

    return entries
        // A large EMI that arrives every month is the most predictable charge
        // there is, so recurring merchants are never "unusual".
        .filter((entry) => !recurringKeys.has(normalizeMerchantKey(entry)))
        .filter((entry) => entry.amount >= threshold)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((entry) => ({
            date: dayKey(entry.occurredAt),
            merchant: displayMerchant(entry),
            category: categoryOf(entry),
            amount: round(entry.amount),
            timesAverage: round(entry.amount / middle),
        }));
}

/** Below this, a repeated charge is noise rather than something worth disputing. */
const DUPLICATE_FLOOR = 50;

function buildDuplicates(entries: InsightSourceEntry[]): DuplicateCharge[] {
    const groups = new Map<string, InsightSourceEntry[]>();

    for (const entry of entries) {
        if (entry.amount < DUPLICATE_FLOOR) continue;

        const key = `${normalizeMerchantKey(entry)}|${entry.amount.toFixed(2)}`;
        const bucket = groups.get(key) || [];
        bucket.push(entry);
        groups.set(key, bucket);
    }

    const duplicates: DuplicateCharge[] = [];

    for (const bucket of groups.values()) {
        if (bucket.length < 2) continue;

        const sorted = [...bucket].sort(
            (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
        );

        for (let index = 1; index < sorted.length; index += 1) {
            const gapDays =
                (sorted[index].occurredAt.getTime() - sorted[index - 1].occurredAt.getTime()) /
                86_400_000;

            if (gapDays <= 3) {
                duplicates.push({
                    merchant: displayMerchant(sorted[index]),
                    amount: round(sorted[index].amount),
                    dates: [dayKey(sorted[index - 1].occurredAt), dayKey(sorted[index].occurredAt)],
                });
                break;
            }
        }
    }

    return duplicates.sort((a, b) => b.amount - a.amount).slice(0, 4);
}

/**
 * Compares the latest month with the one before it.
 *
 * A statement almost never ends on the last day of a month, so the naive
 * comparison pits three weeks against a full month and reports a fake collapse
 * in spending. When the final month is incomplete both sides are truncated to
 * the same day of the month, and the result says so.
 */
function buildComparison(
    entries: InsightSourceEntry[],
    monthTotals: Map<string, number>,
    lastDate: Date
): MonthComparison | null {
    if (!entries.length) return null;

    const latestKey = monthKey(lastDate);
    const priorKey = previousMonthKey(latestKey);

    if (!monthTotals.has(latestKey) || !monthTotals.has(priorKey)) return null;

    const partial = lastDate.getDate() < daysInMonth(lastDate);
    const throughDay = partial ? lastDate.getDate() : daysInMonth(lastDate);

    let latestAmount = 0;
    let previousAmount = 0;

    for (const entry of entries) {
        if (entry.occurredAt.getDate() > throughDay) continue;

        const key = monthKey(entry.occurredAt);
        if (key === latestKey) latestAmount += entry.amount;
        else if (key === priorKey) previousAmount += entry.amount;
    }

    if (previousAmount <= 0) return null;

    return {
        latestMonth: latestKey,
        previousMonth: priorKey,
        latestAmount: round(latestAmount),
        previousAmount: round(previousAmount),
        percent: round(((latestAmount - previousAmount) / previousAmount) * 100),
        partial,
        throughDay,
    };
}

const monthName = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
    });
};

const rupees = (value: number) =>
    `₹${round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Percentages read as noise past the decimal point in a sentence. */
const pct = (value: number) => `${Math.round(Math.abs(value))}%`;

export function buildInsights(entries: InsightSourceEntry[]): SmartInsights {
    const empty: SmartInsights = {
        headline: 'Import a statement to unlock smart insights.',
        items: [],
        recurring: [],
        outliers: [],
        duplicates: [],
        weekdayPattern: DAY_LABELS.map((day) => ({ day, amount: 0, count: 0 })),
        dailyAverage: 0,
        activeDays: 0,
        medianTransaction: 0,
        largestTransaction: 0,
        projectedMonthlySpend: 0,
        monthOverMonthPercent: null,
        comparison: null,
        recurringMonthlyTotal: 0,
        coreSpend: 0,
        totalOutflow: 0,
    };

    const outflow = entries.filter(
        (entry) => (entry.direction ?? 'debit') === 'debit' && entry.amount > 0
    );

    if (!outflow.length) return empty;

    const flowOf = buildFlowResolver(entries);

    // Every figure below is measured on total outflow, which is what actually
    // left the account. Card bills, EMIs and SIPs are separated out as
    // `coreSpend` and explained by their own card rather than being quietly
    // dropped — excluding them made the pace and month-on-month numbers read as
    // zero for anyone who pays by card and settles the bill later.
    const analysed = outflow;

    const totalOutflow = outflow.reduce((sum, entry) => sum + entry.amount, 0);
    const totalSpend = totalOutflow;
    const amounts = analysed.map((entry) => entry.amount);

    const dayTotals = new Map<string, number>();
    const monthTotals = new Map<string, number>();
    const monthCategoryTotals = new Map<string, Map<string, number>>();
    const categoryTotals = new Map<string, number>();
    const flowTotals = new Map<MoneyFlow, number>();
    const merchantTotals = new Map<string, { amount: number; label: string }>();
    const weekdayTotals = DAY_LABELS.map((day) => ({ day, amount: 0, count: 0 }));

    for (const entry of outflow) {
        flowTotals.set(flowOf(entry), (flowTotals.get(flowOf(entry)) || 0) + entry.amount);
    }

    for (const entry of analysed) {
        const category = categoryOf(entry);
        const month = monthKey(entry.occurredAt);
        const day = dayKey(entry.occurredAt);

        dayTotals.set(day, (dayTotals.get(day) || 0) + entry.amount);
        monthTotals.set(month, (monthTotals.get(month) || 0) + entry.amount);
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + entry.amount);

        const perCategory = monthCategoryTotals.get(month) || new Map<string, number>();
        perCategory.set(category, (perCategory.get(category) || 0) + entry.amount);
        monthCategoryTotals.set(month, perCategory);

        const merchantKey = normalizeMerchantKey(entry);
        const existing = merchantTotals.get(merchantKey);
        merchantTotals.set(merchantKey, {
            amount: (existing?.amount || 0) + entry.amount,
            label: existing?.label || displayMerchant(entry),
        });

        const weekday = weekdayTotals[entry.occurredAt.getDay()];
        weekday.amount += entry.amount;
        weekday.count += 1;
    }

    // The statement's own end date, not the last row that happened to survive
    // filtering — otherwise a quiet final week makes the run rate collapse.
    const lastDate = outflow.reduce(
        (latest, entry) => (entry.occurredAt > latest ? entry.occurredAt : latest),
        outflow[0].occurredAt
    );

    const comparison = buildComparison(analysed, monthTotals, lastDate);
    const monthOverMonthPercent = comparison ? comparison.percent : null;

    const activeDays = dayTotals.size;
    const dailyAverage = activeDays ? totalSpend / activeDays : 0;

    // Project the month actually in progress rather than smearing the whole
    // statement over 30 days — a run rate is only meaningful for one month.
    const latestMonthTotal = monthTotals.get(monthKey(lastDate)) || 0;
    const elapsedDays = Math.max(1, lastDate.getDate());
    const projectedMonthlySpend = round(
        (latestMonthTotal / elapsedDays) * daysInMonth(lastDate)
    );

    const { payments: recurring, keys: recurringKeys } = buildRecurring(outflow);
    const outliers = buildOutliers(analysed, recurringKeys);
    const duplicates = buildDuplicates(outflow);
    const recurringMonthlyTotal = round(
        recurring.reduce((sum, item) => sum + item.estimatedMonthlyCost, 0)
    );

    const items: InsightItem[] = [];

    if (comparison && Math.abs(comparison.percent) >= 5) {
        const rising = comparison.percent > 0;
        const window = comparison.partial
            ? ` over the first ${comparison.throughDay} days of each month`
            : '';

        items.push({
            id: 'mom-change',
            tone: rising ? (comparison.percent >= 25 ? 'critical' : 'warning') : 'positive',
            title: rising ? 'Spending is trending up' : 'Spending is trending down',
            detail: `${monthName(comparison.latestMonth)} outflow of ${rupees(
                comparison.latestAmount
            )} is ${pct(comparison.percent)} ${rising ? 'higher' : 'lower'} than ${monthName(
                comparison.previousMonth
            )}'s ${rupees(comparison.previousAmount)}${window}.`,
            value: comparison.latestAmount,
            changePercent: comparison.percent,
            priority: rising ? 100 : 60,
        });
    }

    const sortedCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0];

    // "General Spending dominates your spending" is a statement about the
    // categoriser, not about the user, so the catch-all never gets a card.
    if (topCategory && totalSpend > 0 && topCategory[0] !== DEFAULT_CATEGORY) {
        const share = round((topCategory[1] / totalSpend) * 100);
        const topFlow = flowForCategory(topCategory[0], 'debit');

        if (share >= 30) {
            // Telling someone to "cut their credit card payment by 10%" is
            // advice to miss a bill, so only consumption gets the trim nudge.
            const advice =
                topFlow === 'spend'
                    ? `Reducing it by 10% would free up about ${rupees(topCategory[1] * 0.1)}.`
                    : topFlow === 'debt'
                      ? 'That is money repaying what you already spent, so the saving has to happen upstream on the card itself.'
                      : 'That is money moving rather than money spent, so it is not a cut you can simply make.';

            items.push({
                id: 'category-concentration',
                tone: share >= 50 && topFlow === 'spend' ? 'warning' : 'neutral',
                title: `${topCategory[0]} is where most of your outflow goes`,
                detail: `${pct(share)} of every rupee that left the account went to ${
                    topCategory[0]
                }. ${advice}`,
                value: round(topCategory[1]),
                priority: 90,
            });
        }
    }

    const nonSpendTotal = totalOutflow - (flowTotals.get('spend') || 0);
    if (totalOutflow > 0 && nonSpendTotal / totalOutflow >= 0.25) {
        const parts = (['debt', 'investment', 'transfer'] as const)
            .map((flow) => ({ flow, amount: flowTotals.get(flow) || 0 }))
            .filter((part) => part.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        const labels: Record<'debt' | 'investment' | 'transfer', string> = {
            debt: 'card bills and EMIs',
            investment: 'investments',
            transfer: 'transfers and withdrawals',
        };

        items.push({
            id: 'outflow-composition',
            tone: 'neutral',
            title: 'Most of your outflow is not spending',
            detail: `${pct(
                (nonSpendTotal / totalOutflow) * 100
            )} of the ${rupees(totalOutflow)} that left your account was ${parts
                .slice(0, 2)
                .map((part) => `${labels[part.flow]} (${rupees(part.amount)})`)
                .join(' and ')}. Everyday spending was ${rupees(flowTotals.get('spend') || 0)}.`,
            value: round(nonSpendTotal),
            priority: 88,
        });
    }

    if (recurring.length) {
        items.push({
            id: 'recurring',
            tone: 'neutral',
            title: `${recurring.length} recurring payment${recurring.length > 1 ? 's' : ''} detected`,
            detail: `Roughly ${rupees(
                recurringMonthlyTotal
            )} leaves your account every month on repeat charges like ${recurring
                .slice(0, 2)
                .map((item) => item.merchant)
                .join(' and ')}.`,
            value: recurringMonthlyTotal,
            priority: 85,
        });
    }

    if (outliers.length) {
        const biggest = outliers[0];
        items.push({
            id: 'outlier',
            tone: 'warning',
            title: 'Unusually large transaction',
            detail: `${rupees(biggest.amount)} at ${biggest.merchant} on ${
                biggest.date
            } is ${biggest.timesAverage}× your typical transaction.`,
            value: biggest.amount,
            priority: 80,
        });
    }

    if (duplicates.length) {
        items.push({
            id: 'duplicates',
            tone: 'critical',
            title: 'Possible duplicate charges',
            detail: `${duplicates.length} charge${
                duplicates.length > 1 ? 's were' : ' was'
            } repeated for the same amount within 3 days — worth verifying with your bank.`,
            value: round(duplicates.reduce((sum, item) => sum + item.amount, 0)),
            priority: 95,
        });
    }

    const everydayTotal = flowTotals.get('spend') || 0;
    const smallSpends = analysed.filter(
        (entry) => entry.amount <= 200 && flowOf(entry) === 'spend'
    );

    if (smallSpends.length >= 10 && everydayTotal > 0) {
        const smallTotal = smallSpends.reduce((sum, entry) => sum + entry.amount, 0);
        items.push({
            id: 'small-spend-leak',
            tone: 'neutral',
            title: 'Small spends add up',
            detail: `${smallSpends.length} transactions under ₹200 total ${rupees(
                smallTotal
            )} — that is ${pct(
                (smallTotal / everydayTotal) * 100
            )} of your everyday spending.`,
            value: round(smallTotal),
            priority: 55,
        });
    }

    const weekendTotal = weekdayTotals[0].amount + weekdayTotals[6].amount;
    const weekendCount = weekdayTotals[0].count + weekdayTotals[6].count;
    const weekdayCount = analysed.length - weekendCount;
    const weekdayTotal = totalSpend - weekendTotal;

    if (weekendCount >= 3 && weekdayCount >= 3) {
        const weekendAvg = weekendTotal / weekendCount;
        const weekdayAvg = weekdayTotal / weekdayCount;

        if (weekendAvg > weekdayAvg * 1.25) {
            items.push({
                id: 'weekend-bias',
                tone: 'neutral',
                title: 'Weekends cost you more',
                detail: `Your average weekend transaction is ${rupees(
                    weekendAvg
                )} versus ${rupees(weekdayAvg)} on weekdays.`,
                value: round(weekendTotal),
                priority: 45,
            });
        }
    }

    const discretionaryTotal = sortedCategories
        .filter(([category]) => DISCRETIONARY_CATEGORIES.has(category))
        .reduce((sum, [, amount]) => sum + amount, 0);

    if (discretionaryTotal > 0 && everydayTotal > 0) {
        const share = round((discretionaryTotal / everydayTotal) * 100);
        if (share >= 20) {
            items.push({
                id: 'savings-opportunity',
                tone: 'positive',
                title: 'Clear savings opportunity',
                detail: `Dining, shopping, travel and entertainment make up ${pct(
                    share
                )} of your everyday spending. Trimming 20% there saves about ${rupees(
                    discretionaryTotal * 0.2
                )}.`,
                value: round(discretionaryTotal * 0.2),
                priority: 70,
            });
        }
    }

    if (comparison) {
        const latestCategories = monthCategoryTotals.get(comparison.latestMonth);
        const previousCategories = monthCategoryTotals.get(comparison.previousMonth);

        if (latestCategories && previousCategories) {
            let biggestJump: { category: string; delta: number; percent: number } | null = null;

            for (const [category, amount] of latestCategories) {
                const before = previousCategories.get(category) || 0;
                if (before <= 0) continue;

                const delta = amount - before;
                const percent = (delta / before) * 100;

                if (delta > 0 && percent >= 30 && (!biggestJump || delta > biggestJump.delta)) {
                    biggestJump = { category, delta, percent: round(percent) };
                }
            }

            if (biggestJump) {
                items.push({
                    id: 'category-momentum',
                    tone: 'warning',
                    title: `${biggestJump.category} jumped`,
                    detail: `${biggestJump.category} rose ${pct(biggestJump.percent)} (${rupees(
                        biggestJump.delta
                    )}) in ${monthName(comparison.latestMonth)} compared with ${monthName(
                        comparison.previousMonth
                    )}.`,
                    value: round(biggestJump.delta),
                    changePercent: biggestJump.percent,
                    priority: 75,
                });
            }
        }
    }

    const topMerchant = [...merchantTotals.values()].sort((a, b) => b.amount - a.amount)[0];
    if (topMerchant && totalSpend > 0 && topMerchant.amount / totalSpend >= 0.2) {
        items.push({
            id: 'merchant-dependency',
            tone: 'neutral',
            title: `${topMerchant.label} takes the largest share`,
            detail: `${rupees(topMerchant.amount)} (${pct(
                (topMerchant.amount / totalSpend) * 100
            )} of everything that left the account) went to this one payee.`,
            value: round(topMerchant.amount),
            priority: 50,
        });
    }

    items.push({
        id: 'burn-rate',
        tone: 'neutral',
        title: 'Your spending pace',
        detail: `You spend about ${rupees(
            dailyAverage
        )} on each active day. At the current pace ${monthName(
            monthKey(lastDate)
        )} lands near ${rupees(projectedMonthlySpend)}.`,
        value: projectedMonthlySpend,
        priority: 40,
    });

    items.sort((a, b) => b.priority - a.priority);

    const headline = items[0]
        ? items[0].detail
        : `You spent ${rupees(totalSpend)} across ${analysed.length} transactions.`;

    return {
        headline,
        items: items.slice(0, 8),
        recurring,
        outliers,
        duplicates,
        weekdayPattern: weekdayTotals.map((entry) => ({
            ...entry,
            amount: round(entry.amount),
        })),
        dailyAverage: round(dailyAverage),
        activeDays,
        medianTransaction: round(median(amounts)),
        largestTransaction: round(Math.max(...amounts)),
        projectedMonthlySpend,
        monthOverMonthPercent,
        comparison,
        recurringMonthlyTotal,
        coreSpend: round(flowTotals.get('spend') || 0),
        totalOutflow: round(totalOutflow),
    };
}
