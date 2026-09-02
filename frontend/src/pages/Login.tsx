import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import logo from '../assets/logo-float.png';
import logoDark from '../assets/logo-float-black.png';

function OrbitalRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Outer ring - slow */}
      <div className="absolute w-[320px] h-[320px] rounded-full border border-white/[0.04]" style={{ animation: 'spin 30s linear infinite' }}>
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#f87203]/40" />
        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
      </div>
      {/* Mid ring - medium */}
      <div className="absolute w-[240px] h-[240px] rounded-full border border-white/[0.06]" style={{ animation: 'spin 20s linear infinite reverse' }}>
        <div className="absolute -bottom-1 left-1/3 w-2.5 h-2.5 rounded-full bg-white/25" />
        <div className="absolute top-1/4 -left-1 w-2 h-2 rounded-full bg-[#f87203]/30" />
      </div>
      {/* Inner ring - faster */}
      <div className="absolute w-[160px] h-[160px] rounded-full border border-white/[0.08]" style={{ animation: 'spin 12s linear infinite' }}>
        <div className="absolute -top-1 right-1/4 w-2 h-2 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function FloatingDots({ isDark }: { isDark: boolean }) {
  const dots = [
    { top: '12%', left: '8%', size: 4, delay: 0, color: '#032347' },
    { top: '25%', right: '12%', size: 3, delay: 1.2, color: '#f87203' },
    { top: '65%', left: '5%', size: 5, delay: 0.6, color: '#032347' },
    { top: '80%', right: '8%', size: 3, delay: 2, color: '#f87203' },
    { top: '45%', left: '15%', size: 3, delay: 1.8, color: '#032347' },
    { top: '15%', right: '25%', size: 4, delay: 0.3, color: '#f87203' },
  ];

  return (
    <>
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-dot pointer-events-none"
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            width: d.size,
            height: d.size,
            backgroundColor: isDark ? `${d.color}30` : `${d.color}15`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function GpsSignal({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute top-6 right-6 pointer-events-none">
      <div className="relative w-6 h-6">
        <div className={`absolute inset-0 rounded-full border animate-pulse-ring ${isDark ? 'border-[#032347]/40' : 'border-[#032347]/15'}`} />
        <div className={`absolute inset-1 rounded-full border animate-pulse-ring ${isDark ? 'border-[#032347]/30' : 'border-[#032347]/10'}`} style={{ animationDelay: '0.5s' }} />
        <div className={`absolute inset-2 rounded-full animate-pulse-ring ${isDark ? 'bg-[#032347]/30' : 'bg-[#032347]/20'}`} style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const isDark = darkMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(email, password);
    if (ok) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            localStorage.setItem('gps_user_location', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
      navigate('/dashboard');
    }
    else setError('Credenciales incorrectas');
    setLoading(false);
  };

  return (
    <div className={`min-h-dvh flex ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
      {/* Left panel — desktop 50/50 */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-[#032347] relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-[#f87203]/10" />
        <OrbitalRings />
        <GpsSignal isDark={false} />
        <img src={logoDark} alt="Float GPS" className="w-80 h-auto object-contain relative z-10 animate-fade-in-up" />
        {/* Rotating gear behind logo */}
        <div className="absolute z-[5] opacity-[0.06] animate-spin-slow">
          <GearIcon className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <FloatingDots isDark={isDark} />
        <GpsSignal isDark={isDark} />

        {/* Form centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12">
          <div className="w-full max-w-[360px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-8 animate-fade-in-up">
              <img src={isDark ? logoDark : logo} alt="Float GPS" className="h-16 w-auto object-contain" />
            </div>

            <div className="mb-8 animate-fade-in-up animate-delay-1">
              <h2 className={`text-[24px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                Iniciar sesión
              </h2>
              <p className={`text-[14px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className={`px-4 py-3 rounded-xl text-[13px] font-medium text-center animate-fade-in
                  ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                  {error}
                </div>
              )}

              <div className="animate-fade-in-up animate-delay-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Correo electrónico"
                  autoComplete="email"
                  autoCapitalize="none"
                  className={`w-full h-[52px] px-4 rounded-xl text-[15px] outline-none transition-all
                    ${isDark
                      ? 'bg-[#1a1a1a] text-white placeholder-gray-600 focus:ring-2 focus:ring-[#032347]/30'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#032347]/15'}`}
                />
              </div>

              <div className="relative animate-fade-in-up animate-delay-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  className={`w-full h-[52px] px-4 pr-12 rounded-xl text-[15px] outline-none transition-all
                    ${isDark
                      ? 'bg-[#1a1a1a] text-white placeholder-gray-600 focus:ring-2 focus:ring-[#032347]/30'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#032347]/15'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors
                    ${isDark ? 'text-gray-600' : 'text-gray-300'}`}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              <div className="text-right animate-fade-in-up animate-delay-3">
                <button type="button" className={`text-[13px] font-medium
                  ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="animate-fade-in-up animate-delay-4">
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className={`w-full h-[52px] flex items-center justify-center rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98]
                    ${isDark
                      ? 'bg-white text-[#032347] hover:bg-gray-100'
                      : 'bg-[#032347] text-white hover:bg-[#02335a]'}
                    disabled:opacity-40 disabled:active:scale-100`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar sesión'}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 mt-6 animate-fade-in-up animate-delay-4">
              <div className={`flex-1 h-px ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`} />
              <span className={`text-[12px] font-medium ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                o continuar con
              </span>
              <div className={`flex-1 h-px ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`} />
            </div>

            <div className="animate-fade-in-up animate-delay-5">
              <button
                type="button"
                className={`w-full h-[52px] flex items-center justify-center gap-3 rounded-xl text-[15px] font-medium transition-all active:scale-[0.98] mt-4
                  ${isDark
                    ? 'bg-[#1a1a1a] text-white hover:bg-[#222]'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#eee]'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Iniciar con Google
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-6 pb-6 pt-4 text-center">
          <p className={`text-[11px] ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
            Demo · admin@demo.com · demo123
          </p>
        </div>
      </div>
    </div>
  );
}
