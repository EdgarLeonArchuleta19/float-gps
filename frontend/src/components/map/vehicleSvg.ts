import type { Figure } from '@/lib/types';

export const VEHICLE_SVG_WIDTH = 28;
export const VEHICLE_SVG_HEIGHT = 44;

const LIGHTS_FRONT = `<rect x="7.6" y="3.7" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>
<rect x="17.2" y="3.7" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>`;
const LIGHTS_REAR = `<rect x="7.4" y="38.9" width="3.4" height="1.4" rx="0.7" fill="#fca5a5"/>
<rect x="17.2" y="38.9" width="3.4" height="1.4" rx="0.7" fill="#fca5a5"/>`;

function mirrors(color: string, y: number) {
  return `<rect x="2.2" y="${y}" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>
<rect x="22.8" y="${y}" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>`;
}

const SHAPES: Record<Figure, (color: string) => string> = {
  sedan: (c) => `${mirrors(c, 13)}
<path d="M8 3.5C10 2 18 2 20 3.5C22.5 5 23.5 8 23.5 12V33C23.5 38 22 41.5 14 41.5C6 41.5 4.5 38 4.5 33V12C4.5 8 5.5 5 8 3.5Z" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.2 13.5C10 11.6 18 11.6 20.8 13.5L19.6 18.6C16 17.6 12 17.6 8.4 18.6Z" fill="#0f172a" fill-opacity="0.72"/>
<path d="M8.6 19.4C12 18.6 16 18.6 19.4 19.4V29.6C16 30.2 12 30.2 8.6 29.6Z" fill="#000000" fill-opacity="0.14"/>
<path d="M8.8 30.6C12 31.4 16 31.4 19.2 30.6L20.2 34.6C16.5 36.2 11.5 36.2 7.8 34.6Z" fill="#0f172a" fill-opacity="0.6"/>
${LIGHTS_FRONT}
${LIGHTS_REAR}`,
  suv: (c) => `${mirrors(c, 12)}
<rect x="4.5" y="2.5" width="19" height="39" rx="6.5" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.4 11.5C10 10 18 10 20.6 11.5L19.6 16.4C16 15.6 12 15.6 8.4 16.4Z" fill="#0f172a" fill-opacity="0.72"/>
<rect x="8.4" y="17.4" width="11.2" height="15" rx="2" fill="#000000" fill-opacity="0.14"/>
<path d="M8.4 18.4V31.4M19.6 18.4V31.4" stroke="#ffffff" stroke-opacity="0.4" stroke-width="0.9"/>
<path d="M8.6 34C12 34.8 16 34.8 19.4 34L19.8 37.6C16.4 38.6 11.6 38.6 8.2 37.6Z" fill="#0f172a" fill-opacity="0.6"/>
${LIGHTS_FRONT}
${LIGHTS_REAR}`,
  pickup: (c) => `${mirrors(c, 10.6)}
<rect x="4.5" y="2.5" width="19" height="39" rx="5" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.4 10C10 8.6 18 8.6 20.6 10L19.8 14.4C16 13.6 12 13.6 8.2 14.4Z" fill="#0f172a" fill-opacity="0.72"/>
<rect x="8" y="15" width="12" height="6.4" rx="2" fill="#000000" fill-opacity="0.14"/>
<path d="M8.4 22.4C12 23 16 23 19.6 22.4L19.2 24C16 24.5 12 24.5 8.8 24Z" fill="#0f172a" fill-opacity="0.6"/>
<rect x="6.6" y="25.6" width="14.8" height="13.6" rx="1.6" fill="#000000" fill-opacity="0.26"/>
<path d="M6.8 30.2H21.2M6.8 34.6H21.2" stroke="#ffffff" stroke-opacity="0.25" stroke-width="0.9"/>
${LIGHTS_FRONT}`,
  truck: (c) => `${mirrors(c, 9.4)}
<rect x="4.5" y="2.5" width="19" height="39" rx="5" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.4 10C10 8.6 18 8.6 20.6 10L19.8 14C16 13.2 12 13.2 8.2 14Z" fill="#0f172a" fill-opacity="0.72"/>
<rect x="8" y="14.6" width="12" height="6.6" rx="2" fill="#000000" fill-opacity="0.14"/>
<rect x="6.8" y="23.2" width="14.4" height="15.8" rx="1.8" fill="#000000" fill-opacity="0.22"/>
<path d="M10.6 25V37.4M14 25V37.4M17.4 25V37.4" stroke="#ffffff" stroke-opacity="0.28" stroke-width="1"/>
${LIGHTS_FRONT}`,
  moto: (c) => `<rect x="11.5" y="2" width="5" height="7.5" rx="2.5" fill="#1f2937" stroke="#ffffff" stroke-width="0.8"/>
<rect x="11.5" y="34.5" width="5" height="7.5" rx="2.5" fill="#1f2937" stroke="#ffffff" stroke-width="0.8"/>
<path d="M6 12H22" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round"/>
<path d="M6 12H22" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M14 6.5C17.6 6.5 18.6 9.5 18.6 13.5V30C18.6 35 17 37.5 14 37.5C11 37.5 9.4 35 9.4 30V13.5C9.4 9.5 10.4 6.5 14 6.5Z" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<circle cx="14" cy="21" r="4.2" fill="#0f172a" fill-opacity="0.72" stroke="#ffffff" stroke-width="1"/>
<rect x="12.6" y="7.6" width="2.8" height="1.6" rx="0.8" fill="#fef9c3"/>`,
  tractor: (c) => `<rect x="1.4" y="23.5" width="6.4" height="16" rx="2.2" fill="#1f2937" stroke="#ffffff" stroke-width="1"/>
<rect x="20.2" y="23.5" width="6.4" height="16" rx="2.2" fill="#1f2937" stroke="#ffffff" stroke-width="1"/>
<rect x="3.8" y="4.6" width="4.2" height="8.6" rx="1.6" fill="#1f2937" stroke="#ffffff" stroke-width="0.8"/>
<rect x="20" y="4.6" width="4.2" height="8.6" rx="1.6" fill="#1f2937" stroke="#ffffff" stroke-width="0.8"/>
<rect x="9" y="2.5" width="10" height="17" rx="3" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M11 5H17" stroke="#fef9c3" stroke-width="1.3" stroke-linecap="round"/>
<circle cx="16.4" cy="9" r="1.3" fill="#0f172a" fill-opacity="0.7"/>
<rect x="6.6" y="17.5" width="14.8" height="22" rx="3" fill="${c}" stroke="#ffffff" stroke-width="1.6"/>
<rect x="8.8" y="20.4" width="10.4" height="12.4" rx="1.6" fill="#0f172a" fill-opacity="0.6"/>`,
};

const STATUS_DOT: Record<Figure, [number, number]> = {
  sedan: [14, 24.6],
  suv: [14, 24.6],
  pickup: [14, 32.2],
  truck: [14, 31.2],
  moto: [14, 29.4],
  tractor: [14, 36.4],
};

export function vehicleSvg(figure: Figure, color: string, statusColor?: string) {
  const [cx, cy] = STATUS_DOT[figure];
  const dot = statusColor ? `\n<circle cx="${cx}" cy="${cy}" r="3.6" fill="${statusColor}" stroke="#ffffff" stroke-width="1.4"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44">
${SHAPES[figure](color)}${dot}
</svg>`;
}
