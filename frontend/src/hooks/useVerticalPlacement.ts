import { useState, useEffect } from 'react';

// Retorna la posición vertical ideal ('above' | 'below') para un popover,
// según el espacio disponible en la ventana al rededor del trigger.
export function useVerticalPlacement(
  triggerOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  popupHeight: number,
  margin = 8
): 'above' | 'below' {
  const [place, setPlace] = useState<'above' | 'below'>('below');

  useEffect(() => {
    if (!triggerOpen) return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Si no cabe abajo pero sí arriba (o hay más espacio arriba), ponlo arriba.
    if (spaceBelow < popupHeight + margin && spaceAbove > spaceBelow) {
      setPlace('above');
    } else {
      setPlace('below');
    }
  }, [triggerOpen, popupHeight, triggerRef]);

  return place;
}
