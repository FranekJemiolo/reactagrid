import React from 'react';
import { Molecule } from '../types/chemistry';

export interface CellProbeData {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  compoundId: string;
  name: string;
  formula: string;
  state: string;
  density: number;
  tempK: number;
  hazardRating: number;
}

interface CellProbeProps {
  data: CellProbeData | null;
  molecules: Record<string, Molecule>;
}

export const CellProbe: React.FC<CellProbeProps> = ({ data, molecules }) => {
  if (!data || data.compoundId === 'empty') return null;

  const mol = molecules[data.compoundId];
  const name = mol?.name || data.name;
  const formula = mol?.formula || data.formula;
  const tempC = Math.round(data.tempK - 273.15);

  return (
    <div
      className="pointer-events-none fixed z-40 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white text-[11px] leading-tight space-y-1 transition-all duration-75"
      style={{
        left: `${Math.min(window.innerWidth - 180, Math.max(16, data.screenX + 16))}px`,
        top: `${Math.min(window.innerHeight - 110, Math.max(16, data.screenY - 50))}px`,
      }}
    >
      <div className="flex items-center gap-1.5 font-bold">
        <span
          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/30"
          style={{ backgroundColor: mol?.color.substring(0, 7) || '#38bdf8' }}
        />
        <span className="text-white">{name}</span>
        {formula && <span className="text-sky-400 font-mono text-[10px]">({formula})</span>}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300 font-mono text-[10px] pt-1 border-t border-slate-800">
        <div>
          <span className="text-slate-500">State: </span>
          <span>{data.state}</span>
        </div>
        <div>
          <span className="text-slate-500">Density: </span>
          <span>{data.density}g</span>
        </div>
        <div>
          <span className="text-slate-500">Local Temp: </span>
          <span className="text-amber-300 font-semibold">
            {tempC}°C ({Math.round(data.tempK)}K)
          </span>
        </div>
        <div>
          <span className="text-slate-500">Ambient: </span>
          <span className="text-slate-400">25°C (298K)</span>
        </div>
        <div>
          <span className="text-slate-500">Grid: </span>
          <span>
            {data.x},{data.y}
          </span>
        </div>
      </div>
    </div>
  );
};
