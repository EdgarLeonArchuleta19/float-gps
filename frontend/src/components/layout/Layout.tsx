import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Car, Shield, LocateFixed, Bell,
  FileText, Settings, Menu, X, LogOut, ChevronLeft, ChevronRight, Moon, Sun, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import logo from '../../assets/logo-floa.png';
import logoDark from '../../assets/logo-floa-black.png';

const navItems = [
  { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { path: '/live-map', label: 'Mapa', icon: Map },
  { path: '/fleet', label: 'Flota', icon: Car },
  { path: '/geofences', label: 'Geocercas', icon: Shield },
  { path: '/tracking', label: 'Rastreo', icon: LocateFixed },
  { path: '/reports', label: 'Reportes', icon: FileText },
  { path: '/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/help', label: 'Ayuda', icon: HelpCircle },
  { path: '/config', label: 'Ajustes', icon: Settings },
];

export default function Layout() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useLayout();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchDelta, setTouchDelta] = React.useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientX - touchStart;
    if (delta < 0) setTouchDelta(delta);
  };

  const handleTouchEnd = () => {
    if (touchDelta < -80) setSidebarOpen(false);
    setTouchStart(null);
    setTouchDelta(0);
  };

  return (
    <div className={`flex h-screen h-dvh ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'} transition-colors duration-300`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-[1099] backdrop-blur-md lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: sidebarOpen && touchDelta < 0 ? `translateX(${Math.max(touchDelta, -230)}px)` : undefined }}
        className={`fixed lg:static z-[1100] h-full transition-transform duration-300 flex flex-col
        ${darkMode ? 'bg-[#111111] border-[#222]' : 'bg-white border-[#e5e5e5]'} border-r
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[200px]'} w-[230px]`}>

        <div className={`flex items-center h-16 px-4 border-b ${darkMode ? 'border-[#222]' : 'border-[#f0f0f0]'} ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <img src={darkMode ? logoDark : logo} alt="Floa GPS" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-1">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden lg:flex p-1 rounded-md transition-colors ${darkMode ? 'text-gray-600 hover:text-gray-300' : 'text-gray-300 hover:text-gray-500'}`}>
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-px overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200
                  ${isActive
                    ? darkMode ? 'bg-[#f87203]/15 text-[#f87203] shadow-[0_0_12px_rgba(248,114,3,0.1)]' : 'bg-[#032347]/8 text-[#032347]'
                    : darkMode ? 'text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-200' : 'text-gray-500 hover:bg-[#f0f0f0] hover:text-[#1d1d1f]'
                  } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}>
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? (darkMode ? 'text-[#f87203]' : 'text-[#032347]') : ''}`} />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t ${darkMode ? 'border-[#222]' : 'border-[#f0f0f0]'}`}>
          {sidebarCollapsed ? (
            <div className="hidden lg:block">
              <button onClick={logout} className="flex justify-center w-full p-2 text-gray-500 hover:text-red-400 rounded-xl transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
            <div className="flex items-center gap-2.5 w-full">
              <button onClick={() => { navigate('/profile'); setSidebarOpen(false); }} title="Mi cuenta"
                className={`flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl p-1 -m-1 transition-colors
                  ${darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#f0f0f0]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f7]'}`}>
                  <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-[#032347]'}`}>{user?.name?.[0] || 'A'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-[#1d1d1f]'}`}>{user?.name}</p>
                  <p className={`text-[11px] truncate ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{user?.email}</p>
                </div>
              </button>
              <button onClick={logout} title="Cerrar sesión" className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg flex-shrink-0 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className={`h-16 flex items-center px-4 flex-shrink-0 sticky top-0 z-50
          ${darkMode ? 'bg-[#111111]/80 backdrop-blur-xl border-b border-[#222]' : 'bg-white/80 backdrop-blur-xl border-b border-[#f0f0f0]'}`}>
          <button onClick={toggleSidebar} className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-600 mr-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode}
              className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-gray-500 hover:text-[#f87203] hover:bg-[#1a1a1a]' : 'text-gray-400 hover:text-[#032347] hover:bg-[#f5f5f7]'}`}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => navigate('/help')}
              title="Centro de ayuda"
              className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-gray-500 hover:text-gray-200 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}>
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/notifications')}
              className={`relative p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-gray-500 hover:text-gray-200 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#f87203] rounded-full" />
            </button>
          </div>
        </header>

        <main className={`flex-1 ${location.pathname === '/live-map' ? 'overflow-hidden' : 'overflow-auto p-4 lg:p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
