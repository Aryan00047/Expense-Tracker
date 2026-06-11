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

export function findHeaderIndex(
  headers: string[],
  aliases: string[]
): number {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/[₹$€£,\s]/g, '')
    .replace(/^\((.*)\)$/, '-$1');

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount;
}

export function parseCsvDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (dateMatch) {
    const first = Number(dateMatch[1]);
    const second = Number(dateMatch[2]);
    let year = Number(dateMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    // Prefer dd-mm-yyyy for bank statement style dates like 01-05-2026.
    const candidates: Array<{ day: number; month: number }> = [];
    candidates.push({ day: first, month: second });

    if (first <= 12 && second <= 12 && first !== second) {
      candidates.push({ day: second, month: first });
    }

    for (const candidate of candidates) {
      const parsed = new Date(year, candidate.month - 1, candidate.day);
      parsed.setHours(0, 0, 0, 0);

      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === candidate.month - 1 &&
        parsed.getDate() === candidate.day
      ) {
        return parsed;
      }
    }

    return null;
  }

  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime())) {
    isoCandidate.setHours(0, 0, 0, 0);
    return isoCandidate;
  }

  return null;
}
