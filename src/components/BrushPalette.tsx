import React from 'react';
import { StoreItem, Molecule } from '../types/chemistry';
import { Eraser, Flame, Snowflake, Sparkles } from 'lucide-react';

interface BrushPaletteProps {
  unlockedItems: StoreItem[];
  molecules: Record<string, Molecule>;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  brushRadius: number;
  onSelectRadius: (r: number) => void;
  brushTempK: number;
  onSelectTemp: (tempK: number) => void;
}

export const BrushPalette: React.FC<BrushPaletteProps> = ({
  unlockedItems,
  molecules,
  selectedItemId,
  onSelectItem,
  brushRadius,
  onSelectRadius,
  brushTempK,
  onSelectTemp,
}) => {
  const radiuses = [1, 3, 5, 8, 14];

  const tempOptions = [
    { label: 'Cryo', temp: 180, icon: <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: '25°C', temp: 298.15, icon: <Sparkles className="w-3.5 h-3.5 text-slate-300" /> },
    { label: '150°C', temp: 423.15, icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { label: '500°C', temp: 773.15, icon: <Flame className="w-3.5 h-3.5 text-rose-500" /> },
  ];

  return (
    <footer className="max-w-4xl w-full p-2 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 shadow-2xl z-20 flex flex-col gap-2">
      {/* Top Toolbar: Brush Radius & Temperature Presets */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 px-1 text-xs">
        {/* Brush Size Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium hidden sm:inline">Brush:</span>
          {radiuses.map((r) => (
            <button
              key={r}
              onClick={() => onSelectRadius(r)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono transition-all ${
                brushRadius === r
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 scale-105'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Temperature Modifier */}
        <div className="flex items-center gap-1.5" id="temperature-modifier-tools">
          <span className="text-slate-400 font-medium hidden sm:inline">Temp:</span>
          {tempOptions.map((opt) => (
            <button
              key={opt.temp}
              onClick={() => onSelectTemp(opt.temp)}
              id={opt.label === '150°C' ? 'temp-heat-tool' : `temp-option-${Math.round(opt.temp)}`}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 font-mono transition-all ${
                Math.abs(brushTempK - opt.temp) < 1
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.icon}
              <span className="text-[11px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chemical Inventory Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Eraser Tool */}
        <button
          onClick={() => onSelectItem('empty')}
          id="item-tool-empty"
          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
            selectedItemId === 'empty'
              ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Eraser className="w-4 h-4" />
          <span className="text-xs font-semibold">Vacuum</span>
        </button>

        {/* Unlocked Products */}
        {unlockedItems.map((item) => {
          const primaryMol = molecules[item.primary_compound];
          const isSelected = selectedItemId === item.id;
          const molColor = primaryMol?.color || '#38bdf8';

          return (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              id={`item-tool-${item.id}`}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-slate-800 border-sky-400 text-white shadow-lg shadow-sky-500/20 scale-105'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full ring-1 ring-white/30"
                style={{ backgroundColor: molColor.substring(0, 7) }}
              />
              <div className="flex flex-col items-start leading-none">
                <span className="text-xs font-semibold">{item.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {primaryMol?.formula || item.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
