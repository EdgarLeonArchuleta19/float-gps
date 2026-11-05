import { AppError } from '../middleware/errorHandler';

export function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new AppError(`${label} es obligatorio`, 400);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new AppError(`${label} debe tener entre ${min} y ${max} caracteres`, 400);
  return trimmed;
}

export function number(value: unknown, label: string, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new AppError(`${label} no es válido`, 400);
  return parsed;
}
