import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LayoutProvider } from './context/LayoutContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Fleet from './pages/Fleet';
import UnitDetail from './pages/UnitDetail';
import Geofences from './pages/Geofences';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Config from './pages/Config';
import Appearance from './pages/config/Appearance';
import NotificationsConfig from './pages/config/Notifications';
import Preferences from './pages/config/Preferences';
import Users from './pages/config/Users';
import About from './pages/config/About';
import Zone from './pages/config/Zone';
import HelpCenter from './pages/HelpCenter';
import Profile from './pages/Profile';
import AddVehicle from './pages/AddVehicle';
import AddGeofence from './pages/AddGeofence';
import ShareLocation from './pages/ShareLocation';
import AlarmMode from './pages/AlarmMode';
import RouteToVehicle from './pages/RouteToVehicle';
import EngineStop from './pages/EngineStop';
import VehicleList from './pages/VehicleList';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <LayoutProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="live-map" element={<LiveMap />} />
                <Route path="live-map/vehicles" element={<VehicleList />} />
                <Route path="live-map/share" element={<ShareLocation />} />
                <Route path="live-map/alarm" element={<AlarmMode />} />
                <Route path="live-map/route" element={<RouteToVehicle />} />
                <Route path="live-map/engine-stop" element={<EngineStop />} />
                <Route path="fleet" element={<Fleet />} />
                <Route path="fleet/new" element={<AddVehicle />} />
                <Route path="fleet/edit/:id" element={<AddVehicle />} />
                <Route path="units/:id" element={<UnitDetail />} />
                <Route path="geofences" element={<Geofences />} />
                <Route path="geofences/new" element={<AddGeofence />} />
                <Route path="geofences/edit/:id" element={<AddGeofence />} />
                <Route path="tracking" element={<Tracking />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="config" element={<Config />} />
                <Route path="config/appearance" element={<Appearance />} />
                <Route path="config/notifications" element={<NotificationsConfig />} />
                <Route path="config/preferences" element={<Preferences />} />
                <Route path="config/users" element={<Users />} />
                <Route path="config/about" element={<About />} />
                <Route path="config/zone" element={<Zone />} />
                <Route path="help" element={<HelpCenter />} />
                <Route path="profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </LayoutProvider>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
