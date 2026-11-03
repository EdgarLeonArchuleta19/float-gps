export interface WorkSchedule {
  startHour: number;
  endHour: number;
  days: number[];
}

export const DEFAULT_SCHEDULE: WorkSchedule = { startHour: 7, endHour: 19, days: [1, 2, 3, 4, 5, 6] };

export function parseSchedule(company?: { workStartHour: number; workEndHour: number; workDays: string } | null): WorkSchedule {
  if (!company) return DEFAULT_SCHEDULE;
  const days = company.workDays
    .split(',')
    .map((d) => parseInt(d, 10))
    .filter((d) => d >= 0 && d <= 6);
  return { startHour: company.workStartHour, endHour: company.workEndHour, days };
}

// Uses the server's local time zone (the fleet's operating zone). Days follow
// Date#getDay: 0 = Sunday ... 6 = Saturday.
export function isWorkingTime(date: Date, schedule: WorkSchedule): boolean {
  if (!schedule.days.includes(date.getDay())) return false;
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= schedule.startHour && hour < schedule.endHour;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
