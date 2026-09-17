import React, { useState } from 'react';
import { Molecule } from '../types/chemistry';
import { X, BookOpen, AlertTriangle, Lock, ShieldAlert, Search } from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  molecules: Record<string, Molecule>;
  discoveredCompoundIds: string[];
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  molecules,
  discoveredCompoundIds,
}) => {
  const [selectedMoleculeId, setSelectedMoleculeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'discovered' | 'hazards'>('all');

  if (!isOpen) return null;

  const moleculeList = Object.values(molecules).filter((m) => m.id !== 'empty');
  const isDiscovered = (id: string) => discoveredCompoundIds.includes(id);

  const filteredMolecules = moleculeList.filter((m) => {
    const discovered = isDiscovered(m.id);
    if (activeFilter === 'discovered' && !discovered) return false;
    if (activeFilter === 'hazards' && (!discovered || m.hazard_rating === 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = discovered && m.name.toLowerCase().includes(q);
      const matchFormula = discovered && m.formula.toLowerCase().includes(q);
      const matchId = m.id.toLowerCase().includes(q);
      return matchName || matchFormula || matchId;
    }
    return true;
  });

  const activeMolecule = selectedMoleculeId
    ? molecules[selectedMoleculeId]
    : filteredMolecules.find((m) => isDiscovered(m.id)) || filteredMolecules[0] || moleculeList[0];

  const getHazardBadge = (rating: number) => {
    switch (rating) {
      case 0:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">Safe</span>
        );
      case 1:
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Caution
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 rounded-md bg-orange-950/80 border border-orange-500/40 text-orange-400 text-xs flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 3:
      case 4:
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/50 text-rose-400 text-xs flex items-center gap-1 font-bold animate-pulse">
            <ShieldAlert className="w-3 h-3" /> DANGER (HAZARD)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        id="journal-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Laboratory Journal & Chem-Dex
              </h2>
              <p className="text-xs text-slate-400">
                Discovered {discoveredCompoundIds.length} of {moleculeList.length} empirical
                compounds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-journal-button"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split View (List on left, Detail on right) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Compound Entries List */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800/80 p-3 flex flex-col gap-2 max-h-72 md:max-h-full">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chemical name or formula..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                All ({moleculeList.length})
              </button>
              <button
                onClick={() => setActiveFilter('discovered')}
                className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'discovered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                Unlocked ({discoveredCompoundIds.length})
              </button>
              <button
                onClick={() => setActiveFilter('hazards')}
                className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'hazards'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                Hazards ⚠️
              </button>
            </div>

            {/* Compound Item List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredMolecules.map((mol) => {
                const discovered = isDiscovered(mol.id);
                const isSelected = activeMolecule?.id === mol.id;

                return (
                  <button
                    key={mol.id}
                    onClick={() => setSelectedMoleculeId(mol.id)}
                    id={`journal-item-${mol.id}`}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500/60 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {discovered ? (
                        <div
                          className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
                          style={{ backgroundColor: mol.color.substring(0, 7) }}
                        />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <div>
                        <div className="text-xs font-semibold">
                          {discovered ? mol.name : 'Unknown Compound'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {discovered ? mol.formula : '???'}
                        </div>
                      </div>
                    </div>

                    {discovered && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {mol.state}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Compound Inspector */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
            {activeMolecule ? (
              isDiscovered(activeMolecule.id) ? (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Title & Formula */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {activeMolecule.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-sky-950 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold">
                          {activeMolecule.formula}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 capitalize font-medium">
                        Standard State: {activeMolecule.state}
                      </p>
                    </div>

                    <div>{getHazardBadge(activeMolecule.hazard_rating)}</div>
                  </div>

                  {/* Hazard Warning Protocol Alert */}
                  {activeMolecule.hazard_rating >= 2 && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs leading-relaxed shadow-lg">
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-300 block mb-0.5">
                          CHEMICAL SAFETY PROTOCOL:
                        </span>
                        {activeMolecule.hazard_description}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 leading-relaxed text-slate-300 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Scientific Description
                    </span>
                    {activeMolecule.description}
                  </div>

                  {/* Physical & Thermodynamic Constants Grid */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Empirical Physical Constants
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Density</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.density} g/cm³
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Boiling Point</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.boiling_point_k} K (
                          {Math.round(activeMolecule.boiling_point_k - 273.15)}°C)
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Melting Point</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.melting_point_k} K (
                          {Math.round(activeMolecule.melting_point_k - 273.15)}°C)
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Specific Heat</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.specific_heat} J/(g·K)
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Thermal Cond.</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.thermal_conductivity} W/(m·K)
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Flammability</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {activeMolecule.flammable ? 'Flammable 🔥' : 'Non-Flammable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                  <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800">
                    <Lock className="w-8 h-8 text-slate-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-400">Undiscovered Compound</h4>
                  <p className="text-xs max-w-sm text-slate-500 leading-relaxed">
                    This chemical compound has not yet been synthesized or discovered in your lab.
                    Mix reactive compounds in the simulation tank to unlock this entry.
                  </p>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
