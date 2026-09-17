import React, { useState, useEffect } from 'react';
import { LabSaveState } from '../types/game';
import { loadSnapshots } from '../storage/db';
import { X, Bookmark, Play, Plus, FlaskConical } from 'lucide-react';

interface SnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset: (presetId: string) => void;
  onRequestSaveSnapshot: (name: string) => void;
  onLoadSnapshotState: (types: Uint16Array, temps: Float32Array) => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({
  isOpen,
  onClose,
  onLoadPreset,
  onRequestSaveSnapshot,
  onLoadSnapshotState,
}) => {
  const [snapshots, setSnapshots] = useState<LabSaveState[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSnapshots().then(setSnapshots);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'volcano',
      name: 'The Volcano Experiment',
      desc: 'Baking Soda foundation with White Vinegar suspended ready to mix and create volcanic CO₂ bubbling.',
      icon: '🌋',
      tags: ['Baking Soda', 'Vinegar', 'Gas Expansion'],
    },
    {
      id: 'density_tower',
      name: '4-Liquid Density Tower',
      desc: 'Stratification demonstration with Alcohol, Water, Vinegar, and Bleach sorting by density.',
      icon: '🧪',
      tags: ['Alcohol (0.79)', 'Water (1.00)', 'Bleach (1.11)'],
    },
    {
      id: 'sodium_blast',
      name: 'Sodium Hydrolysis Blast',
      desc: 'Water reservoir with a suspended metallic sodium pellet. Demonstrates violent exothermic hydrogen release.',
      icon: '💥',
      tags: ['Sodium', 'Water', 'Explosion'],
    },
    {
      id: 'rust_chamber',
      name: 'Corrosion Study',
      desc: 'Moist iron filings in the presence of water and ambient oxygen undergoing slow oxidation into rust.',
      icon: '⚙️',
      tags: ['Iron', 'Water', 'Rusting'],
    },
  ];

  const handleSave = () => {
    if (!newSnapshotName.trim()) return;
    onRequestSaveSnapshot(newSnapshotName.trim());
    setNewSnapshotName('');
    setTimeout(() => {
      loadSnapshots().then(setSnapshots);
    }, 200);
  };

  const handleRestore = (snap: LabSaveState) => {
    try {
      const typeBytes = Uint8Array.from(atob(snap.typesBase64), (c) => c.charCodeAt(0));
      const types = new Uint16Array(typeBytes.buffer);

      const tempBytes = Uint8Array.from(atob(snap.tempsBase64), (c) => c.charCodeAt(0));
      const temps = new Float32Array(tempBytes.buffer);

      onLoadSnapshotState(types, temps);
      onClose();
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        id="snapshots-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Lab Presets & Snapshots
              </h2>
              <p className="text-xs text-slate-400">
                Launch pre-configured chemistry demonstrations or save your own lab layouts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-snapshots-button"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Preset Experiments Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Curated Laboratory Experiments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-amber-500/50 transition-all group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{p.icon}</span>
                      <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                        {p.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-700/40 flex justify-end">
                    <button
                      onClick={() => {
                        onLoadPreset(p.id);
                        onClose();
                      }}
                      id={`load-preset-${p.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Load Experiment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Saved Snapshots Section */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Custom Saved Lab Snapshots
            </h3>

            {/* Save Current State Form */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="Name current lab configuration..."
                id="snapshot-name-input"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSave}
                id="save-snapshot-button"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30 transition-all hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Snapshot</span>
              </button>
            </div>

            {/* Snapshots List */}
            {snapshots.length > 0 ? (
              <div className="space-y-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <div>
                      <span className="font-semibold text-xs text-white">{snap.name}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(snap.timestamp).toLocaleDateString()} at{' '}
                        {new Date(snap.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(snap)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                No custom snapshots saved yet. Build a configuration in the tank and save it above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
