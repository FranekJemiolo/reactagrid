import React, { useState } from 'react';
import { StoreItem, Molecule } from '../types/chemistry';
import { X, Check, DollarSign, ShoppingBag } from 'lucide-react';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeItems: StoreItem[];
  molecules: Record<string, Molecule>;
  unlockedItemIds: string[];
  funds: number;
  onPurchase: (item: StoreItem) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  isOpen,
  onClose,
  storeItems,
  molecules,
  unlockedItemIds,
  funds,
  onPurchase,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Basics', 'Household', 'Cleaning', 'Metals', 'Advanced'];

  const filteredItems = storeItems.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        id="store-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Chemical Store</h2>
              <p className="text-xs text-slate-400">
                Purchase verified consumer products and chemical precursors using Research Grants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{funds}</span>
            </div>
            <button
              onClick={onClose}
              id="close-store-button"
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 p-3 px-5 border-b border-slate-800/80 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Catalog Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {filteredItems.map((item) => {
            const isUnlocked = unlockedItemIds.includes(item.id);
            const canAfford = funds >= item.cost;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-slate-900/60 border-slate-700/50'
                    : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{item.cost === 0 ? 'Free' : item.cost}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>

                  {/* Composition Breakdown */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Real Chemical Composition
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.composition.map((c) => {
                        const m = molecules[c.compound];
                        return (
                          <span
                            key={c.compound}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-200 font-mono"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: m?.color.substring(0, 7) || '#38bdf8' }}
                            />
                            <span>{m?.name || c.compound}:</span>
                            <span className="font-bold text-sky-400">{c.percentage}%</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Purchase Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-end">
                  {isUnlocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onPurchase(item)}
                      disabled={!canAfford}
                      id={`buy-button-${item.id}`}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Unlock for ${item.cost}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
