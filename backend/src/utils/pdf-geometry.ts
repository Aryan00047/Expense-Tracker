import type { PdfCell, PdfLine } from './pdf.js';

/**
 * Column arithmetic shared by every PDF reader.
 *
 * A PDF has no table structure — only glyphs at coordinates — so "which column
 * is this cell in" is answered by clustering x positions. Both document parsers
 * need that, and both need it to mean the same thing.
 */

export function cellCenter(cell: PdfCell): number {
    return (cell.x + cell.endX) / 2;
}

export interface Column {
    center: number;
    minX: number;
    maxX: number;
    hits: number;
}

/** How far two cell centres may sit apart and still be the same column. */
export const COLUMN_TOLERANCE = 18;

export function clusterColumns(centers: number[], tolerance = COLUMN_TOLERANCE): Column[] {
    const columns: Column[] = [];

    for (const center of [...centers].sort((a, b) => a - b)) {
        const last = columns[columns.length - 1];

        if (last && center - last.center <= tolerance) {
            last.center = (last.center * last.hits + center) / (last.hits + 1);
            last.minX = Math.min(last.minX, center);
            last.maxX = Math.max(last.maxX, center);
            last.hits += 1;
            continue;
        }

        columns.push({ center, minX: center, maxX: center, hits: 1 });
    }

    return columns;
}

export function nearestColumn(columns: Column[], center: number): number {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    columns.forEach((column, index) => {
        const distance = Math.abs(column.center - center);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
}

/**
 * The cell sitting directly under `label` on the next line.
 *
 * Grid layouts put a caption in one row and its value in the row below, and
 * reading order will not connect the two — only column position will.
 */
export function cellBelow(lines: PdfLine[], lineIndex: number, label: PdfCell): PdfCell | null {
    const next = lines[lineIndex + 1];
    if (!next || !next.cells.length) return null;

    const labelCentre = cellCenter(label);

    return [...next.cells].sort(
        (a, b) => Math.abs(cellCenter(a) - labelCentre) - Math.abs(cellCenter(b) - labelCentre)
    )[0];
}
