import type { PdfCell, PdfLine } from './pdf.js';
import { parseAmount } from './csv.js';

/**
 * One answer to "is this cell a figure, and how sure are we?".
 *
 * Both document parsers need this and both used to carry their own version —
 * the statement reader scored cells, the bill reader ran `parseAmount` and then
 * re-tested the raw text for decimals. Two definitions of money in one codebase
 * is one too many: they agreed today and would have drifted tomorrow.
 */
export type MoneyStrength = 'strong' | 'weak' | 'none';

const CURRENCY_RE = /(?:₹|rs\.?|inr|\$|€|£)/i;
const SUFFIX_RE = /\s*(?:dr|cr|db)\.?$/i;
const NUMERIC_RE = /^-?\(?\d[\d,]*(?:\.\d{1,2})?\)?-?$/;

/**
 * `strong` means the cell reads as currency — it carries decimals, thousands
 * grouping or a currency mark. `weak` means it is a bare integer, which is just
 * as likely to be a quantity, a serial number or a page number.
 */
export function moneyStrength(raw: string): MoneyStrength {
    const trimmed = raw.trim();
    if (!trimmed) return 'none';

    const hasCurrency = CURRENCY_RE.test(trimmed);
    const body = trimmed.replace(CURRENCY_RE, '').replace(SUFFIX_RE, '').trim();

    if (!NUMERIC_RE.test(body)) return 'none';

    if (hasCurrency || /\.\d{1,2}\)?-?$/.test(body) || /\d,\d{2,3}/.test(body)) {
        return 'strong';
    }

    return 'weak';
}

/**
 * A figure at the start of a cell that also carries words — "1500.00 (ONE
 * THOUSAND FIVE HUNDRED ONLY)", which is how government and utility receipts
 * print an amount.
 *
 * Deliberately narrow, because scanning cells for numbers is exactly the bug
 * this module exists to avoid. Three conditions must all hold: the figure is at
 * the very start, it has decimals (so a serial number or a bare count cannot
 * qualify), and nothing after it contains another digit — two numbers in one
 * cell means two columns were glued together and guessing which is the amount
 * would be worse than reading none.
 */
const LEADING_MONEY_RE = /^((?:₹|rs\.?|inr|\$|€|£)?\s*\d[\d,]*\.\d{1,2})(?=\s|$)/i;

function leadingMoney(raw: string): { value: number } | null {
    const trimmed = raw.trim();
    const match = trimmed.match(LEADING_MONEY_RE);
    if (!match) return null;

    if (/\d/.test(trimmed.slice(match[0].length))) return null;

    const value = parseAmount(match[1]);
    return value === null ? null : { value };
}

export interface MoneyCell {
    cell: PdfCell;
    /** Position within `line.cells`, so callers can exclude it from the description. */
    index: number;
    value: number;
    strength: MoneyStrength;
}

/**
 * Money cells on a line, left to right.
 *
 * Deliberately cell-based rather than a regex over the line text: scanning text
 * turns "Invoice No: INV-2026-0417" into the numbers 2026 and 417, and
 * "12.03.2026" into 12.03 — which is how a date and a reference number end up
 * being read as an amount. A cell that is *entirely* a number is a number.
 */
export function moneyCells(line: PdfLine): MoneyCell[] {
    const found: MoneyCell[] = [];

    line.cells.forEach((cell, index) => {
        const strength = moneyStrength(cell.text);

        if (strength === 'none') {
            const leading = leadingMoney(cell.text);
            if (leading) found.push({ cell, index, value: leading.value, strength: 'strong' });
            return;
        }

        const value = parseAmount(cell.text);
        if (value === null) return;

        found.push({ cell, index, value, strength });
    });

    return found;
}

/** Strips a currency mark and a trailing Dr/Cr so the caller can read the figure. */
export function stripMoneyMarkers(raw: string): { body: string; suffix: 'dr' | 'cr' | null } {
    const value = raw.replace(CURRENCY_RE, '').trim();
    const suffix = value.match(/(dr|cr)\.?$/i)?.[1]?.toLowerCase();

    return {
        body: value.replace(SUFFIX_RE, '').trim(),
        suffix: suffix === 'dr' || suffix === 'cr' ? suffix : null,
    };
}
