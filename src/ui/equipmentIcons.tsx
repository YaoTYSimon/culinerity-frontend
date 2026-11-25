import type { ReactNode } from 'react';
import type { EquipmentId } from '@culinerity/core';

/** One small drawing per kind of kitchen equipment: our own strokes on a 24px grid, in currentColor, like the recipe and dock icons. */
const DRAWINGS: Record<EquipmentId, ReactNode> = {
  stove: <path d="M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3zM8 9.5a2 2 0 100 .01M16 9.5a2 2 0 100 .01M7 16h10" />,
  oven: <path d="M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3zM3 9h18M7 6.5v.01M10 6.5v.01M8 12h8a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1v-3a1 1 0 011-1z" />,
  microwave: <path d="M5.5 5h13A3.5 3.5 0 0122 8.5v7a3.5 3.5 0 01-3.5 3.5h-13A3.5 3.5 0 012 15.5v-7A3.5 3.5 0 015.5 5zM6.5 8.5h7a1 1 0 011 1v5a1 1 0 01-1 1h-7a1 1 0 01-1-1v-5a1 1 0 011-1zM18 9v.01M18 12v.01M18 15v.01" />,
  kettle: <path d="M7 9h8l1 10a1 1 0 01-1 1H7a1 1 0 01-1-1zM8 9V7a2 2 0 014 0v2M16 11h1.5a2.5 2.5 0 010 5H16M6 12L3.5 9.5" />,
  toaster: <path d="M7 9V6.5a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 0111 6.5V9M13 9V6.5A1.5 1.5 0 0114.5 5h1A1.5 1.5 0 0117 6.5V9M6 9h12a3 3 0 013 3v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a3 3 0 013-3zM18 14v.01" />,
  'rice-cooker': <path d="M6 11a6 6 0 0112 0M12 5V3.5M4 11h16M5 11v7a2 2 0 002 2h10a2 2 0 002-2v-7M12 15.5v.01" />,
  'slow-cooker': <path d="M8 10c0-2 1.5-3 4-3s4 1 4 3M12 7V5.5M4 10h16M4.5 10c0 5 3 9 7.5 9s7.5-4 7.5-9M2.5 12.5H4.5M19.5 12.5h2" />,
  'air-fryer': <path d="M8 3h8a3 3 0 013 3v9a4 4 0 01-4 4H9a4 4 0 01-4-4V6a3 3 0 013-3zM9 8h6M9 11h6M8 21h8" />,
  blender: <path d="M6 3h12l-1.5 12h-9zM5 3h14M8 15h8a2 2 0 012 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1a2 2 0 012-2zM10 8h4" />,
};

/** Decorative: the equipment's name is always written beside it. */
export function EquipmentIcon({ id, className = 'size-5' }: { id: EquipmentId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {DRAWINGS[id]}
    </svg>
  );
}
