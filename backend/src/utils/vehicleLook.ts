import { AppError } from '../middleware/errorHandler';

export const FIGURES = ['sedan', 'suv', 'pickup', 'truck', 'moto', 'tractor'] as const;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// How the unit is drawn on the map: a body shape and an optional body color
// chosen by the customer. Empty values fall back to the default drawing.
export function pickLook(data: any) {
  const picked: { figure?: string | null; iconColor?: string | null } = {};
  if (data?.figure !== undefined) {
    if (data.figure === null || data.figure === '') picked.figure = null;
    else if (!FIGURES.includes(data.figure)) throw new AppError('Figura no válida', 400);
    else picked.figure = data.figure;
  }
  if (data?.iconColor !== undefined) {
    if (data.iconColor === null || data.iconColor === '') picked.iconColor = null;
    else if (typeof data.iconColor !== 'string' || !HEX_COLOR.test(data.iconColor)) throw new AppError('Color no válido', 400);
    else picked.iconColor = data.iconColor.toLowerCase();
  }
  return picked;
}
