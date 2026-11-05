import { AppError } from './errorHandler';

interface AttemptEntry {
  count: number;
  resetAt: number;
}

export class AttemptLimiter {
  private attempts = new Map<string, AttemptEntry>();

  constructor(private maxAttempts: number, private windowMs: number) {}

  assertAllowed(keys: string[], message: string) {
    const now = Date.now();
    for (const key of keys) {
      const entry = this.attempts.get(key);
      if (!entry) continue;
      if (entry.resetAt <= now) {
        this.attempts.delete(key);
        continue;
      }
      if (entry.count >= this.maxAttempts) {
        const minutes = Math.ceil((entry.resetAt - now) / 60000);
        throw new AppError(`${message} Intenta de nuevo en ${minutes} min.`, 429);
      }
    }
  }

  recordFailure(keys: string[]) {
    const now = Date.now();
    for (const key of keys) {
      const entry = this.attempts.get(key);
      if (!entry || entry.resetAt <= now) {
        this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      } else {
        entry.count += 1;
      }
    }
  }

  clear(keys: string[]) {
    for (const key of keys) this.attempts.delete(key);
  }
}

export const tenantLoginLimiter = new AttemptLimiter(8, 10 * 60 * 1000);
export const accountLoginLimiter = new AttemptLimiter(30, 30 * 60 * 1000);
export const ownerLoginLimiter = new AttemptLimiter(5, 15 * 60 * 1000);
export const masterKeyLimiter = new AttemptLimiter(5, 15 * 60 * 1000);
export const engineCommandLimiter = new AttemptLimiter(5, 15 * 60 * 1000);
export const passwordChangeLimiter = new AttemptLimiter(5, 15 * 60 * 1000);
export const passwordResetRequestLimiter = new AttemptLimiter(5, 15 * 60 * 1000);
