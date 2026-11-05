import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!#$%*?@';

function pick(chars: string, count: number) {
  return Array.from({ length: count }, () => chars[crypto.randomInt(chars.length)]);
}

// Temporary passwords skip look-alike characters (0/O, 1/l/I) so they can be
// typed from an email, and always satisfy the policy below.
export function generateTemporaryPassword() {
  const chars = [...pick(UPPER, 3), ...pick(LOWER, 6), ...pick(DIGITS, 3), ...pick(SYMBOLS, 2)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Single source of truth for password strength. The mobile app mirrors these
// rules in its checklist, but the server is what actually enforces them.
export const PASSWORD_MIN_LENGTH = 10;
export const STAFF_PASSWORD_MIN_LENGTH = 12;

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
