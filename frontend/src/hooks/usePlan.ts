import { useAuth } from '@/context/AuthContext';
import type { Plan } from '@/lib/types';
import { normalizePlan } from '@/lib/plans';

const PERSONAL_CLIENT_BLOCKED = ['/roles', '/users', '/geofences', '/groups'];
const OWNER_TEAM_ONLY = ['/fleet/'];

function matches(routes: string[], pathname: string) {
  return routes.some((route) => pathname === route || pathname.startsWith(route.endsWith('/') ? route : `${route}/`));
}

export function usePlan() {
  const { user, support } = useAuth();
  const plan: Plan = normalizePlan(support ? support.company.plan : user?.plan);
  const isSupport = !!support;
  const isPersonal = plan === 'PERSONAL';
  const isClientPersonal = isPersonal && !isSupport;
  return {
    plan,
    isPersonal,
    isSupport,
    isClientPersonal,
    maxUnits: isSupport ? null : user?.maxUnits ?? null,
    isBlockedRoute: (pathname: string) => (isClientPersonal && matches(PERSONAL_CLIENT_BLOCKED, pathname)) || (!isSupport && matches(OWNER_TEAM_ONLY, pathname)),
  };
}
