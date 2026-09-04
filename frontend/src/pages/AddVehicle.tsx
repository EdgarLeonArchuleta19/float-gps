import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Satellite } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';

const VEHICLE_TYPES = ['Sedán', 'SUV', 'Pickup', 'Camioneta', 'Autobús', 'Camión', 'Motocicleta', 'Otro'];

export default function AddVehicle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('Sedán');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');

  const [showGps, setShowGps] = useState(false);
  const [imei, setImei] = useState('');
  const [gpsModel, setGpsModel] = useState('');
  const [simNumber, setSimNumber] = useState('');

  const [testState, setTestState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<any>(null);
  const [scanStep, setScanStep] = useState(0);

  const testSteps = [
    'Estableciendo conexión con el dispositivo…',
    'Autenticando IMEI en la red…',
    'Verificando señal GSM…',
    'Buscando satélites GPS…',
    'Confirmando enlace por satélite…',
  ];

  useEffect(() => {
    if (isEdit) {
      api.vehicles.get(id!).then((v) => {
        setName(v.name || '');
        setPlate(v.plate || '');
        setType(v.type || 'Sedán');
        setBrand(v.brand || '');
        setModel(v.vehicleModel || '');
        setYear(v.year?.toString() || '');
        setColor(v.color || '');
        if (v.gpsDevice) {
          setShowGps(true);
          setImei(v.gpsDevice.imei || '');
          setGpsModel(v.gpsDevice.model || '');
          setSimNumber(v.gpsDevice.simNumber || '');
        }
        setFetching(false);
      }).catch(() => {
        addToast('error', 'Error al cargar vehículo');
        navigate('/fleet');
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !plate.trim()) return;
    setLoading(true);
    try {
      const data: any = {
        name: name.trim(),
        plate: plate.trim(),
        type,
        brand: brand.trim() || null,
        vehicleModel: model.trim() || null,
        year: year ? parseInt(year) : null,
        color: color.trim() || null,
      };
      if (showGps && imei.trim()) {
        data.gps = {
          imei: imei.trim(),
          model: gpsModel.trim() || null,
          simNumber: simNumber.trim() || null,
        };
      }
      if (isEdit) {
        await api.vehicles.update(id!, data);
        addToast('success', 'Vehículo actualizado');
      } else {
        await api.vehicles.create(data);
        addToast('success', 'Vehículo creado');
      }
      navigate('/fleet');
    } catch {
      addToast('error', 'Error al guardar');
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    if (!imei.trim()) {
      setTestState('error');
      setTestResult({ message: 'Ingresa el número IMEI del dispositivo para probar la conexión.', error: true });
      return;
    }
    setTestState('scanning');
    setScanStep(0);
    setTestResult(null);

    // Avanza los pasos de diagnóstico con retardo
    const stepTimers: number[] = [];
    for (let i = 1; i < testSteps.length; i++) {
      stepTimers.push(window.setTimeout(() => setScanStep(i), i * 520));
    }

    try {
      const res = await api.gps.testConnection({ imei: imei.trim() });
      await new Promise((r) => setTimeout(r, testSteps.length * 520 + 200));
      stepTimers.forEach(clearTimeout);
      setScanStep(testSteps.length); // todos completos
      setTestState('success');
      setTestResult(res);
    } catch (e: any) {
      stepTimers.forEach(clearTimeout);
      setTestState('error');
      setTestResult({ message: e?.message || 'No se pudo establecer conexión con el dispositivo.', error: true });
    }
  };

  const inputClass = `w-full px-4 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347]
    ${darkMode ? 'bg-[#232329] text-[#f5f5f7] placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`;
  const labelClass = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/fleet')} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-[#232329]' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>
        <div>
          <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            {isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
          </h1>
          <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isEdit ? 'Actualiza los datos del vehículo' : 'Agrega un vehículo a tu flota'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5 space-y-4`}>
        <div>
          <label className={labelClass}>Nombre *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Toyota Hilux" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Placa *</label>
          <input type="text" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="Ej: ABC-123" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className={`${inputClass} appearance-none`}>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Marca</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Toyota" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Modelo</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Hilux" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Año</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Ej: 2024" min="1900" max="2030" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej: Blanco" className={inputClass} />
          </div>
        </div>

        <div className={`pt-4 border-t ${darkMode ? 'border-[#34363f]' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Satellite className={`w-4 h-4 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
            <h3 className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Dispositivo GPS</h3>
          </div>
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-3`}>
            {isEdit ? 'Datos del GPS instalado en esta unidad' : 'Opcional: si el vehículo ya lleva GPS, regístralo aquí'}
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>IMEI</label>
              <input type="text" value={imei} onChange={(e) => { setImei(e.target.value); setTestState('idle'); setTestResult(null); }}
                placeholder="Número IMEI del dispositivo" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Modelo</label>
                <input type="text" value={gpsModel} onChange={(e) => setGpsModel(e.target.value)}
                  placeholder="Ej: FMB920" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nº de chip (SIM)</label>
                <input type="text" value={simNumber} onChange={(e) => setSimNumber(e.target.value)}
                  placeholder="Opción: SIM" className={inputClass} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testState === 'scanning' || !imei.trim()}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98]
                disabled:opacity-60
                ${darkMode
                  ? 'bg-[#2a2b31] text-[#f5f5f7] border border-[#3c3d46] hover:bg-[#2a2a2d]'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] border border-gray-200 hover:bg-gray-100'}`}
            >
              <Satellite className="w-4 h-4" /> Probar conexión GPS
            </button>

            {testState === 'scanning' && (
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-[#2a2a2d] bg-[#0e0e10]' : 'border-gray-100 bg-[#fafafa]'}`}>
                {/* Radar */}
                <div className="flex flex-col items-center py-5 relative overflow-hidden">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 animate-pulse-ring" style={{ borderColor: darkMode ? '#f87203' : '#032347' }} />
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-60%"
                        style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${darkMode ? 'rgba(248,114,3,0.35)' : 'rgba(3,35,71,0.3)'} 70deg, transparent 100deg)` }}>
                        <div className="absolute inset-0 animate-radar" />
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Satellite className={`w-6 h-6 animate-heartbeat ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
                    </div>
                  </div>
                  <p className={`mt-3 text-[12px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                    Escaneando dispositivo…
                  </p>
                  <p className={`text-[11px] tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{imei}</p>
                </div>

                {/* Pasos de diagnóstico */}
                <div className={`px-4 pb-4 space-y-1.5 ${darkMode ? 'bg-[#131316]' : 'bg-white'}`}>
                  {testSteps.map((step, i) => {
                    const done = i < scanStep;
                    const active = i === scanStep;
                    return (
                      <div key={i}
                        className={`flex items-center gap-2.5 text-[12px] ${done || active ? (darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]') : (darkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                        <span className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${done ? 'bg-green-500 text-white' : active ? (darkMode ? 'bg-[#f87203]' : 'bg-[#032347]') : (darkMode ? 'bg-[#2a2b31]' : 'bg-gray-100')}`}>
                          {done ? <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : active ? <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                            : <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-500' : 'bg-gray-300'}`} />}
                        </span>
                        <span className={`${done ? '' : active ? 'animate-step-in' : ''}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {testState === 'success' && testResult && (
              <div className={`rounded-2xl border overflow-hidden animate-success-pop
                ${darkMode ? 'border-[#166534]/50 bg-[#0a120c]' : 'border-green-200 bg-green-50/60'}`}>
                <div className={`relative h-1 overflow-hidden ${darkMode ? 'bg-[#166534]/30' : 'bg-green-100'}`}>
                  <div className={`absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-green-500 to-transparent`} />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 ${darkMode ? 'bg-[#166534]/40' : 'bg-green-100'}`}>
                      <svg className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} viewBox="0 0 20 20" fill="none">
                        <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Conexión establecida</p>
                      <p className={`text-[11px] ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{testResult.model || 'GPS'} · ping {testResult.pingMs}ms · señal OK</p>
                    </div>
                  </div>
                  <div className={`mt-3 grid grid-cols-2 gap-2 text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className={`rounded-lg px-2.5 py-2 ${darkMode ? 'bg-[#0e0e10]' : 'bg-white'}`}>
                      <span className={`block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>IMEI</span>
                      <span className={`font-medium tabular-nums ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{testResult.imei}</span>
                    </div>
                    <div className={`rounded-lg px-2.5 py-2 ${darkMode ? 'bg-[#0e0e10]' : 'bg-white'}`}>
                      <span className={`block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Latencia</span>
                      <span className={`font-medium tabular-nums ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{testResult.pingMs} ms</span>
                    </div>
                    <div className={`rounded-lg px-2.5 py-2 col-span-2 ${darkMode ? 'bg-[#0e0e10]' : 'bg-white'}`}>
                      <span className={`block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Unidad</span>
                      <span className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                        {testResult.linkedUnit ? `${testResult.linkedUnit.name} (${testResult.linkedUnit.label})` : 'Sin unidad asignada'}
                      </span>
                    </div>
                  </div>
                  <p className={`mt-2 text-[11px] ${darkMode ? 'text-green-500/80' : 'text-green-700/80'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            {testState === 'error' && testResult && (
              <div className={`rounded-2xl border p-4 animate-success-pop ${darkMode ? 'border-[#7f1d1d]/50 bg-[#1a0a0a]' : 'border-red-200 bg-red-50/60'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 ${darkMode ? 'bg-[#7f1d1d]/40' : 'bg-red-100'}`}>
                    <svg className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} viewBox="0 0 20 20" fill="none">
                      <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>No se pudo conectar</p>
                    <p className={`text-[11px] ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{testResult.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !plate.trim()}
          className={`w-full h-[48px] flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]
            ${darkMode ? 'bg-white text-[#032347] hover:bg-gray-100' : 'bg-[#032347] text-white hover:bg-[#02335a]'}
            disabled:opacity-40`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {isEdit ? 'Guardar cambios' : 'Crear vehículo'}</>}
        </button>
      </form>
    </div>
  );
}
