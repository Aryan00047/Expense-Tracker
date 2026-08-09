import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfCell {
  text: string;
  x: number;
  endX: number;
}

export interface PdfLine {
  page: number;
  y: number;
  text: string;
  cells: PdfCell[];
}

export interface PdfExtraction {
  pageCount: number;
  lines: PdfLine[];
  isEncrypted: boolean;
  hasText: boolean;
}

/**
 * Text items on the same visual row rarely share an identical baseline, so we
 * bucket them with a small tolerance before turning a row into cells.
 */
const LINE_TOLERANCE = 2.5;

/**
 * Horizontal gap (in PDF units) that we treat as a column separator rather than
 * a word space. Bank statements usually leave 6-10 units between columns.
 */
const COLUMN_GAP = 6;

interface RawItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

function groupItemsIntoLines(items: RawItem[], page: number): PdfLine[] {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > LINE_TOLERANCE) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lines: PdfLine[] = [];
  let currentItems: RawItem[] = [];
  let currentY: number | null = null;

  const flush = () => {
    if (!currentItems.length) return;

    const cells: PdfCell[] = [];

    for (const item of currentItems) {
      const previous = cells[cells.length - 1];
      const gap = previous ? item.x - previous.endX : Number.POSITIVE_INFINITY;

      if (previous && gap < COLUMN_GAP) {
        previous.text = gap > 0.6 ? `${previous.text} ${item.str}` : previous.text + item.str;
        previous.endX = Math.max(previous.endX, item.x + item.width);
        continue;
      }

      cells.push({
        text: item.str,
        x: item.x,
        endX: item.x + item.width,
      });
    }

    const cleaned = cells
      .map((cell) => ({ ...cell, text: cell.text.replace(/\s+/g, ' ').trim() }))
      .filter((cell) => cell.text.length > 0);

    if (cleaned.length) {
      lines.push({
        page,
        y: currentY ?? 0,
        text: cleaned.map((cell) => cell.text).join(' '),
        cells: cleaned,
      });
    }

    currentItems = [];
  };

  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= LINE_TOLERANCE) {
      currentY = currentY === null ? item.y : currentY;
      currentItems.push(item);
      continue;
    }

    flush();
    currentY = item.y;
    currentItems.push(item);
  }

  flush();

  return lines;
}

export async function extractPdfLines(
  data: Uint8Array,
  password?: string
): Promise<PdfExtraction> {
  const loadingTask = getDocument({
    data,
    password,
    // Server side rendering never needs fonts, eval, or worker threads.
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
    useWorkerFetch: false,
  });

  const document = await loadingTask.promise;
  const lines: PdfLine[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      const items: RawItem[] = [];

      for (const item of content.items) {
        if (!('str' in item)) continue;
        const str = item.str;
        if (!str || !str.trim()) continue;

        items.push({
          str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
        });
      }

      lines.push(...groupItemsIntoLines(items, pageNumber));
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  return {
    pageCount: document.numPages,
    lines,
    isEncrypted: false,
    hasText: lines.length > 0,
  };
}

export function isPasswordError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name || '';
  const message = (error as { message?: string } | null)?.message || '';
  return (
    name === 'PasswordException' ||
    /password/i.test(message)
  );
}
