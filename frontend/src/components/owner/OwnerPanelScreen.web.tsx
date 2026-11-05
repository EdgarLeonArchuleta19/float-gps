import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { ArchiveRestore, Building2, LogOut, Moon, Plus, Radio, RefreshCw, ScrollText, ShieldOff, Sun, Users } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Wordmark from '@/components/brand/Wordmark';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Button, Card, Chip, ChipRow, ErrorBanner, Field, IconButton, Loading, Screen, Stat } from '@/components/ui';
import { ownerApi, type AuditLog, type OwnerCompany, type OwnerGps, type OwnerMetrics, type OwnerUser, type TrashItem } from '@/components/owner/ownerApi';
import CompaniesTab from '@/components/owner/CompaniesTab';
import UsersTab from '@/components/owner/UsersTab';
import GpsTab from '@/components/owner/GpsTab';
import AuditTab from '@/components/owner/AuditTab';
import TrashTab from '@/components/owner/TrashTab';
import CompanyFormSheet from '@/components/owner/CompanyFormSheet';
import UserFormSheet from '@/components/owner/UserFormSheet';
import GpsFormSheet from '@/components/owner/GpsFormSheet';
import ResetPasswordSheet from '@/components/owner/ResetPasswordSheet';
import MasterKeySheet, { type MasterAction } from '@/components/owner/MasterKeySheet';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';

type Tab = 'companies' | 'users' | 'gps' | 'trash' | 'audit';

export default function OwnerPanel() {
  const { t, toggle } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, isOwner, restoring, logout, enterSupport } = useAuth();
  const [tab, setTab] = useState<Tab>('companies');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<OwnerCompany[]>([]);
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [devices, setDevices] = useState<OwnerGps[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<'company' | 'user' | 'gps' | null>(null);
  const [resetUser, setResetUser] = useState<OwnerUser | null>(null);
  const [masterAction, setMasterAction] = useState<MasterAction | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, us, gp, tr] = await Promise.all([ownerApi.overview(), ownerApi.listUsers(), ownerApi.listGps(), ownerApi.trash()]);
      setCompanies(ov.companies || []);
      setMetrics(ov.metrics);
      setUsers(us);
      setDevices(gp);
      setTrash(tr);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      setLogs(await ownerApi.auditLogs(200));
    } catch (err: any) {
      toast(err.message || 'Error al cargar la bitácora', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOwner) loadAll();
  }, [isOwner, loadAll]);

  useEffect(() => {
    if (isOwner && tab === 'audit') loadLogs();
  }, [isOwner, tab, loadLogs]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => ({
      companies: companies.filter((c) => !q || [c.name, c.contactEmail, c.plan].some((v) => v?.toLowerCase().includes(q))),
      users: users.filter((u) => !q || [u.name, u.email, u.company?.name].some((v) => v?.toLowerCase().includes(q))),
      devices: devices.filter((g) => !q || [g.imei, g.model, g.company?.name].some((v) => v?.toLowerCase().includes(q))),
      trash: trash.filter((r) => !q || [r.label, r.detail, r.companyName].some((v) => v?.toLowerCase().includes(q))),
      logs: logs.filter((l) => !q || [l.action, l.actorEmail, l.ip].some((v) => v?.toLowerCase().includes(q))),
    }),
    [companies, users, devices, trash, logs, q]
  );

  const currentList: unknown[] =
    tab === 'companies'
      ? filtered.companies
      : tab === 'users'
        ? filtered.users
        : tab === 'gps'
          ? filtered.devices
          : tab === 'trash'
            ? filtered.trash
            : filtered.logs;
  const { pageItems, pager } = usePagination(currentList, `${tab}|${q}`, tab === 'companies' ? 12 : 25);

  if (restoring) return <Loading />;
  if (!user || !isOwner) return <Redirect href="/owner-login" />;

  const support = async (c: OwnerCompany) => {
    try {
      const verified = await ownerApi.startSupportSession(c.id);
      enterSupport({ id: verified.id, name: verified.name });
      toast(`Modo Soporte activado: ${verified.name}`, 'info');
      router.replace('/live-map');
    } catch (err: any) {
      toast(err.message || 'No se pudo iniciar el Modo Soporte', 'error');
    }
  };

  const toggleCompany = async (c: OwnerCompany) => {
    try {
      const updated = await ownerApi.toggleCompanyStatus(c.id);
      toast(updated.isActive ? `Empresa ${c.name} reactivada` : `Empresa ${c.name} suspendida`, updated.isActive ? 'success' : 'info');
      loadAll();
    } catch (err: any) {
      toast(err.message || 'Error al cambiar estado', 'error');
    }
  };

  const assignGps = async (g: OwnerGps, companyId: string) => {
    try {
      await ownerApi.updateGps(g.id, { companyId: companyId || null });
      toast('Empresa del GPS actualizada', 'success');
      loadAll();
    } catch (err: any) {
      toast(err.message || 'Error al reasignar GPS', 'error');
    }
  };

  const destructive = (title: string, description: string, confirmLabel: string, run: (key: string) => Promise<unknown>, done: string) =>
    setMasterAction({
      title,
      description,
      confirmLabel,
      run: async (key) => {
        await run(key);
        toast(done, 'success');
        loadAll();
      },
    });

  const restore = async (item: TrashItem) => {
    try {
      const res = await ownerApi.restore(item);
      toast(res.message, 'success');
      loadAll();
    } catch (err: any) {
      toast(err.message || 'No se pudo restaurar', 'error');
    }
  };

  const revokeAll = async () => {
    const ok = await confirm({
      title: 'Cerrar todas las sesiones',
      message: 'Se cerrarán todas las sesiones de administración abiertas, incluida esta.',
      confirmLabel: 'Cerrar sesiones',
      destructive: true,
    });
    if (!ok) return;
    try {
      await ownerApi.revokeAllSessions();
    } catch (err: any) {
      toast(err.message || 'No se pudieron cerrar las sesiones', 'error');
      return;
    }
    logout();
    router.replace('/owner-login');
  };

  const exit = () => {
    logout();
    router.replace('/owner-login');
  };

  const tabs: { key: Tab; label: string; icon: typeof Building2; count?: number }[] = [
    { key: 'companies', label: 'Empresas', icon: Building2, count: companies.length },
    { key: 'users', label: 'Usuarios', icon: Users, count: users.length },
    { key: 'gps', label: 'Inventario GPS', icon: Radio, count: devices.length },
    { key: 'trash', label: 'Eliminados', icon: ArchiveRestore, count: trash.length },
    { key: 'audit', label: 'Bitácora', icon: ScrollText },
  ];

  const newButton =
    tab === 'companies' ? (
      <Button label="Nueva empresa" icon={Plus} compact onPress={() => setForm('company')} />
    ) : tab === 'users' ? (
      <Button label="Nuevo usuario" icon={Plus} compact onPress={() => setForm('user')} />
    ) : tab === 'gps' ? (
      <Button label="Registrar GPS" icon={Plus} compact onPress={() => setForm('gps')} />
    ) : tab === 'trash' ? (
      <Button label="Actualizar" icon={RefreshCw} variant="secondary" compact onPress={loadAll} />
    ) : (
      <Button label="Actualizar" icon={RefreshCw} variant="secondary" compact onPress={loadLogs} />
    );

  return (
    <View className={`flex-1 ${t.screen}`}>
      <View className={`flex-row items-center justify-between h-16 px-5 border-b ${t.card} ${t.border}`}>
        <View className="flex-row items-center gap-3">
          <Wordmark size={17} />
          <View className="rounded-lg bg-navy px-2.5 py-1">
            <Text className="text-white text-[11px] font-semibold">Consola de Dueño</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className={`text-[12px] mr-1 ${t.muted}`} numberOfLines={1}>
            {user.email}
          </Text>
          <IconButton icon={t.isDark ? Sun : Moon} label="Cambiar tema" onPress={toggle} />
          <IconButton icon={ShieldOff} label="Cerrar todas las sesiones" onPress={revokeAll} />
          <IconButton icon={LogOut} label="Salir" onPress={exit} />
        </View>
      </View>

      <Screen maxWidth={1280} refreshing={loading && !!metrics} onRefresh={loadAll}>
        {error ? <ErrorBanner message={error} /> : null}
        {metrics ? (
          <Card className="p-4 mb-4">
            <View className="flex-row flex-wrap gap-4">
              <Stat label="Empresas" value={metrics.totalCompanies} hint={`${metrics.activeCompanies} activas · ${metrics.suspendedCompanies} suspendidas`} />
              <Stat label="Unidades" value={metrics.totalUnits} hint={`${metrics.totalVehicles} vehículos · ${metrics.totalMachines} máquinas`} />
              <Stat label="GPS" value={metrics.totalGpsDevices} hint={`${metrics.linkedGpsDevices} vinculados · ${metrics.availableGpsDevices} libres`} />
              <Stat label="Usuarios" value={metrics.totalUsers} />
            </View>
          </Card>
        ) : null}

        <View className="flex-row flex-wrap items-center justify-between gap-3 mb-4">
          <ChipRow>
            {tabs.map((tb) => (
              <Chip key={tb.key} label={tb.label} icon={tb.icon} count={tb.count} active={tab === tb.key} onPress={() => setTab(tb.key)} />
            ))}
          </ChipRow>
          <View className="flex-row items-center gap-2">
            <View className="w-[260px]">
              <Field search placeholder="Buscar" value={search} onChangeText={setSearch} />
            </View>
            {newButton}
          </View>
        </View>

        {loading && !metrics ? (
          <Loading />
        ) : tab === 'companies' ? (
          <CompaniesTab
            companies={pageItems as OwnerCompany[]}
            onSupport={support}
            onToggle={toggleCompany}
            onDelete={(c) =>
              destructive(
                'Eliminar empresa',
                `"${c.name}" se moverá a Eliminados: sus usuarios ya no podrán entrar, pero sus datos se conservan y puedes restaurarla desde esa pestaña.`,
                'Eliminar empresa',
                (key) => ownerApi.deleteCompany(c.id, key),
                'Empresa movida a Eliminados'
              )
            }
          />
        ) : tab === 'users' ? (
          <UsersTab
            users={pageItems as OwnerUser[]}
            onReset={setResetUser}
            onDelete={(u) =>
              destructive(
                'Eliminar usuario',
                `${u.name} (${u.email}) perderá el acceso de inmediato y se moverá a Eliminados, desde donde puedes restaurarlo.`,
                'Eliminar usuario',
                (key) => ownerApi.deleteUser(u.id, key),
                'Usuario movido a Eliminados'
              )
            }
          />
        ) : tab === 'gps' ? (
          <GpsTab
            devices={pageItems as OwnerGps[]}
            companies={companies}
            onAssign={assignGps}
            onDelete={(g) =>
              destructive(
                'Eliminar GPS del inventario',
                `El equipo con IMEI ${g.imei} se moverá a Eliminados. Su historial de posiciones se conserva y puedes restaurarlo desde esa pestaña.`,
                'Eliminar GPS',
                (key) => ownerApi.deleteGps(g.id, key),
                'GPS movido a Eliminados'
              )
            }
          />
        ) : tab === 'trash' ? (
          <TrashTab items={pageItems as TrashItem[]} onRestore={restore} />
        ) : (
          <AuditTab logs={pageItems as AuditLog[]} loading={logsLoading} />
        )}
        <Pagination {...pager} />
      </Screen>

      <CompanyFormSheet visible={form === 'company'} onClose={() => setForm(null)} onSaved={loadAll} />
      <UserFormSheet visible={form === 'user'} companies={companies} onClose={() => setForm(null)} onSaved={loadAll} />
      <GpsFormSheet visible={form === 'gps'} companies={companies} onClose={() => setForm(null)} onSaved={loadAll} />
      <ResetPasswordSheet user={resetUser} onClose={() => setResetUser(null)} />
      <MasterKeySheet action={masterAction} onClose={() => setMasterAction(null)} />
    </View>
  );
}
