import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight, MessageCircle, Phone, Mail } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

const SUPPORT = {
  company: 'Floa GPS',
  about: 'Rastreo satelital para flotas: monitoreo en tiempo real, geocercas, historial de rutas y reportes de operaciÃ³n.',
  address: 'Monterrey, Nuevo LeÃ³n',
  hours: 'Lun a SÃ¡b Â· 8:00 â€“ 18:00',
  website: 'www.floagps.com',
  phoneDisplay: '+52 81 0000 0000',
  email: 'soporte@floagps.com',
};

const GROUPS = [
  {
    title: 'Conectividad',
    items: [
      {
        q: 'Una unidad aparece â€œSin seÃ±alâ€ u offline',
        a: 'Verifique que el dispositivo tenga energÃ­a (cableado y fusible) y que la SIM tenga datos y saldo activo. Una instalaciÃ³n reciente puede tardar hasta 10 minutos en reportar. Si persiste, contacte a soporte con el IMEI del equipo.',
      },
      {
        q: 'La posiciÃ³n no se actualiza',
        a: 'Las posiciones llegan segÃºn la configuraciÃ³n del dispositivo. Si lleva mÃ¡s de 30 minutos sin reportar con la unidad encendida, revise la cobertura de la SIM o contacte a soporte indicando el nombre de la unidad.',
      },
      {
        q: 'El mapa se ve en blanco o no carga',
        a: 'El mapa usa imÃ¡genes en lÃ­nea; con conexiÃ³n lenta puede tardar unos segundos. Verifique su internet y vuelva a abrir la secciÃ³n Mapa.',
      },
    ],
  },
  {
    title: 'Cuenta y acceso',
    items: [
      {
        q: 'OlvidÃ© mi contraseÃ±a o necesito un usuario nuevo',
        a: 'La contraseÃ±a se cambia desde su foto de perfil (Mi cuenta â†’ Cambiar contraseÃ±a). Para usuarios nuevos, contacte a soporte con su nombre y empresa.',
      },
    ],
  },
  {
    title: 'Reportes e historial',
    items: [
      {
        q: 'Los reportes no muestran datos de un dÃ­a',
        a: 'Los reportes dependen de que el dispositivo haya reportado ese dÃ­a. Si el GPS estuvo sin seÃ±al no habrÃ¡ recorrido. Confirme en Rastreo si existieron posiciones antes de contactar a soporte.',
      },
    ],
  },
];

export default function HelpCenter() {
  const { darkMode } = useLayout();
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const cell = darkMode ? 'bg-[#151517] border border-[#242428]' : 'bg-white border border-black/[0.06]';
  const hairline = darkMode ? 'divide-[#242428]' : 'divide-black/[0.05]';
  const lift = darkMode ? '' : 'shadow-[0_1px_3px_rgba(16,24,40,0.05)]';
  const titleCls = darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]';
  const subCls = darkMode ? 'text-gray-500' : 'text-gray-400';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="pb-12 max-w-3xl">
      {/* TÃ­tulo */}
      <div className="pt-1 pb-5">
        <h1 className={`text-[24px] font-bold tracking-tight ${titleCls}`}>Ayuda</h1>
        <p className={`text-[13px] mt-0.5 ${subCls}`}>
          Respuestas rÃ¡pidas y contacto directo con soporte
        </p>
      </div>

      {/* Buscador */}
      <div className={`flex items-center gap-2.5 rounded-xl px-3.5 h-11 ${cell} ${lift}`}>
        <Search className={`w-[17px] h-[17px] flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en ayudaâ€¦"
          className={`flex-1 bg-transparent outline-none text-[14px] placeholder:text-gray-400
            ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Limpiar bÃºsqueda" className="p-0.5 -mr-0.5">
            <X className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      {/* Temas */}
      {filtered.length === 0 ? (
        <p className={`text-[13px] pt-8 text-center ${subCls}`}>
          Sin resultados para â€œ{query.trim()}â€. Intenta con otra palabra o escrÃ­benos por WhatsApp.
        </p>
      ) : (
        filtered.map((group, gi) => (
          <section key={gi} className="pt-6">
            <h2 className={`px-1 pb-2 text-[13px] font-semibold ${titleCls}`}>{group.title}</h2>
            <div className={`rounded-2xl overflow-hidden divide-y ${cell} ${hairline} ${lift}`}>
              {group.items.map((item, ii) => {
                const key = `${gi}.${ii}`;
                const open = openKey === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => setOpenKey(open ? null : key)}
                      className={`w-full flex items-center gap-3 px-4 min-h-[48px] py-3 text-left transition-colors
                        ${darkMode ? 'active:bg-[#1e1e20]' : 'active:bg-black/[0.03]'}`}
                    >
                      <span className={`flex-1 text-[13.5px] font-medium leading-snug
                        ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}
                        ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </button>
                    {open && (
                      <p className={`px-4 pb-4 text-[13px] leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Contacto */}
      <section className="pt-6">
        <h2 className={`px-1 pb-2 text-[13px] font-semibold ${titleCls}`}>Â¿Necesitas mÃ¡s ayuda?</h2>
        <div className={`rounded-2xl overflow-hidden divide-y ${cell} ${hairline} ${lift}`}>
          <a
            href={`https://wa.me/${SUPPORT.phoneDisplay.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda con Floa GPS: ')}`}
            target="_blank" rel="noreferrer"
            className={`flex items-center gap-3 px-4 min-h-[52px] py-3 transition-colors
              ${darkMode ? 'active:bg-[#1e1e20]' : 'active:bg-black/[0.03]'}`}
          >
            <span className="w-8 h-8 rounded-full bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-[17px] h-[17px] text-[#25D366]" />
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[13.5px] font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>WhatsApp</span>
              <span className="block text-[11.5px] mt-0.5 truncate">Reportar un problema Â· respuesta en minutos</span>
            </span>
            <ChevronRight className={`w-[18px] h-[18px] flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          </a>
          <a href={`tel:${SUPPORT.phoneDisplay.replace(/[^0-9+]/g, '')}`}
            className={`flex items-center gap-3 px-4 min-h-[52px] py-3 transition-colors
              ${darkMode ? 'active:bg-[#1e1e20]' : 'active:bg-black/[0.03]'}`}
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${darkMode ? 'bg-[#f87203]/15' : 'bg-[#032347]/[0.08]'}`}>
              <Phone className={`w-4 h-4 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[13.5px] font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Llamar</span>
              <span className={`block text-[11.5px] mt-0.5 truncate tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {SUPPORT.phoneDisplay} Â· {SUPPORT.hours}
              </span>
            </span>
            <ChevronRight className={`w-[18px] h-[18px] flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          </a>
          <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent('Ayuda con Floa GPS')}`}
            className={`flex items-center gap-3 px-4 min-h-[52px] py-3 transition-colors
              ${darkMode ? 'active:bg-[#1e1e20]' : 'active:bg-black/[0.03]'}`}
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${darkMode ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
              <Mail className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[13.5px] font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Correo</span>
              <span className={`block text-[11.5px] mt-0.5 truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{SUPPORT.email}</span>
            </span>
            <ChevronRight className={`w-[18px] h-[18px] flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          </a>
        </div>
      </section>

      {/* Pie */}
      <footer className="pt-8 text-center space-y-1">
        <p className={`text-[12px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{SUPPORT.company}</p>
        <p className={`text-[11.5px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{SUPPORT.address} Â· {SUPPORT.hours}</p>
        <a href={`https://${SUPPORT.website}`} target="_blank" rel="noreferrer"
          className={`inline-block text-[11.5px] hover:underline underline-offset-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {SUPPORT.website}
        </a>
      </footer>
    </div>
  );
}
