import { AppError } from '../middleware/errorHandler';

// Each working day has its own hours, in minutes since midnight. Days follow
// Date#getDay: 0 = Sunday ... 6 = Saturday. Days not listed are non-working.
export interface DaySchedule {
  day: number;
  start: number;
  end: number;
}

export interface WorkSchedule {
  days: DaySchedule[];
}

const STEP_MINUTES = 30;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_SCHEDULE: WorkSchedule = {
  days: [1, 2, 3, 4, 5, 6].map((day) => ({ day, start: 7 * 60, end: 19 * 60 })),
};

function sortDays(days: DaySchedule[]) {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

function validDay(value: any): value is DaySchedule {
  return (
    !!value &&
    Number.isInteger(value.day) &&
    value.day >= 0 &&
    value.day <= 6 &&
    Number.isInteger(value.start) &&
    Number.isInteger(value.end) &&
    value.start >= 0 &&
    value.end <= 24 * 60 &&
    value.start < value.end &&
    value.start % STEP_MINUTES === 0 &&
    value.end % STEP_MINUTES === 0
  );
}

export function parseSchedule(stored: unknown): WorkSchedule {
  const days = (stored as WorkSchedule | null)?.days;
  if (!Array.isArray(days)) return DEFAULT_SCHEDULE;
  return { days: sortDays(days.filter(validDay).map(({ day, start, end }) => ({ day, start, end }))) };
}

export function validateSchedule(input: unknown): WorkSchedule {
  const days = (input as { days?: unknown } | null)?.days;
  if (!Array.isArray(days)) throw new AppError('El horario no es válido', 400);
  const seen = new Set<number>();
  const clean: DaySchedule[] = [];
  for (const raw of days) {
    const entry = { day: Number(raw?.day), start: Number(raw?.start), end: Number(raw?.end) };
    if (!validDay(entry)) throw new AppError('Cada día laboral necesita una hora de entrada menor a la de salida, en intervalos de 30 minutos', 400);
    if (seen.has(entry.day)) throw new AppError('Un día aparece repetido en el horario', 400);
    seen.add(entry.day);
    clean.push(entry);
  }
  if (!clean.length) throw new AppError('Selecciona al menos un día laboral', 400);
  return { days: sortDays(clean) };
}

// Uses the server's local time zone (the fleet's operating zone).
export function isWorkingTime(date: Date, schedule: WorkSchedule): boolean {
  const today = schedule.days.find((d) => d.day === date.getDay());
  if (!today) return false;
  const minute = date.getHours() * 60 + date.getMinutes();
  return minute >= today.start && minute < today.end;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
