import { Request, Response, Router } from 'express';
import ExpenseEntryModel from '../models/expense-entry.model.js';
import { readDocument } from '../documents/registry.js';
import { readStatementRows } from '../documents/statement.parser.js';
import { buildAnalytics } from '../utils/analytics.js';
import { parseCsv, parseCsvDate } from '../utils/csv.js';
import { extractPdfLines, isPasswordError } from '../utils/pdf.js';
import { importBill, importStatement } from '../services/import.service.js';

const router = Router();

const MAX_PDF_BYTES = 15 * 1024 * 1024;

interface UploadBody {
    csvText?: string;
    pdfBase64?: string;
    password?: string;
    replaceExisting?: boolean;
    saveToAccount?: boolean;
}

/**
 * Turns an uploaded data URL into a validated PDF buffer, or the response the
 * client should get instead.
 */
function decodePdfPayload(pdfBase64: string):
    | { ok: true; buffer: Buffer }
    | { ok: false; status: number; message: string } {
    // Browsers send data URLs; strip the prefix before decoding.
    const base64Payload = pdfBase64.includes(',')
        ? pdfBase64.slice(pdfBase64.indexOf(',') + 1)
        : pdfBase64;

    let buffer: Buffer;
    try {
        buffer = Buffer.from(base64Payload, 'base64');
    } catch {
        return { ok: false, status: 400, message: 'PDF payload could not be decoded' };
    }

    if (!buffer.length) {
        return { ok: false, status: 400, message: 'PDF payload is empty' };
    }

    if (buffer.length > MAX_PDF_BYTES) {
        return { ok: false, status: 413, message: 'PDF is larger than the 15 MB limit' };
    }

    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
        return { ok: false, status: 400, message: 'That file does not look like a PDF' };
    }

    return { ok: true, buffer };
}

/** Why a set of CSV rows was rejected, in the words a CSV uploader needs. */
const CSV_FAILURES: Record<string, string> = {
    'no-rows': 'CSV must include a header row and at least one data row',
    'no-headers':
        'Could not detect transaction headers. Include a row with date and amount/debit columns.',
    'no-expenses': 'No expense rows could be imported. Check your date and amount columns.',
};

/**
 * Why a PDF could not be read, in the words a PDF uploader needs.
 *
 * There is no "you used the wrong upload box" message here any more: the server
 * tries every parser it has before it gives up, so if the document is readable
 * at all it has already been read.
 */
const PDF_FAILURES: Record<string, string> = {
    'no-rows':
        'Could not find any transaction rows in this PDF. Make sure it is a statement with a date and amount column.',
    'no-headers': 'Detected rows in this PDF but could not map the amount columns.',
    'no-expenses':
        'Found rows in the PDF but none of them read as expenses. Credits and refunds are ignored on purpose.',
    'no-total':
        'This looks like a bill, but no amount could be read from it. Check that the total is printed as text rather than an image.',
};

const PDF_UNREADABLE =
    'This PDF does not read as a bank statement or as a bill. Statements need a date and amount column; bills need a printed total.';

async function readCsvUpload(req: Request, res: Response, body: UploadBody) {
    const rows = parseCsv(body.csvText!);
    const parsed = readStatementRows(rows);

    if (!parsed.ok) {
        return res.status(400).json({
            success: false,
            message: CSV_FAILURES[parsed.reason] ?? 'This CSV could not be read.',
            detectedHeaders: parsed.detectedHeaders,
        });
    }

    const payload = await importStatement({
        userId: req.user!.id,
        source: 'csv',
        statement: parsed.result,
        saveToAccount: body.saveToAccount ?? false,
        replaceExisting: body.replaceExisting ?? true,
    });

    return res.status(201).json({
        success: true,
        message: payload.savedToAccount
            ? 'CSV imported and saved successfully'
            : 'CSV analyzed successfully without saving',
        data: payload,
    });
}

async function readPdfUpload(req: Request, res: Response, body: UploadBody) {
    const decoded = decodePdfPayload(body.pdfBase64!);
    if (!decoded.ok) {
        return res.status(decoded.status).json({ success: false, message: decoded.message });
    }

    const extraction = await extractPdfLines(new Uint8Array(decoded.buffer), body.password);

    if (!extraction.hasText) {
        return res.status(422).json({
            success: false,
            message:
                'No selectable text found. This looks like a scan or a photo — upload the PDF your bank or seller issued, or the CSV version.',
        });
    }

    // Classification happens here, before any parsing commits to an answer, and
    // the registry falls back to its second guess if the first one fails.
    const document = readDocument(extraction.lines);

    if (!document.ok) {
        const best = document.failures.find((failure) => failure.reason !== 'not-this-kind');

        return res.status(422).json({
            success: false,
            message: (best && PDF_FAILURES[best.reason]) || PDF_UNREADABLE,
            pageCount: extraction.pageCount,
        });
    }

    if (document.kind === 'bill') {
        const payload = await importBill({
            userId: req.user!.id,
            bill: document.bill,
            pageCount: extraction.pageCount,
            saveToAccount: body.saveToAccount ?? false,
        });

        return res.status(201).json({
            success: true,
            message: payload.savedToAccount
                ? 'Bill analysed and saved as an expense'
                : 'Bill analysed without saving',
            data: payload,
        });
    }

    const payload = await importStatement({
        userId: req.user!.id,
        source: 'pdf',
        statement: { ...document.statement, pageCount: extraction.pageCount },
        saveToAccount: body.saveToAccount ?? false,
        replaceExisting: body.replaceExisting ?? true,
    });

    return res.status(201).json({
        success: true,
        message: payload.savedToAccount
            ? 'Statement imported and saved successfully'
            : 'Statement analyzed successfully without saving',
        data: payload,
    });
}

/**
 * One upload endpoint for every financial document the app understands.
 *
 * The client no longer has to know — or ask the user — whether a PDF is a bank
 * statement or a shopping bill. It posts the file; the server classifies it,
 * reads it with the matching parser, and says in the response which kind it
 * turned out to be.
 */
async function uploadDocument(req: Request, res: Response) {
    const body = req.body as UploadBody;

    try {
        if (body.csvText?.trim()) return await readCsvUpload(req, res, body);
        if (body.pdfBase64?.trim()) return await readPdfUpload(req, res, body);

        return res.status(400).json({
            success: false,
            message: 'Upload a CSV or a PDF: send either csvText or pdfBase64.',
        });
    } catch (error) {
        if (isPasswordError(error)) {
            return res.status(401).json({
                success: false,
                message: 'This PDF is password protected. Re-send it with the password.',
                requiresPassword: true,
            });
        }

        console.error('Document import failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to read the uploaded document',
        });
    }
}

router.post('/documents', uploadDocument);

// The previous three endpoints, kept so a client mid-deploy keeps working. They
// are the same handler: what a document is gets decided by reading it, not by
// which URL it arrived at.
router.post('/upload-csv', uploadDocument);
router.post('/upload-pdf', uploadDocument);
router.post('/upload-bill', uploadDocument);

/**
 * Deletes everything this user has imported.
 *
 * Scoped to `req.user`, never to a batch id: the point is to start clean, and a
 * user who has imported the same statement three times should not have to
 * remember which batch was which. Returns the analytics of an empty account so
 * the dashboard can settle without a second round trip.
 */
router.delete('/', async (req: Request, res: Response) => {
    try {
        const { deletedCount } = await ExpenseEntryModel.deleteMany({ userId: req.user!.id });

        return res.json({
            success: true,
            message: deletedCount
                ? `Cleared ${deletedCount} imported transaction${deletedCount === 1 ? '' : 's'}`
                : 'There was nothing stored to clear',
            data: {
                deletedCount,
                analytics: buildAnalytics([]),
            },
        });
    } catch (error) {
        console.error('Clearing imported data failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to clear your imported data',
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
