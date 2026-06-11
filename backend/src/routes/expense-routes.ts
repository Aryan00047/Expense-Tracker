import { Request, Response, Router } from 'express';
import ExpenseEntryModel from '../models/expense-entry.model.js';
import { inferExpenseCategory } from '../utils/expense-category.js';
import {
    findHeaderIndex,
    normalizeHeader,
    parseAmount,
    parseCsv,
    parseCsvDate,
} from '../utils/csv.js';

const router = Router();

const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'txn date'];
const AMOUNT_HEADERS = [
    'amount',
    'expense',
    'debit',
    'withdrawal',
    'withdrawals',
    'spent',
];
const DEBIT_HEADERS = ['debit', 'withdrawal', 'withdrawals', 'spent'];
const CREDIT_HEADERS = ['credit', 'deposit', 'deposits'];
const CATEGORY_HEADERS = ['category', 'expense category', 'type'];
const DESCRIPTION_HEADERS = [
    'description',
    'details',
    'note',
    'narration',
    'particulars',
];
const MERCHANT_HEADERS = ['merchant', 'payee', 'vendor', 'store'];

interface HeaderMatchResult {
    headerRowIndex: number;
    headers: string[];
    dateIndex: number;
    amountIndex: number;
    debitIndex: number;
    creditIndex: number;
    categoryIndex: number;
    descriptionIndex: number;
    merchantIndex: number;
}

interface AnalyticsEntry {
    _id?: { toString(): string } | string;
    occurredAt: Date;
    amount: number;
    category?: string;
    description?: string;
    merchant?: string;
}

interface ImportedAnalyticsEntry extends AnalyticsEntry {
    userId: string;
    source: 'csv';
    importBatchId: string;
    rawDate: string;
}

function buildAnalytics(entries: AnalyticsEntry[]) {
    const totalSpend = Number(
        entries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)
    );
    const transactionCount = entries.length;
    const averageSpend = transactionCount
        ? Number((totalSpend / transactionCount).toFixed(2))
        : 0;

    const categoryTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();
    const merchantTotals = new Map<string, number>();

    for (const entry of entries) {
        const category = inferExpenseCategory({
            category: entry.category,
            description: entry.description,
            merchant: entry.merchant,
        });
        const monthLabel = entry.occurredAt.toISOString().slice(0, 7);
        const merchant = entry.merchant || entry.description || 'Unknown';

        categoryTotals.set(
            category,
            Number(((categoryTotals.get(category) || 0) + entry.amount).toFixed(2))
        );
        monthlyTotals.set(
            monthLabel,
            Number(((monthlyTotals.get(monthLabel) || 0) + entry.amount).toFixed(2))
        );
        merchantTotals.set(
            merchant,
            Number(((merchantTotals.get(merchant) || 0) + entry.amount).toFixed(2))
        );
    }

    const topCategories = [...categoryTotals.entries()]
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSpend ? Number(((amount / totalSpend) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

    const monthlyTrend = [...monthlyTotals.entries()]
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const topMerchants = [...merchantTotals.entries()]
        .map(([merchant, amount]) => ({ merchant, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const recentTransactions = entries.slice(0, 8).map((entry, index) => ({
        id:
            typeof entry._id === 'string'
                ? entry._id
                : entry._id?.toString() || `temp-${index}`,
        date: entry.occurredAt.toISOString().slice(0, 10),
        amount: entry.amount,
        category: inferExpenseCategory({
            category: entry.category,
            description: entry.description,
            merchant: entry.merchant,
        }),
        description: entry.description || '',
        merchant: entry.merchant || '',
    }));

    return {
        totalSpend,
        transactionCount,
        averageSpend,
        topCategories,
        monthlyTrend,
        topMerchants,
        recentTransactions,
    };
}

function detectHeaderRow(rows: string[][]): HeaderMatchResult | null {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const dateIndex = findHeaderIndex(row, DATE_HEADERS);
        const amountIndex = findHeaderIndex(row, AMOUNT_HEADERS);
        const debitIndex = findHeaderIndex(row, DEBIT_HEADERS);
        const creditIndex = findHeaderIndex(row, CREDIT_HEADERS);

        if (dateIndex === -1 || (amountIndex === -1 && debitIndex === -1)) {
            continue;
        }

        return {
            headerRowIndex: rowIndex,
            headers: row.map(normalizeHeader),
            dateIndex,
            amountIndex,
            debitIndex,
            creditIndex,
            categoryIndex: findHeaderIndex(row, CATEGORY_HEADERS),
            descriptionIndex: findHeaderIndex(row, DESCRIPTION_HEADERS),
            merchantIndex: findHeaderIndex(row, MERCHANT_HEADERS),
        };
    }

    return null;
}

router.post('/upload-csv', async (req: Request, res: Response) => {
    try {
        const { csvText, replaceExisting = true, saveToAccount = false } = req.body as {
            csvText?: string;
            replaceExisting?: boolean;
            saveToAccount?: boolean;
        };

        if (!csvText || !csvText.trim()) {
            return res.status(400).json({
                success: false,
                message: 'csvText is required',
            });
        }

        const rows = parseCsv(csvText);
        if (rows.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'CSV must include a header row and at least one data row',
            });
        }

        const headerMatch = detectHeaderRow(rows);

        if (!headerMatch) {
            return res.status(400).json({
                success: false,
                message:
                    'Could not detect transaction headers. Include a row with date and amount/debit columns.',
            });
        }

        const {
            headerRowIndex,
            headers,
            dateIndex,
            amountIndex,
            debitIndex,
            creditIndex,
            categoryIndex,
            descriptionIndex,
            merchantIndex,
        } = headerMatch;

        const dataRows = rows.slice(headerRowIndex + 1);

        const importBatchId = `csv-${Date.now()}`;
        const documents: ImportedAnalyticsEntry[] = [];
        let skippedRows = 0;

        for (const row of dataRows) {
            const rawDate = row[dateIndex] || '';
            const occurredAt = parseCsvDate(rawDate);

            if (!occurredAt) {
                skippedRows += 1;
                continue;
            }

            const parsedDebit = debitIndex >= 0 ? parseAmount(row[debitIndex] || '') : null;
            const parsedCredit =
                creditIndex >= 0 ? parseAmount(row[creditIndex] || '') : null;
            const parsedAmount =
                amountIndex >= 0 ? parseAmount(row[amountIndex] || '') : null;

            let amount: number | null = null;

            if (parsedDebit !== null && parsedDebit > 0) {
                amount = parsedDebit;
            } else if (parsedAmount !== null) {
                amount = parsedAmount < 0 ? Math.abs(parsedAmount) : parsedAmount;
            }

            if (parsedCredit !== null && parsedCredit > 0 && parsedDebit === null) {
                amount = null;
            }

            if (amount === null || amount <= 0) {
                skippedRows += 1;
                continue;
            }

            const description =
                descriptionIndex >= 0 && row[descriptionIndex]
                    ? row[descriptionIndex].trim()
                    : '';

            const merchant =
                merchantIndex >= 0 && row[merchantIndex]
                    ? row[merchantIndex].trim()
                    : description;
            const rawCategory =
                categoryIndex >= 0 && row[categoryIndex]
                    ? row[categoryIndex].trim()
                    : '';
            const category = inferExpenseCategory({
                category: rawCategory,
                description,
                merchant,
            });

            documents.push({
                userId: req.user!.id,
                occurredAt,
                amount: Number(amount.toFixed(2)),
                category,
                description,
                merchant,
                source: 'csv',
                importBatchId,
                rawDate,
            });
        }

        if (documents.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'No expense rows could be imported. Check your date and amount columns.',
                detectedHeaders: headers,
            });
        }

        let analyticsEntries: AnalyticsEntry[] = [...documents];

        if (saveToAccount) {
            if (replaceExisting) {
                await ExpenseEntryModel.deleteMany({ userId: req.user!.id });
            }

            const savedDocuments = await ExpenseEntryModel.insertMany(documents);
            analyticsEntries = savedDocuments
                .map((doc) => ({
                    _id: doc._id,
                    occurredAt: doc.occurredAt,
                    amount: doc.amount,
                    category: doc.category,
                    description: doc.description,
                    merchant: doc.merchant,
                }))
                .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
        } else {
            analyticsEntries = [...analyticsEntries].sort(
                (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
            );
        }

        return res.status(201).json({
            success: true,
            message: saveToAccount
                ? 'CSV imported and saved successfully'
                : 'CSV analyzed successfully without saving',
            data: {
                importedCount: documents.length,
                skippedRows,
                importBatchId,
                detectedHeaders: headers,
                savedToAccount: saveToAccount,
                analytics: buildAnalytics(analyticsEntries),
            },
        });
    } catch (error) {
        console.error('CSV import failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to import CSV',
        });
    }
});

router.get('/analytics', async (req: Request, res: Response) => {
    try {
        const { from, to } = req.query as {
            from?: string;
            to?: string;
        };

        const filters: Record<string, unknown> = {
            userId: req.user!.id,
        };

        if (from || to) {
            const occurredAt: Record<string, Date> = {};

            if (from) {
                const start = parseCsvDate(from);
                if (!start) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid from date',
                    });
                }
                occurredAt.$gte = start;
            }

            if (to) {
                const end = parseCsvDate(to);
                if (!end) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid to date',
                    });
                }
                end.setHours(23, 59, 59, 999);
                occurredAt.$lte = end;
            }

            filters.occurredAt = occurredAt;
        }

        const entries = await ExpenseEntryModel.find(filters)
            .sort({ occurredAt: -1 })
            .lean();

        return res.json({
            success: true,
            data: buildAnalytics(entries),
        });
    } catch (error) {
        console.error('Analytics fetch failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to load analytics',
        });
    }
});

export default router;
