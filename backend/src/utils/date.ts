/**
 * Statement dates are parsed and stored as local midnight, so they must also be
 * formatted with local getters. Using toISOString() here shifts every date back
 * a day for any timezone ahead of UTC.
 */
export function toLocalDayKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export function toLocalMonthKey(date: Date): string {
  return toLocalDayKey(date).slice(0, 7);
}

export function getTodayDDMMYYYY(): string {
  const now = new Date();

  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

export function isValidDDMMYYYY(date: string): boolean {
  if (!/^\d{8}$/.test(date)) return false;

  const dd = Number(date.slice(0, 2));
  const mm = Number(date.slice(2, 4));
  const yyyy = Number(date.slice(4, 8));

  const d = new Date(yyyy, mm - 1, dd);

  return (
    d.getFullYear() === yyyy &&
    d.getMonth() === mm - 1 &&
    d.getDate() === dd
  );
}

/**
 * Convert ddmmyyyy → Date (00:00 local time)
 */
export function parseDDMMYYYY(date: string): Date {
  const dd = Number(date.slice(0, 2));
  const mm = Number(date.slice(2, 4)) - 1;
  const yyyy = Number(date.slice(4, 8));

  const d = new Date(yyyy, mm, dd);
  d.setHours(0, 0, 0, 0);

  return d;
}
