import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Bell, CircleDot, FileBarChart, HelpCircle, Home, LayoutGrid, Map, Settings, Share2, Truck, Users, Zap } from 'lucide-react-native';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
  adminOnly?: boolean;
  featured?: boolean;
}

export const MOBILE_TABS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home, match: ['/dashboard'] },
  { href: '/share', label: 'Compartir', icon: Share2, match: ['/share'] },
  { href: '/live-map', label: 'Mapa', icon: Map, match: ['/live-map'], featured: true },
  { href: '/engine', label: 'Apagar', icon: Zap, match: ['/engine'] },
  {
    href: '/more',
    label: 'Más',
    icon: LayoutGrid,
    match: ['/more', '/fleet', '/units', '/tracking', '/notifications', '/geofences', '/reports', '/users', '/config', '/profile', '/help'],
  },
];

interface NavGroup {
  key: string;
  title?: string;
  items: NavItem[];
}

export const DESKTOP_GROUPS: NavGroup[] = [
  { key: 'home', items: [{ href: '/dashboard', label: 'Inicio', icon: Home, match: ['/dashboard'] }] },
  {
    key: 'operation',
    title: 'Operación',
    items: [
      { href: '/live-map', label: 'Mapa en vivo', icon: Map, match: ['/live-map', '/tracking'] },
      { href: '/share', label: 'Compartir', icon: Share2, match: ['/share'] },
      { href: '/engine', label: 'Apagar', icon: Zap, match: ['/engine'] },
    ],
  },
  {
    key: 'fleet',
    title: 'Flota',
    items: [
      { href: '/fleet', label: 'Unidades', icon: Truck, match: ['/fleet', '/units'] },
      { href: '/geofences', label: 'Geocercas', icon: CircleDot, match: ['/geofences'] },
      { href: '/notifications', label: 'Alertas', icon: Bell, match: ['/notifications'] },
    ],
  },
  {
    key: 'analysis',
    title: 'Análisis',
    items: [{ href: '/reports', label: 'Reportes', icon: FileBarChart, match: ['/reports'] }],
  },
  {
    key: 'admin',
    title: 'Administración',
    items: [
      { href: '/users', label: 'Usuarios', icon: Users, match: ['/users'], adminOnly: true },
      { href: '/config', label: 'Configuración', icon: Settings, match: ['/config', '/profile'] },
      { href: '/help', label: 'Ayuda', icon: HelpCircle, match: ['/help'] },
    ],
  },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function goTo(item: NavItem, pathname: string) {
  if (pathname === item.href) return;
  router.replace(item.href as never);
}
