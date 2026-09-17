import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  ShoppingBag,
  BookOpen,
  DollarSign,
  Activity,
  Thermometer,
  Camera,
  HelpCircle,
  FastForward,
  GraduationCap,
  Trophy,
  Waves,
} from 'lucide-react';

interface HUDProps {
  fps: number;
  activeParticles: number;
  avgTemperature: number;
  funds: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onClear: () => void;
  floorDrain?: boolean;
  onToggleFloorDrain?: () => void;
  onFlushFloor?: () => void;
  onOpenStore: () => void;
  onOpenJournal: () => void;
  onOpenSnapshots: () => void;
  renderMode: 'natural' | 'thermal';
  onToggleRenderMode: () => void;
  gravity: 1 | 0 | -1;
  onToggleGravity: () => void;
  isProbeActive: boolean;
  onToggleProbe: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  speedMultiplier: number;
  onCycleSpeed: () => void;
  onExportSnapshot: () => void;
  onOpenShortcuts: () => void;
  onOpenTutorial?: () => void;
  onOpenCampaign?: () => void;
  maxTemperature?: number;
  minTemperature?: number;
  hoveredCell?: {
    x: number;
    y: number;
    compoundId: string;
    name: string;
    tempK: number;
  } | null;
  discoveredCount: number;
  totalCompoundsCount: number;
}

export const HUD: React.FC<HUDProps> = ({
  fps,
  activeParticles,
  avgTemperature,
  maxTemperature,
  minTemperature,
  hoveredCell,
  funds,
  isRunning,
  onTogglePlay,
  onStep,
  onClear,
  floorDrain,
  onToggleFloorDrain,
  onFlushFloor,
  onOpenStore,
  onOpenJournal,
  onOpenSnapshots,
  renderMode,
  onToggleRenderMode,
  gravity,
  onToggleGravity,
  isProbeActive,
  onToggleProbe,
  isMuted,
  onToggleMute,
  speedMultiplier,
  onCycleSpeed,
  onExportSnapshot,
  onOpenShortcuts,
  onOpenTutorial,
  onOpenCampaign,
  discoveredCount,
  totalCompoundsCount,
}) => {
  const tempCelsius = Math.round(avgTemperature - 273.15);
  const maxCelsius =
    maxTemperature !== undefined ? Math.round(maxTemperature - 273.15) : tempCelsius;
  const minCelsius =
    minTemperature !== undefined ? Math.round(minTemperature - 273.15) : tempCelsius;

  const getFpsColor = (fpsVal: number) => {
    if (fpsVal >= 55) return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
    if (fpsVal >= 40) return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
  };

  return (
    <header className="w-full p-2 sm:p-3 pointer-events-none flex flex-wrap items-center justify-between gap-2 z-20">
      {/* Brand & Stats Overlay */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg text-white font-semibold">
          <span className="text-xl">🧪</span>
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent font-bold tracking-tight">
            ReactaGrid
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 font-mono">
            PWA
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs border backdrop-blur-md shadow-md ${getFpsColor(fps)}`}
          id="fps-counter"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{fps} FPS</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 shadow-md">
          <span>{activeParticles.toLocaleString()} particles</span>
        </div>

        {/* Tank Average Temperature with Peak & Low Heat Indicators */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-mono text-xs bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-amber-300 shadow-md cursor-help transition-all hover:border-amber-500/50"
          id="temperature-telemetry"
          title={`Tank Average Temperature: ${tempCelsius}°C (${Math.round(avgTemperature)} K)\n\n• Baseline Room Ambient: 25°C (298.15 K)\n• Tank Peak Temperature: ${maxCelsius}°C\n• Tank Lowest Temperature: ${minCelsius}°C\n\nClick the Inspector Probe [🔍] or hover cells to read localized temperature.`}
        >
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-sans text-[11px] font-medium">Tank Avg:</span>
          <span className="font-bold">
            {tempCelsius}°C ({Math.round(avgTemperature)} K)
          </span>

          {maxTemperature !== undefined && maxCelsius > tempCelsius + 10 && (
            <span
              className="text-rose-400 text-[10px] pl-1.5 border-l border-slate-700 font-semibold"
              title={`Hottest active cell in tank: ${maxCelsius}°C`}
            >
              Peak: {maxCelsius}°C
            </span>
          )}

          {minTemperature !== undefined && minCelsius < tempCelsius - 10 && (
            <span
              className="text-cyan-400 text-[10px] pl-1.5 border-l border-slate-700 font-semibold"
              title={`Coldest active cell in tank: ${minCelsius}°C`}
            >
              Low: {minCelsius}°C
            </span>
          )}
        </div>

        {/* Live Local Cell Temperature under Cursor */}
        {hoveredCell && hoveredCell.compoundId !== 'empty' && (
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs bg-slate-900/80 backdrop-blur-md border border-sky-500/40 text-sky-300 shadow-md"
            title={`Local cell temperature at (${hoveredCell.x}, ${hoveredCell.y}): ${Math.round(hoveredCell.tempK - 273.15)}°C`}
          >
            <span className="text-slate-400 font-sans text-[11px] font-medium">Local:</span>
            <span className="font-bold text-white">{Math.round(hoveredCell.tempK - 273.15)}°C</span>
            <span className="text-sky-400 text-[10px] font-sans">
              ({hoveredCell.name || hoveredCell.compoundId})
            </span>
          </div>
        )}
      </div>

      {/* Economy Wallet & Modals Trigger */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Research Funds Badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-bold text-sm shadow-lg"
          id="funds-display"
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>{funds}</span>
          <span className="text-xs text-emerald-400/80 font-normal">Grants</span>
        </div>

        {/* Store Button */}
        <button
          onClick={onOpenStore}
          id="open-store-button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Store</span>
        </button>

        {/* Discovery Journal Button */}
        <button
          onClick={onOpenJournal}
          id="open-journal-button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Journal</span>
          <span className="px-1 py-0.2 text-[10px] rounded-full bg-sky-900/80 text-sky-200">
            {discoveredCount}/{totalCompoundsCount}
          </span>
        </button>

        {/* Experiments & Presets Button */}
        <button
          onClick={onOpenSnapshots}
          id="open-snapshots-button"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <span>Presets</span>
        </button>

        {/* Gravity Controls */}
        <button
          onClick={onToggleGravity}
          id="toggle-gravity-button"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md"
          title="Cycle Gravity: 1G Earth / 0G Microgravity / -1G Inverted"
        >
          <span>{gravity === 1 ? '1G ⬇' : gravity === 0 ? '0G 🪐' : '-1G ⬆'}</span>
        </button>

        {/* Speed Controls */}
        <button
          onClick={onCycleSpeed}
          id="cycle-speed-button"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700/60 text-indigo-300 hover:text-white transition-all shadow-md"
          title="Cycle Simulation Speed: 0.5x, 1x, 2x, 4x"
        >
          <FastForward className="w-3.5 h-3.5 text-indigo-400" />
          <span>{speedMultiplier}x</span>
        </button>

        {/* Floor Waste Drain Toggle */}
        {onToggleFloorDrain && (
          <button
            onClick={onToggleFloorDrain}
            id="toggle-floor-drain-button"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
              floorDrain
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/30 scale-105'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title={
              floorDrain
                ? 'Tank Floor Drain: OPEN [D] — Draining bottom sediment & recycling into funds'
                : 'Tank Floor Drain: SEALED [D] — Click to open floor waste drain'
            }
          >
            <span>{floorDrain ? '🚰' : '🛡️'}</span>
            <span className="hidden sm:inline font-mono">
              {floorDrain ? 'Drain: Open' : 'Drain: Sealed'}
            </span>
          </button>
        )}

        {/* Pixel Probe Inspector Toggle */}
        <button
          onClick={onToggleProbe}
          id="toggle-probe-button"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
            isProbeActive
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/30 scale-105'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
          }`}
          title="Toggle Pixel Probe Inspector"
        >
          <span>🔍</span>
          <span className="hidden lg:inline">Probe</span>
        </button>

        {/* Thermal Vision Toggle */}
        <button
          onClick={onToggleRenderMode}
          id="toggle-thermal-button"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
            renderMode === 'thermal'
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-500/30 scale-105'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
          }`}
          title="Toggle Thermal Vision (FLIR IR)"
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {renderMode === 'thermal' ? 'Thermal IR' : 'Natural'}
          </span>
        </button>

        {/* Canvas PNG Snapshot Export */}
        <button
          onClick={onExportSnapshot}
          id="export-snapshot-button"
          className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          title="Export Lab Tank PNG Snapshot"
        >
          <Camera className="w-4 h-4 text-sky-400" />
        </button>

        {/* Audio Mute/Unmute Toggle */}
        <button
          onClick={onToggleMute}
          id="toggle-audio-button"
          className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          title={isMuted ? 'Unmute Procedural Audio' : 'Mute Audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Interactive Guided Tutorial */}
        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            id="open-tutorial-button"
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="Interactive Tutorial"
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Campaign Levels Mode */}
        {onOpenCampaign && (
          <button
            onClick={onOpenCampaign}
            id="open-campaign-button"
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="Campaign Missions & Levels"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>
        )}

        {/* Keyboard Shortcuts Guide */}
        <button
          onClick={onOpenShortcuts}
          id="open-shortcuts-button"
          className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          title="Keyboard Shortcuts Guide (?)"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
        </button>

        {/* Simulation Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg">
          <button
            onClick={onTogglePlay}
            id="toggle-play-button"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
            title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            onClick={onStep}
            id="step-button"
            disabled={isRunning}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 disabled:opacity-30 transition-colors"
            title="Step 1 Frame"
          >
            <StepForward className="w-4 h-4" />
          </button>

          {onFlushFloor && (
            <button
              onClick={onFlushFloor}
              id="flush-floor-button"
              className="p-1.5 rounded-lg hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Flush Tank Floor: Clears dynamic sediment on bottom without clearing glassware or heaters"
            >
              <Waves className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClear}
            id="clear-lab-button"
            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 transition-colors"
            title="Reset Laboratory Tank"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
