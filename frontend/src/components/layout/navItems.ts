import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Home, LayoutGrid, Map, Share2, Zap } from 'lucide-react-native';
import { useCan } from '@/hooks/useCan';
import type { Permission } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
  permission?: Permission;
  featured?: boolean;
}

const MAIN_TABS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home, match: ['/dashboard'], permission: 'dashboard' },
  { href: '/share', label: 'Compartir', icon: Share2, match: ['/share'], permission: 'share' },
  { href: '/live-map', label: 'Mapa', icon: Map, match: ['/live-map'], featured: true },
  { href: '/engine', label: 'Apagar', icon: Zap, match: ['/engine'], permission: 'engine' },
  {
    href: '/more',
    label: 'Más',
    icon: LayoutGrid,
    match: ['/more', '/fleet', '/units', '/tracking', '/notifications', '/geofences', '/reports', '/users', '/roles', '/config', '/profile', '/help'],
  },
];

export function useMainTabs(): NavItem[] {
  const can = useCan();
  return MAIN_TABS.filter((item) => !item.permission || can(item.permission));
}

export function isActive(item: NavItem, pathname: string) {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function goTo(item: NavItem, pathname: string) {
  if (pathname === item.href) return;
  router.replace(item.href as never);
}
