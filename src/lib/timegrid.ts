// Grid <-> human labels. Days are 0-based; periods are 0-based indices into a day.

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function dayName(day: number): string {
  return DAY_NAMES[day] ?? `Day ${day + 1}`;
}
export function dayShort(day: number): string {
  return DAY_SHORT[day] ?? `D${day + 1}`;
}

/** "08:00" + minutes -> "HH:MM" (24h). */
export function addMinutes(start: string, minutes: number): string {
  const [h, m] = start.split(":").map((x) => parseInt(x, 10));
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface GridSettings {
  daysCount: number;
  periodsPerDay: number;
  periodMinutes: number;
  dayStart: string;
  lunchPeriod: number | null;
}

/** Start/end clock label for a period index. */
export function periodLabel(period: number, s: GridSettings): { start: string; end: string } {
  const start = addMinutes(s.dayStart, period * s.periodMinutes);
  const end = addMinutes(s.dayStart, (period + 1) * s.periodMinutes);
  return { start, end };
}

/** Label spanning `length` periods from `period`. */
export function spanLabel(period: number, length: number, s: GridSettings): string {
  const start = addMinutes(s.dayStart, period * s.periodMinutes);
  const end = addMinutes(s.dayStart, (period + length) * s.periodMinutes);
  return `${start}–${end}`;
}

export const ROOM_KIND_LABEL: Record<string, string> = {
  HALL: "Lecture hall",
  LAB: "Laboratory",
  SEMINAR: "Seminar room",
};
