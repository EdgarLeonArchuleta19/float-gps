import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { ArchiveRestore, Building2, LogOut, Plus, Radio, Receipt, RefreshCw, ScrollText, Users, UsersRound } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Button, Card, ErrorBanner, Field, Loading, Screen, Sheet, Stat } from '@/components/ui';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import type { StaffPermission } from '@/lib/staff';
import {
  consoleApi,
  type AuditLog,
  type ConsoleCompany,
  type ConsoleGps,
  type ConsoleMetrics,
  type CustomerUser,
  type SubscriptionMetrics,
  type SubscriptionRow,
  type TeamMember,
  type TrashItem,
} from './consoleApi';
import CompaniesTab from './CompaniesTab';
import SubscriptionsTab, { formatMoney } from './SubscriptionsTab';
import UsersTab from './UsersTab';
import GpsTab from './GpsTab';
import TeamTab from './TeamTab';
import TrashTab from './TrashTab';
import AuditTab from './AuditTab';
import CompanyFormSheet from './CompanyFormSheet';
import UserFormSheet from './UserFormSheet';
import GpsFormSheet from './GpsFormSheet';
import ResetPasswordSheet, { TemporaryPassword } from './ResetPasswordSheet';
import SubscriptionSheet from './SubscriptionSheet';
import SupportReasonSheet from './SupportReasonSheet';
import TeamMemberSheet from './TeamMemberSheet';
import AccountSheet from './AccountSheet';
import ConfirmPasswordSheet, { type ProtectedAction } from './ConfirmPasswordSheet';
import ConsoleSidebar, { type ConsoleNavItem } from './ConsoleSidebar';
import ConsoleTopBar from './ConsoleTopBar';
import CustomerSheet, { type CustomerSection } from './CustomerSheet';
import GpsLinkSheet from './GpsLinkSheet';
import FilterSelect from '@/components/shared/FilterSelect';
import { auditFilters, companyFilters, gpsFilters, subscriptionFilters, teamFilters, trashFilters, userFilters, type ListFilter } from './consoleFilters';

type Tab = 'companies' | 'subscriptions' | 'users' | 'gps' | 'team' | 'trash' | 'audit';

function applyFilters<T>(items: T[], defs: ListFilter<T>[], values: Record<string, string>, prefix: string) {
  const valueOf = (name: string) => values[`${prefix}.${name}`] || 'all';
  const active = defs.filter((d) => valueOf(d.name) !== 'all');
  return {
    rows: items.filter((item) => active.every((d) => d.match(item, valueOf(d.name)))),
    controls: defs
      .filter((d) => d.options.length > 0)
      .map((d) => ({
        name: d.name,
        label: d.label,
        value: valueOf(d.name),
        options: [{ value: 'all', label: 'Todos', count: items.length }, ...d.options.map((o) => ({ ...o, count: items.filter((i) => d.match(i, o.value)).length }))],
      })),
  };
}

const TAB_HINTS: Record<Tab, string> = {
  companies: 'Clientes Personal y Empresarial',
  subscriptions: 'Planes, precios y cobranza',
  users: 'Administradores de cada cliente',
  gps: 'Equipos, clientes y unidades',
  team: 'Personal de floaGPS y sus roles',
  trash: 'Registros borrados que se pueden restaurar',
  audit: 'Todo lo que pasa en la consola',
};

const TAB_PERMISSION: Record<Tab, StaffPermission> = {
  companies: 'companies',
  subscriptions: 'billing',
  users: 'customers',
  gps: 'gps',
  team: 'team',
  trash: 'trash',
  audit: 'audit',
};

export default function ConsoleScreen() {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const toast = useToast();
  const confirm = useConfirm();
  const { staff, restoring, logout, enterSupport } = useAuth();
  const can = useCallback((p: StaffPermission) => !!staff?.permissions.includes(p), [staff]);
  const [tab, setTab] = useState<Tab>('companies');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<ConsoleCompany[]>([]);
  const [metrics, setMetrics] = useState<ConsoleMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [billing, setBilling] = useState<SubscriptionMetrics | null>(null);
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [devices, setDevices] = useState<ConsoleGps[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [form, setForm] = useState<'company' | 'user' | 'gps' | 'member' | 'account' | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [resetUser, setResetUser] = useState<CustomerUser | null>(null);
  const [subscriptionRow, setSubscriptionRow] = useState<SubscriptionRow | null>(null);
  const [supportCompany, setSupportCompany] = useState<ConsoleCompany | null>(null);
  const [protectedAction, setProtectedAction] = useState<ProtectedAction | null>(null);
  const [temporary, setTemporary] = useState<{ name: string; password: string } | null>(null);
  const [customer, setCustomer] = useState<{ company: ConsoleCompany; section: CustomerSection } | null>(null);
  const [linking, setLinking] = useState<ConsoleGps | null>(null);

  useEffect(() => {
    document.title = 'floaGPS Admin';
  }, []);

  const loadAll = useCallback(async () => {
    if (!staff) return;
    setLoading(true);
    const has = (p: StaffPermission) => staff.permissions.includes(p);
    try {
      const [ov, subs, us, gp, tm, tr] = await Promise.all([
        consoleApi.overview(),
        has('billing') ? consoleApi.subscriptions() : Promise.resolve(null),
        has('customers') ? consoleApi.listUsers() : Promise.resolve([]),
        has('gps') ? consoleApi.listGps() : Promise.resolve([]),
        has('team') ? consoleApi.team() : Promise.resolve([]),
        has('trash') ? consoleApi.trash() : Promise.resolve([]),
      ]);
      setCompanies(ov.companies || []);
      setMetrics(ov.metrics);
      setSubscriptions(subs?.rows || []);
      setBilling(subs?.metrics || null);
      setUsers(us);
      setDevices(gp);
      setTeam(tm);
      setTrash(tr);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar la consola');
    } finally {
      setLoading(false);
    }
  }, [staff]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      setLogs(await consoleApi.auditLogs(300));
    } catch (err: any) {
      toast(err.message || 'Error al cargar la bitácora', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (staff && tab === 'audit') loadLogs();
  }, [staff, tab, loadLogs]);

  const q = search.trim().toLowerCase();
  const view = useMemo(() => {
    const has = (values: (string | null | undefined)[]) => !q || values.some((v) => v?.toLowerCase().includes(q));
    switch (tab) {
      case 'companies':
        return applyFilters(companies.filter((c) => has([c.name, c.contactEmail, c.contactPhone])), companyFilters(), filters, tab);
      case 'subscriptions':
        return applyFilters(subscriptions.filter((r) => has([r.company.name])), subscriptionFilters(), filters, tab);
      case 'users':
        return applyFilters(users.filter((u) => has([u.name, u.email, u.company?.name])), userFilters(users), filters, tab);
      case 'gps':
        return applyFilters(devices.filter((g) => has([g.imei, g.model, g.simNumber, g.company?.name, g.vehicle?.name, g.vehicle?.plate, g.machine?.name])), gpsFilters(devices), filters, tab);
      case 'team':
        return applyFilters(team.filter((m) => has([m.name, m.email])), teamFilters(), filters, tab);
      case 'trash':
        return applyFilters(trash.filter((r) => has([r.label, r.detail, r.companyName])), trashFilters(trash), filters, tab);
      default:
        return applyFilters(logs.filter((l) => has([l.action, l.actorEmail, l.ip])), auditFilters(), filters, tab);
    }
  }, [tab, companies, subscriptions, users, devices, team, trash, logs, q, filters]);

  const { pageItems, pager } = usePagination(view.rows as unknown[], `${tab}|${q}|${JSON.stringify(filters)}`, tab === 'companies' ? 12 : 25);

  if (restoring) return <Loading />;
  if (!staff) return <Redirect href="/console-login" />;

  const startSupport = async (c: ConsoleCompany, reason: string) => {
    try {
      const session = await consoleApi.startSupport(c.id, reason);
      await enterSupport(session);
      setSupportCompany(null);
      toast(`Modo Soporte: ${session.company.name}`, 'info');
      router.replace('/live-map');
    } catch (err: any) {
      toast(err.message || 'No se pudo iniciar el Modo Soporte', 'error');
    }
  };

  const withPassword = (action: Omit<ProtectedAction, 'run'> & { run: (password: string) => Promise<unknown>; done?: string }) =>
    setProtectedAction({
      ...action,
      run: async (password) => {
        await action.run(password);
        if (action.done) toast(action.done, 'success');
        loadAll();
      },
    });

  const toggleCompany = (c: ConsoleCompany) =>
    withPassword({
      title: c.isActive ? `Suspender ${c.name}` : `Reactivar ${c.name}`,
      description: c.isActive
        ? 'Sus usuarios ya no podrán entrar a la app hasta que la reactives. No se borra ningún dato.'
        : 'Sus usuarios podrán volver a entrar a la app.',
      confirmLabel: c.isActive ? 'Suspender empresa' : 'Reactivar empresa',
      danger: c.isActive,
      run: (password) => consoleApi.toggleCompanyStatus(c.id, password),
      done: c.isActive ? `${c.name} suspendida` : `${c.name} reactivada`,
    });

  const assignGps = (g: ConsoleGps, companyId: string) => {
    const target = companies.find((c) => c.id === companyId)?.name || 'Sin empresa';
    withPassword({
      title: `Mover GPS ${g.imei}`,
      description: `El equipo pasará a "${target}". Sus posiciones nuevas las verá esa empresa.`,
      confirmLabel: 'Mover GPS',
      danger: false,
      run: (password) => consoleApi.updateGps(g.id, { companyId: companyId || null }, password),
      done: 'Empresa del GPS actualizada',
    });
  };

  const unlinkGps = (g: ConsoleGps) =>
    withPassword({
      title: `Desvincular GPS ${g.imei}`,
      description: `Se quitará de ${g.vehicle?.name || g.machine?.name}. La unidad deja de recibir posiciones; su historial se conserva y el GPS queda libre para otra unidad.`,
      confirmLabel: 'Desvincular',
      run: (password) => consoleApi.unlinkGps(g.id, password),
      done: 'GPS desvinculado',
    });

  const restore = async (item: TrashItem) => {
    const ok = await confirm({
      title: 'Restaurar registro',
      message: `"${item.label}" volverá a su empresa desactivado, para que decidan cuándo usarlo de nuevo.`,
      confirmLabel: 'Restaurar',
      icon: ArchiveRestore,
    });
    if (!ok) return;
    try {
      const res = await consoleApi.restore(item);
      toast(res.message, 'success');
      loadAll();
    } catch (err: any) {
      toast(err.message || 'No se pudo restaurar', 'error');
    }
  };

  const revokeAll = () =>
    setProtectedAction({
      title: 'Cerrar todas mis sesiones',
      description: 'Se cerrarán todas tus sesiones de la consola en cualquier navegador, incluida esta, y cualquier Modo Soporte abierto.',
      confirmLabel: 'Cerrar sesiones',
      run: async (password) => {
        await consoleApi.logoutAll(password);
        logout();
        router.replace('/console-login');
      },
    });

  const exit = async () => {
    const ok = await confirm({ title: 'Salir de la consola', message: 'Se cerrará tu sesión en este navegador.', confirmLabel: 'Salir', icon: LogOut });
    if (!ok) return;
    logout();
    router.replace('/console-login');
  };

  const tabs: ConsoleNavItem<Tab>[] = (
    [
      { key: 'companies', label: 'Clientes', icon: Building2, count: companies.length },
      { key: 'subscriptions', label: 'Suscripciones', icon: Receipt, count: subscriptions.length },
      { key: 'users', label: 'Usuarios', icon: Users, count: users.length },
      { key: 'gps', label: 'Inventario GPS', icon: Radio, count: devices.length },
      { key: 'team', label: 'Equipo', icon: UsersRound, count: team.length },
      { key: 'trash', label: 'Eliminados', icon: ArchiveRestore, count: trash.length },
      { key: 'audit', label: 'Bitácora', icon: ScrollText },
    ] as const
  ).filter((tb) => can(TAB_PERMISSION[tb.key]));
  const current = tabs.find((tb) => tb.key === tab) || tabs[0];

  const newButton =
    tab === 'companies' && can('billing') ? (
      <Button variant="accent" label="Nuevo cliente" icon={Plus} compact onPress={() => setForm('company')} />
    ) : tab === 'users' ? (
      <Button variant="accent" label="Nuevo administrador" icon={Plus} compact onPress={() => setForm('user')} />
    ) : tab === 'gps' ? (
      <Button variant="accent" label="Registrar GPS" icon={Plus} compact onPress={() => setForm('gps')} />
    ) : tab === 'team' ? (
      <Button variant="accent"
        label="Nuevo integrante"
        icon={Plus}
        compact
        onPress={() => {
          setEditMember(null);
          setForm('member');
        }}
      />
    ) : (
      <Button label="Actualizar" icon={RefreshCw} variant="surface" compact onPress={tab === 'audit' ? loadLogs : loadAll} />
    );

  return (
    <View className={`flex-1 flex-row ${t.screen}`}>
      <ConsoleSidebar
        items={tabs}
        active={tab}
        onSelect={(key) => {
          setTab(key);
          setSearch('');
        }}
        compact={!isDesktop}
        onExit={exit}
      />
      <View className="flex-1">
      <ConsoleTopBar title="Consola de administración" staff={staff} compact={!isDesktop} onAccount={() => setForm('account')} onRevoke={revokeAll} />
      <Screen maxWidth={1240} refreshing={loading && !!metrics} onRefresh={loadAll}>
        <View className="flex-row flex-wrap items-end justify-between gap-3 mb-5">
          <View className="min-w-[200px]">
            <Text className={`text-[26px] font-extrabold tracking-tight ${t.text}`}>{current?.label}</Text>
            <Text className={`text-[13.5px] mt-0.5 ${t.muted}`}>{TAB_HINTS[tab]}</Text>
          </View>
          <View className={`flex-row flex-wrap items-center gap-2 ${isDesktop ? '' : 'w-full'}`}>
            <View style={isDesktop ? { width: 260 } : { flexGrow: 1, minWidth: 160 }}>
              <Field search placeholder="Buscar" value={search} onChangeText={setSearch} />
            </View>
            {newButton}
          </View>
        </View>
        {view.controls.length ? (
          <View className="flex-row flex-wrap items-center gap-2 mb-4">
            {view.controls.map((c) => (
              <FilterSelect key={`${tab}.${c.name}`} label={c.label} value={c.value} options={c.options} onChange={(v) => setFilters((prev) => ({ ...prev, [`${tab}.${c.name}`]: v }))} />
            ))}
            {view.controls.some((c) => c.value !== 'all') ? (
              <Button
                label="Quitar filtros"
                variant="soft"
                compact
                onPress={() => setFilters((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${tab}.`))))}
              />
            ) : null}
            <Text className={`text-[12.5px] ml-1 ${t.muted}`}>{view.rows.length} resultados</Text>
          </View>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}
        {metrics && tab === 'companies' ? (
          <Card className="p-4 mb-4">
            <View className="flex-row flex-wrap gap-4">
              <Stat label="Clientes" value={metrics.totalCompanies} hint={`${metrics.activeCompanies} activos · ${metrics.suspendedCompanies} suspendidos`} />
              <Stat label="Unidades" value={metrics.totalUnits} hint={`${metrics.totalVehicles} vehículos · ${metrics.totalMachines} máquinas`} />
              <Stat label="GPS" value={metrics.totalGpsDevices} hint={`${metrics.linkedGpsDevices} vinculados · ${metrics.availableGpsDevices} libres`} />
              {billing ? (
                <Stat
                  label="Ingreso mensual"
                  value={formatMoney(billing.monthlyRevenue)}
                  hint={`${billing.active} activas · ${billing.pastDue} vencidas · ${billing.withoutSubscription} sin suscripción`}
                />
              ) : (
                <Stat label="Usuarios de clientes" value={metrics.totalUsers} />
              )}
            </View>
          </Card>
        ) : null}

        {loading && !metrics ? (
          <Loading />
        ) : tab === 'companies' ? (
          <CompaniesTab
            companies={pageItems as ConsoleCompany[]}
            canSupport={can('support')}
            canBill={can('billing')}
            canDelete={staff.role === 'owner'}
            onSupport={setSupportCompany}
            onToggle={toggleCompany}
            onOpen={(company, section) => setCustomer({ company, section })}
            onDelete={(c) =>
              withPassword({
                title: 'Eliminar empresa',
                description: `"${c.name}" se moverá a Eliminados: sus usuarios ya no podrán entrar, pero sus datos se conservan y se puede restaurar.`,
                confirmLabel: 'Eliminar empresa',
                run: (password) => consoleApi.deleteCompany(c.id, password),
                done: 'Empresa movida a Eliminados',
              })
            }
          />
        ) : tab === 'subscriptions' ? (
          <SubscriptionsTab rows={pageItems as SubscriptionRow[]} onEdit={setSubscriptionRow} />
        ) : tab === 'users' ? (
          <UsersTab
            users={pageItems as CustomerUser[]}
            onReset={setResetUser}
            onDelete={(u) =>
              withPassword({
                title: 'Eliminar usuario',
                description: `${u.name} (${u.email}) perderá el acceso de inmediato y se moverá a Eliminados, desde donde se puede restaurar.`,
                confirmLabel: 'Eliminar usuario',
                run: (password) => consoleApi.deleteUser(u.id, password),
                done: 'Usuario movido a Eliminados',
              })
            }
          />
        ) : tab === 'gps' ? (
          <GpsTab
            devices={pageItems as ConsoleGps[]}
            companies={companies}
            onAssign={assignGps}
            onLink={setLinking}
            onUnlink={unlinkGps}
            onDelete={(g) =>
              withPassword({
                title: 'Eliminar GPS del inventario',
                description: `El equipo con IMEI ${g.imei} se moverá a Eliminados. Su historial de posiciones se conserva.`,
                confirmLabel: 'Eliminar GPS',
                run: (password) => consoleApi.deleteGps(g.id, password),
                done: 'GPS movido a Eliminados',
              })
            }
          />
        ) : tab === 'team' ? (
          <TeamTab
            members={pageItems as TeamMember[]}
            selfId={staff.id}
            onEdit={(m) => {
              setEditMember(m);
              setForm('member');
            }}
            onResetPassword={(m) =>
              withPassword({
                title: `Nueva contraseña para ${m.name}`,
                description: 'Se generará una contraseña temporal y se cerrarán sus sesiones abiertas.',
                confirmLabel: 'Generar contraseña',
                run: async (password) => {
                  const res = await consoleApi.resetMemberPassword(m.id, password);
                  setTemporary({ name: m.name, password: res.temporaryPassword });
                },
              })
            }
            onToggleActive={(m) =>
              withPassword({
                title: m.isActive ? `Desactivar a ${m.name}` : `Reactivar a ${m.name}`,
                description: m.isActive
                  ? 'Ya no podrá entrar a la consola y se cerrarán sus sesiones y su Modo Soporte. Su historial se conserva.'
                  : 'Podrá volver a entrar a la consola con su contraseña.',
                confirmLabel: m.isActive ? 'Desactivar' : 'Reactivar',
                danger: m.isActive,
                run: (password) => consoleApi.setMemberActive(m.id, !m.isActive, password),
                done: m.isActive ? 'Integrante desactivado' : 'Integrante reactivado',
              })
            }
          />
        ) : tab === 'trash' ? (
          <TrashTab items={pageItems as TrashItem[]} onRestore={restore} />
        ) : (
          <AuditTab logs={pageItems as AuditLog[]} loading={logsLoading} />
        )}
        <Pagination {...pager} />
      </Screen>
      </View>

      <CompanyFormSheet visible={form === 'company'} onClose={() => setForm(null)} onSaved={loadAll} />
      <UserFormSheet visible={form === 'user'} companies={companies} onClose={() => setForm(null)} onSaved={loadAll} />
      <GpsFormSheet visible={form === 'gps'} companies={companies} onClose={() => setForm(null)} onSaved={loadAll} />
      <TeamMemberSheet visible={form === 'member'} member={editMember} selfId={staff.id} onClose={() => setForm(null)} onSaved={loadAll} />
      <AccountSheet visible={form === 'account'} onClose={() => setForm(null)} />
      <ResetPasswordSheet user={resetUser} onClose={() => setResetUser(null)} />
      <SubscriptionSheet row={subscriptionRow} onClose={() => setSubscriptionRow(null)} onSaved={loadAll} />
      <SupportReasonSheet company={supportCompany} onClose={() => setSupportCompany(null)} onConfirm={startSupport} />
      <ConfirmPasswordSheet action={protectedAction} onClose={() => setProtectedAction(null)} />
      <CustomerSheet
        companyId={customer?.company.id || null}
        units={(customer?.company._count?.vehicles || 0) + (customer?.company._count?.machines || 0)}
        section={customer?.section || 'data'}
        canBill={can('billing')}
        onClose={() => setCustomer(null)}
        onChanged={loadAll}
      />
      <GpsLinkSheet gps={linking} onClose={() => setLinking(null)} onLinked={loadAll} />
      <Sheet visible={!!temporary} onClose={() => setTemporary(null)} title={temporary ? `Contraseña de ${temporary.name}` : undefined}>
        <View className="gap-3 pb-2">{temporary ? <TemporaryPassword value={temporary.password} onDone={() => setTemporary(null)} /> : null}</View>
      </Sheet>
    </View>
  );
}
