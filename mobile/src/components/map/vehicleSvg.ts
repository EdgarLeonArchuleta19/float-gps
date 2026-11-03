export const VEHICLE_SVG_WIDTH = 28;
export const VEHICLE_SVG_HEIGHT = 44;

function carSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44">
<rect x="2.2" y="13" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>
<rect x="22.8" y="13" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>
<path d="M8 3.5C10 2 18 2 20 3.5C22.5 5 23.5 8 23.5 12V33C23.5 38 22 41.5 14 41.5C6 41.5 4.5 38 4.5 33V12C4.5 8 5.5 5 8 3.5Z" fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.2 13.5C10 11.6 18 11.6 20.8 13.5L19.6 18.6C16 17.6 12 17.6 8.4 18.6Z" fill="#0f172a" fill-opacity="0.72"/>
<path d="M8.6 19.4C12 18.6 16 18.6 19.4 19.4V29.6C16 30.2 12 30.2 8.6 29.6Z" fill="#000000" fill-opacity="0.14"/>
<path d="M8.8 30.6C12 31.4 16 31.4 19.2 30.6L20.2 34.6C16.5 36.2 11.5 36.2 7.8 34.6Z" fill="#0f172a" fill-opacity="0.6"/>
<rect x="7.6" y="3.7" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>
<rect x="17.2" y="3.7" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>
<rect x="7.4" y="38.9" width="3.4" height="1.4" rx="0.7" fill="#fca5a5"/>
<rect x="17.2" y="38.9" width="3.4" height="1.4" rx="0.7" fill="#fca5a5"/>
</svg>`;
}

function truckSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44">
<rect x="2.2" y="9.4" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>
<rect x="22.8" y="9.4" width="3" height="2.4" rx="1" fill="${color}" stroke="#ffffff" stroke-width="0.8"/>
<rect x="4.5" y="2.5" width="19" height="39" rx="5" fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
<path d="M7.4 10C10 8.6 18 8.6 20.6 10L19.8 14C16 13.2 12 13.2 8.2 14Z" fill="#0f172a" fill-opacity="0.72"/>
<rect x="8" y="14.6" width="12" height="6.6" rx="2" fill="#000000" fill-opacity="0.14"/>
<rect x="6.8" y="23.2" width="14.4" height="15.8" rx="1.8" fill="#000000" fill-opacity="0.22"/>
<path d="M10.6 25V37.4M14 25V37.4M17.4 25V37.4" stroke="#ffffff" stroke-opacity="0.28" stroke-width="1"/>
<rect x="7.6" y="3.6" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>
<rect x="17.2" y="3.6" width="3.2" height="1.6" rx="0.8" fill="#fef9c3"/>
</svg>`;
}

export function vehicleSvg(kind: 'vehicle' | 'machine', color: string) {
  return kind === 'machine' ? truckSvg(color) : carSvg(color);
}
