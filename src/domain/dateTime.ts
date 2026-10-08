const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
export const TIME_ZONE = "Asia/Bangkok";

function validInstant(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error("วันที่หรือเวลาไม่ถูกต้อง");
  return date;
}

/** Bangkok has a fixed UTC+7 offset and no daylight saving; never use device-local getters. */
export function bangkokDate(instant: Date | string): string {
  return new Date(validInstant(instant).getTime() + BANGKOK_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function bangkokTime(instant: Date | string): string {
  return new Date(validInstant(instant).getTime() + BANGKOK_OFFSET_MS)
    .toISOString()
    .slice(11, 16);
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function isValidTime(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function localToInstant(date: string, time: string): string {
  if (!isValidDate(date) || !isValidTime(time))
    throw new Error("กรุณาระบุวันที่และเวลาให้ถูกต้อง");
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

export function addDays(date: string, n: number): string {
  if (!isValidDate(date) || !Number.isInteger(n))
    throw new Error("วันที่ไม่ถูกต้อง");
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function weekday(date: string): number {
  if (!isValidDate(date)) throw new Error("วันที่ไม่ถูกต้อง");
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function thaiDate(dateOrInstant: string): string {
  const date = isValidDate(dateOrInstant)
    ? localToInstant(dateOrInstant, "12:00")
    : dateOrInstant;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(validInstant(date));
}
