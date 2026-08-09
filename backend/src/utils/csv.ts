export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = '';

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

/**
 * Aliases are matched in priority order, not column order. Several alias lists
 * overlap (both "amount" and "debit" identify a spend column), so scanning
 * columns first would let a lower-priority alias shadow the intended one.
 */
export function findHeaderIndex(
  headers: string[],
  aliases: string[]
): number {
  const normalized = headers.map(normalizeHeader);

  // Real headers are rarely bare words — "Withdrawal Amount (INR)",
  // "Debit Amt.", "Transaction Date". Exact matches are tried across every
  // alias first so a precise hit always beats a loose one, then prefix, then
  // whole-word containment.
  const stages: Array<(header: string, alias: string) => boolean> = [
    (header, alias) => header === alias,
    (header, alias) => header.startsWith(`${alias} `) || header.startsWith(`${alias}(`),
    (header, alias) => new RegExp(`(?<![a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(header),
  ];

  for (const matches of stages) {
    for (const alias of aliases) {
      const index = normalized.findIndex((header) => matches(header, alias));
      if (index !== -1) return index;
    }
  }

  return -1;
}

/** 1.234,56 — European/Latin grouping, where the comma is the decimal mark. */
const EURO_DECIMAL_RE = /^-?\d{1,3}(?:\.\d{3})+,\d{1,2}$/;

export function parseAmount(value: string): number | null {
  let trimmed = value.trim();
  if (!trimmed) return null;

  // Dr/Cr markers ride along with the number in many statements; the caller
  // decides what they mean, so they must not break the numeric parse.
  trimmed = trimmed.replace(/\s*\b(?:dr|cr|db)\.?$/i, '').trim();
  if (!trimmed) return null;

  const negative =
    /^\(.*\)$/.test(trimmed) || trimmed.startsWith('-') || trimmed.endsWith('-');

  let body = trimmed
    .replace(/^\((.*)\)$/, '$1')
    .replace(/[₹$€£¥\s]|(?:^|\b)(?:inr|rs)\.?\b/gi, '')
    .replace(/^-|-$/g, '')
    .trim();

  if (!body) return null;

  body = EURO_DECIMAL_RE.test(body)
    ? body.replace(/\./g, '').replace(',', '.')
    : body.replace(/,/g, '');

  // Number('') is 0 and Number('12abc') is NaN, but Number('1e5') is 100000 —
  // reject anything that is not plainly a decimal figure.
  if (!/^\d+(?:\.\d+)?$/.test(body)) return null;

  const amount = Number(body);
  if (!Number.isFinite(amount)) return null;

  return negative ? -amount : amount;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function buildDate(year: number, month: number, day: number): Date | null {
  const parsed = new Date(year, month, day);
  parsed.setHours(0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

/**
 * A two-digit year is only ever ambiguous by a century. Statements are
 * historical documents, so we allow a small window into the future (post-dated
 * rows, clock skew) and push anything beyond it back a hundred years.
 */
function expandTwoDigitYear(yy: number): number {
  const currentYear = new Date().getFullYear();
  const candidate = Math.floor(currentYear / 100) * 100 + yy;

  return candidate > currentYear + 20 ? candidate - 100 : candidate;
}

function monthFromName(name: string): number | undefined {
  const key = name.toLowerCase();
  return MONTH_NAMES[key.slice(0, 4)] ?? MONTH_NAMES[key.slice(0, 3)];
}

/**
 * Whether the day and month components come first. Real statements disagree —
 * Indian banks write 30.07.2026, US exporters write 07/30/2026 — and a single
 * cell often cannot tell you which, so the order is decided per statement by
 * {@link detectDateOrder} and passed in here.
 */
export type DateOrder = 'dmy' | 'mdy';

/** Strips a trailing clock time, timezone, and leading weekday name. */
function stripTimeAndNoise(value: string): string {
  return value
    .replace(/^(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?,?\s+/i, '')
    .replace(
      /[\s,tT]+\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:[ap]\.?m\.?)?\s*(?:z|utc|gmt|[+-]\d{2}:?\d{2})?$/i,
      ''
    )
    .trim();
}

const ISO_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const NUMERIC_TRIPLE_RE = /^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})$/;
const DAY_FIRST_NAMED_RE = /^(\d{1,2})(?:st|nd|rd|th)?[\s/.-]+([A-Za-z]{3,9})\.?[\s/.,-]+(\d{2,4})$/;
const MONTH_FIRST_NAMED_RE = /^([A-Za-z]{3,9})\.?[\s/.-]+(\d{1,2})(?:st|nd|rd|th)?[\s/.,-]+(\d{2,4})$/;
const COMPACT_RE = /^(\d{8})$/;

/**
 * Parses one date cell. Returns null — never a guess — for anything that is not
 * unambiguously a date.
 *
 * The old implementation ended with `new Date(value)`, which happily read the
 * serial-number column of a bank statement: V8 turns "48" into 1 Jan 2048. That
 * is where the bogus 2048/2049 months came from, so there is deliberately no
 * free-form fallback here.
 */
export function parseCsvDate(value: string, order: DateOrder = 'dmy'): Date | null {
  const trimmed = stripTimeAndNoise(value.trim());
  if (!trimmed || trimmed.length > 32) return null;

  // 2026-01-31 style ISO dates are unambiguous and must never be re-ordered.
  const iso = trimmed.match(ISO_RE);
  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  // 01 Jan 2026, 01-Jan-26, Jan 01, 2026 — common in PDF bank statements.
  const dayFirst = trimmed.match(DAY_FIRST_NAMED_RE);
  const monthFirst = dayFirst ? null : trimmed.match(MONTH_FIRST_NAMED_RE);
  const named = dayFirst
    ? { day: dayFirst[1], monthName: dayFirst[2], year: dayFirst[3] }
    : monthFirst
      ? { day: monthFirst[2], monthName: monthFirst[1], year: monthFirst[3] }
      : null;

  if (named) {
    const month = monthFromName(named.monthName);
    if (month === undefined) return null;

    const rawYear = Number(named.year);
    const year = named.year.length <= 2 ? expandTwoDigitYear(rawYear) : rawYear;

    return buildDate(year, month, Number(named.day));
  }

  const triple = trimmed.match(NUMERIC_TRIPLE_RE);
  if (triple) {
    const first = Number(triple[1]);
    const second = Number(triple[2]);
    const rawYear = Number(triple[3]);
    const year = triple[3].length <= 2 ? expandTwoDigitYear(rawYear) : rawYear;

    // Try the statement's detected order first, then the other one: a single
    // 13/01/2026 row inside an mm/dd statement is still a January date.
    const preferred =
      order === 'mdy'
        ? [{ day: second, month: first }, { day: first, month: second }]
        : [{ day: first, month: second }, { day: second, month: first }];

    for (const candidate of preferred) {
      const parsed = buildDate(year, candidate.month - 1, candidate.day);
      if (parsed) return parsed;
    }

    return null;
  }

  // 20260131 / 31012026 — used by a few exporters. A leading 19xx/20xx is the
  // only reliable way to tell the two apart.
  const compact = trimmed.match(COMPACT_RE);
  if (compact) {
    const digits = compact[1];

    if (/^(?:19|20)/.test(digits)) {
      const parsed = buildDate(
        Number(digits.slice(0, 4)),
        Number(digits.slice(4, 6)) - 1,
        Number(digits.slice(6, 8))
      );
      if (parsed) return parsed;
    }

    return buildDate(
      Number(digits.slice(4, 8)),
      Number(digits.slice(2, 4)) - 1,
      Number(digits.slice(0, 2))
    );
  }

  return null;
}

/**
 * Reads the whole statement before committing to dd/mm or mm/dd.
 *
 * Any component above 12 settles it outright; when every row is ambiguous
 * (03/04/2026 …) we keep day-first, which is what Indian and European banks
 * emit and what this app is primarily used with.
 */
export function detectDateOrder(samples: string[]): DateOrder {
  let dayFirstEvidence = 0;
  let monthFirstEvidence = 0;

  for (const sample of samples) {
    const triple = stripTimeAndNoise(sample.trim()).match(NUMERIC_TRIPLE_RE);
    if (!triple) continue;

    const first = Number(triple[1]);
    const second = Number(triple[2]);

    if (first > 12 && second <= 12) dayFirstEvidence += 1;
    else if (second > 12 && first <= 12) monthFirstEvidence += 1;
  }

  return monthFirstEvidence > dayFirstEvidence ? 'mdy' : 'dmy';
}

const MONTH_WORD = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';

/**
 * Date shapes, searched for *inside* free text such as "Invoice Date: 12.03.2026".
 *
 * The month alternative names the months explicitly. Accepting any 3-9 letter
 * word there made "Bill No 4471182 Date 22/07/2026" match as "82 Date 22" — the
 * engine takes the leftmost match, so a greedy pattern wins before the real
 * date is ever reached. The \b anchors stop a match starting mid-number.
 */
const DATE_IN_TEXT_RE = new RegExp(
  '\\b(' +
    '\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}' +
    '|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}' +
    `|\\d{1,2}(?:st|nd|rd|th)?[\\s-]?${MONTH_WORD}\\.?[\\s,-]?\\d{2,4}` +
    `|${MONTH_WORD}\\.?[\\s-]?\\d{1,2}(?:st|nd|rd|th)?[\\s,-]+\\d{2,4}` +
    ')\\b',
  'gi'
);

/**
 * Pulls a date out of a labelled line such as "Invoice Date: 12.03.2026".
 *
 * Bills label their date instead of columning it, so unlike
 * {@link looksLikeStatementDate} this searches within the text rather than
 * asking whether the whole cell is a date.
 */
export function dateInText(text: string): Date | null {
  for (const match of text.match(DATE_IN_TEXT_RE) || []) {
    const parsed = parseCsvDate(match);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Cheap structural test used to find the date column in a PDF. Unlike
 * {@link parseCsvDate} this never accepts a bare integer, so serial-number and
 * reference columns cannot masquerade as dates.
 */
export function looksLikeStatementDate(value: string): boolean {
  const trimmed = stripTimeAndNoise(value.trim());
  if (!trimmed || trimmed.length > 32) return false;

  const structured =
    ISO_RE.test(trimmed) ||
    NUMERIC_TRIPLE_RE.test(trimmed) ||
    DAY_FIRST_NAMED_RE.test(trimmed) ||
    MONTH_FIRST_NAMED_RE.test(trimmed);

  if (!structured) return false;

  return parseCsvDate(trimmed) !== null || parseCsvDate(trimmed, 'mdy') !== null;
}
