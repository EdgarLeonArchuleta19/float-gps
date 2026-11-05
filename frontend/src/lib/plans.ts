import type { Plan } from './types';

export const PLAN_LABELS: Record<Plan, string> = { PERSONAL: 'Personal', EMPRESA: 'Empresarial' };

export const DEFAULT_MAX_UNITS: Record<Plan, number> = { PERSONAL: 5, EMPRESA: 50 };

export function normalizePlan(value: unknown): Plan {
  return value === 'PERSONAL' ? 'PERSONAL' : 'EMPRESA';
}
