import type { User } from './types';

export function userInitials(user: User | null | undefined): string {
  return (user?.name || user?.email || '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
