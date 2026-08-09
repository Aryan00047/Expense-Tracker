import ExpenseEntryModel from '../models/expense-entry.model.js';
import type { ParsedBill } from '../documents/bill.parser.js';
import type { StatementDocument } from '../documents/statement.parser.js';
import type { Direction, ParsedTransaction } from '../documents/statement-schema.js';
import { buildAnalytics, type AnalyticsEntry } from '../utils/analytics.js';
import { toLocalDayKey } from '../utils/date.js';
import { flowForCategory, type MoneyFlow } from '../utils/expense-category.js';

/**
 * Everything that touches the database or builds analytics.
 *
 * Statements and bills used to persist themselves inside their own route
 * handlers, which is why one produced `pdf-<ts>` batch ids through a shared
 * helper and the other hand-rolled `bill-<ts>` a hundred lines away. One import
 * path, one batch id, one analytics shape.
 */

export type StatementSource = 'csv' | 'pdf';

interface ImportedEntry extends ParsedTransaction {
    userId: string;
    source: StatementSource;
    importBatchId: string;
}

const batchId = (prefix: string) => `${prefix}-${Date.now()}`;

function toAnalyticsEntry(doc: {
    _id: unknown;
    occurredAt: Date;
    amount: number;
    direction?: string | null;
    flow?: string | null;
    category?: string | null;
    description?: string | null;
    merchant?: string | null;
}): AnalyticsEntry {
    return {
        _id: doc._id as AnalyticsEntry['_id'],
        occurredAt: doc.occurredAt,
        amount: doc.amount,
        direction: (doc.direction ?? undefined) as Direction | undefined,
        flow: (doc.flow ?? undefined) as MoneyFlow | undefined,
        category: doc.category ?? undefined,
        description: doc.description ?? undefined,
        merchant: doc.merchant ?? undefined,
    };
}

export interface StatementImportPayload {
    kind: 'statement';
    source: StatementSource;
    importedCount: number;
    creditCount: number;
    skippedRows: number;
    importBatchId: string;
    detectedHeaders: string[];
    warnings: string[];
    savedToAccount: boolean;
    analytics: ReturnType<typeof buildAnalytics>;
    pageCount?: number;
    detectedColumns?: string[];
    candidateLineCount?: number;
    dateOrder?: string;
}

/**
 * Optionally persists the parsed transactions, then returns analytics computed
 * over whichever set of entries the user asked for — the saved rows when they
 * opted in, the parsed ones when they are analysing privately.
 */
export async function importStatement(options: {
    userId: string;
    source: StatementSource;
    statement: StatementDocument;
    saveToAccount: boolean;
    replaceExisting: boolean;
}): Promise<StatementImportPayload> {
    const { userId, source, statement, saveToAccount, replaceExisting } = options;
    const importBatchId = batchId(source);

    const documents: ImportedEntry[] = [...statement.expenses, ...statement.credits].map(
        (transaction) => ({ ...transaction, userId, source, importBatchId })
    );

    let analyticsEntries: AnalyticsEntry[] = documents;

    if (saveToAccount) {
        if (replaceExisting) {
            await ExpenseEntryModel.deleteMany({ userId });
        }

        const saved = await ExpenseEntryModel.insertMany(documents);
        analyticsEntries = saved.map(toAnalyticsEntry);
    }

    analyticsEntries = [...analyticsEntries].sort(
        (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
    );

    return {
        kind: 'statement',
        source,
        importedCount: statement.expenses.length,
        creditCount: statement.credits.length,
        skippedRows: statement.skippedRows,
        importBatchId,
        detectedHeaders: statement.detectedHeaders,
        warnings: statement.warnings,
        savedToAccount: saveToAccount,
        analytics: buildAnalytics(analyticsEntries),
        pageCount: statement.pageCount,
        detectedColumns: statement.detectedColumns,
        candidateLineCount: statement.candidateLineCount,
        dateOrder: statement.dateOrder,
    };
}

export interface BillImportPayload extends Omit<ParsedBill, 'billDate'> {
    kind: 'bill';
    source: StatementSource;
    /** yyyy-mm-dd, or null when the document carries no readable date. */
    billDate: string | null;
    pageCount: number;
    savedToAccount: boolean;
    savedEntryId: string | null;
}

/** Saving a bill adds exactly one expense row: its total, dated to the bill. */
export async function importBill(options: {
    userId: string;
    bill: ParsedBill;
    pageCount: number;
    saveToAccount: boolean;
}): Promise<BillImportPayload> {
    const { userId, bill, pageCount, saveToAccount } = options;
    let savedEntryId: string | null = null;

    if (saveToAccount && bill.total !== null) {
        const saved = await ExpenseEntryModel.create({
            userId,
            occurredAt: bill.billDate ?? new Date(),
            amount: bill.total,
            direction: 'debit',
            flow: flowForCategory(bill.category, 'debit'),
            category: bill.category,
            description: [bill.vendor, bill.invoiceNumber && `Invoice ${bill.invoiceNumber}`]
                .filter(Boolean)
                .join(' • '),
            merchant: bill.vendor,
            source: 'pdf',
            importBatchId: batchId('bill'),
            rawDate: bill.billDate ? toLocalDayKey(bill.billDate) : '',
        });

        savedEntryId = saved._id.toString();
    }

    return {
        ...bill,
        kind: 'bill',
        source: 'pdf',
        billDate: bill.billDate ? toLocalDayKey(bill.billDate) : null,
        pageCount,
        savedToAccount: saveToAccount,
        savedEntryId,
    };
}
