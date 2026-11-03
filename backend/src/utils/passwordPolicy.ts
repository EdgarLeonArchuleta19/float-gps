import { AppError } from '../middleware/errorHandler';

// Single source of truth for password strength. The mobile app mirrors these
// rules in its checklist, but the server is what actually enforces them.
export const PASSWORD_MIN_LENGTH = 10;
export const OWNER_PASSWORD_MIN_LENGTH = 12;

export function passwordProblems(password: string, minLength = PASSWORD_MIN_LENGTH): string[] {
  const problems: string[] = [];
  if (password.length < minLength) problems.push(`al menos ${minLength} caracteres`);
  if (!/[a-z]/.test(password)) problems.push('una minúscula');
  if (!/[A-Z]/.test(password)) problems.push('una mayúscula');
  if (!/[0-9]/.test(password)) problems.push('un número');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('un símbolo');
  if (/\s/.test(password)) problems.push('sin espacios');
  return problems;
}

export function assertStrongPassword(password: string, label = 'La contraseña', minLength = PASSWORD_MIN_LENGTH) {
  const problems = passwordProblems(password || '', minLength);
  if (problems.length) {
    throw new AppError(`${label} debe tener ${problems.join(', ')}.`, 400);
  }
}
