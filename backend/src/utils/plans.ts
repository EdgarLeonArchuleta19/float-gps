export type Plan = 'PERSONAL' | 'EMPRESA';

export const PLANS: readonly Plan[] = ['PERSONAL', 'EMPRESA'];

// Older companies were created with labels like PRO or ENTERPRISE; anything
// that is not explicitly PERSONAL keeps the full business plan.
export function normalizePlan(value: unknown): Plan {
  return value === 'PERSONAL' ? 'PERSONAL' : 'EMPRESA';
}

export const DEFAULT_MAX_UNITS: Record<Plan, number> = { PERSONAL: 5, EMPRESA: 50 };

export const PLAN_LABELS: Record<Plan, string> = { PERSONAL: 'Personal', EMPRESA: 'Empresarial' };

export const PERSONAL_LIMITS = {
  users: 1,
  historyDays: 30,
} as const;

export function historyCutoff(plan: Plan): Date | null {
  if (plan !== 'PERSONAL') return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERSONAL_LIMITS.historyDays);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}
