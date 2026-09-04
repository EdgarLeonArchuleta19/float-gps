import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Wrench, Power, AlertTriangle, MapPin, ArrowRight, Clock, Zap, Eye, Map, Bell, BarChart3 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { formatKm, timeAgo, eventTypeIcon, severityColor } from '../utils/format';
import { useLayout } from '../context/LayoutContext';

function HealthRing({ percent, size = 80, stroke = 7, darkMode }: { percent: number; size?: number; stroke?: number; darkMode: boolean }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent >= 80 ? '#22C55E' : percent >= 50 ? '#EAB308' : '#EF4444';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={darkMode ? '#33343c' : '#f0f0f0'} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
    </svg>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="flex-shrink-0 opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ActionCard({ icon: Icon, label, to, color, darkMode }: {
  icon: any; label: string; to: string; color: string; darkMode: boolean;
}) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all active:scale-[0.96]
      ${darkMode ? 'bg-[#1b1b1f] hover:bg-[#232329]' : 'bg-white hover:shadow-sm'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-[12px] font-medium text-center leading-tight ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const { darkMode } = useLayout();
  const { data: stats, loading } = useApi<DashboardStats>(() => api.dashboard.getStats(), []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
      </div>
    );
  }

  const totalOn = stats.vehiclesOn + stats.machinesOn;
  const totalOff = stats.vehiclesOff + stats.machinesOff;
  const totalMoving = stats.vehicleStatus.moving + stats.machineStatus.moving;
  const totalStopped = stats.vehicleStatus.stopped + stats.machineStatus.stopped;
  const totalUnits = stats.totalUnits || 1;
  const healthPercent = Math.round(((totalMoving + totalStopped) / totalUnits) * 100);
  const sparkData1 = [3, 5, 2, 8, 6, 4, totalMoving];
  const sparkData2 = [12, 15, 10, 18, 14, 11, totalOn];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className={`text-[22px] font-bold tracking-tight ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
          Panel de monitoreo
        </h1>
      </div>

      {/* North Star — Vehicles in Motion */}
      <div className={`relative overflow-hidden rounded-2xl p-5 ${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-[12px] font-medium uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              En movimiento ahora
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-[48px] font-bold leading-none tracking-tight ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {totalMoving}
              </span>
              <span className={`text-[15px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                / {totalUnits} unidades
              </span>
            </div>
            <p className={`text-[13px] mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {totalOn} encendidos · {totalOff} apagados
            </p>
          </div>
          <MiniSparkline data={sparkData1} color={darkMode ? '#555' : '#bbb'} />
        </div>
        {/* Bottom bar */}
        <div className={`flex gap-1 mt-4 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#33343c]' : 'bg-gray-100'}`}>
          <div className="bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${(totalMoving / totalUnits) * 100}%` }} />
          <div className="bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${(totalStopped / totalUnits) * 100}%` }} />
          <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full transition-all duration-700`}
            style={{ width: `${(totalOff / totalUnits) * 100}%` }} />
        </div>
        <div className="flex gap-4 mt-2.5">
          <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Movimiento
          </span>
          <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Detenidos
          </span>
          <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} /> Apagados
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <KPIItem label="Horas hoy" value={stats.hoursWorkedToday} icon={Clock}
          color="bg-amber-500/10 text-amber-600" darkMode={darkMode} spark={sparkData2} sparkColor="#F59E0B" />
        <KPIItem label="Km hoy" value={formatKm(stats.kilometersToday)} icon={MapPin}
          color="bg-cyan-500/10 text-cyan-600" darkMode={darkMode} />
        <KPIItem label="Alertas" value={String(stats.alertsCount)} icon={AlertTriangle}
          color="bg-red-500/10 text-red-500" darkMode={darkMode} />
      </div>

      {/* Fleet Health + Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* Health ring */}
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5 flex flex-col items-center justify-center`}>
          <div className="relative">
            <HealthRing percent={healthPercent} size={90} stroke={8} darkMode={darkMode} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[20px] font-bold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{healthPercent}%</span>
            </div>
          </div>
          <p className={`text-[11px] font-medium mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Salud de flota
          </p>
        </div>

        {/* Alerts detail */}
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5 flex flex-col`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <span className={`text-[12px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Detalle alertas
            </span>
          </div>
          {stats.alertUnits.length > 0 ? (
            <div className="space-y-2 flex-1">
              {stats.alertUnits.slice(0, 3).map((u: any) => (
                <Link to={`/units/${u.id}`} key={u.id}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-colors
                    ${darkMode ? 'hover:bg-[#232329]' : 'hover:bg-gray-50'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${u.status === 'ALERT' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className={`text-[12px] font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {u.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className={`text-[12px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                Todo en orden
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className={`text-[13px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <ActionCard icon={Map} label="Mapa en vivo" to="/live-map" color="bg-[#032347]/10 text-[#032347]" darkMode={darkMode} />
          <ActionCard icon={Car} label="Flota" to="/fleet" color="bg-indigo-500/10 text-indigo-600" darkMode={darkMode} />
          <ActionCard icon={BarChart3} label="Reportes" to="/reports" color="bg-emerald-500/10 text-emerald-600" darkMode={darkMode} />
          <ActionCard icon={Bell} label="Alertas" to="/notifications" color="bg-[#f87203]/10 text-[#f87203]" darkMode={darkMode} />
        </div>
      </div>

      {/* Activity Feed */}
      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl`}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            Actividad reciente
          </h3>
          <Link to="/reports" className={`inline-flex items-center gap-1 text-[12px] font-medium
            ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'} hover:opacity-80`}>
            Ver todo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-[#33343c]">
          {stats.recentEvents.slice(0, 6).map((event, i) => (
            <div key={event.id}
              className={`flex items-center gap-3 px-5 py-3 transition-colors
                ${darkMode ? 'hover:bg-[#232329]' : 'hover:bg-[#f9f9fb]'}`}>
              <div className="relative">
                <span className="text-[15px]">{eventTypeIcon(event.type)}</span>
                {i === 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#f87203] animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium truncate ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                  {event.gpsDevice?.vehicle?.name || event.gpsDevice?.machine?.name || event.unitName || 'Unidad'}
                </p>
                <p className={`text-[11px] truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {event.type.replace(/_/g, ' ').toLowerCase()}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                ${event.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500'
                  : event.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-blue-500/10 text-blue-500'}`}>
                {event.severity === 'CRITICAL' ? 'Crit.' : event.severity === 'WARNING' ? 'Advert.' : 'Info'}
              </span>
              <span className={`text-[11px] whitespace-nowrap ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                {timeAgo(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, color, darkMode, spark, sparkColor }: {
  label: string; value: string; icon: any; color: string; darkMode: boolean; spark?: number[]; sparkColor?: string;
}) {
  return (
    <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {spark && <MiniSparkline data={spark} color={sparkColor || '#888'} />}
      </div>
      <p className={`text-[18px] font-bold leading-none ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{value}</p>
      <p className={`text-[11px] mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
    </div>
  );
}
