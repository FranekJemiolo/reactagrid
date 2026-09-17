import React from 'react';
import { Trophy, Star, Lock, Play, X, Target, Clock } from 'lucide-react';
import { CampaignLevel } from '../types/campaign';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: CampaignLevel[];
  completedLevels: Record<string, number>;
  activeLevelId: string | null;
  onSelectLevel: (level: CampaignLevel) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  levels,
  completedLevels,
  activeLevelId,
  onSelectLevel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      id="campaign-modal"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] p-6 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                Laboratory Campaign Missions
              </h2>
              <p className="text-xs text-slate-400">
                Complete chemistry puzzles, master thermodynamics, and earn star ratings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-campaign-button"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Select Grid */}
        <div className="overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {levels.map((level, index) => {
            const isFirst = index === 0;
            const prevLevel = index > 0 ? levels[index - 1] : null;
            const prevStars = prevLevel ? (completedLevels[prevLevel.id] ?? 0) : 0;
            const isUnlocked = isFirst || prevStars > 0;
            const stars = completedLevels[level.id] ?? 0;
            const isActive = activeLevelId === level.id;

            return (
              <div
                key={level.id}
                id={`campaign-level-${level.id}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !isUnlocked
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : isActive
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                {/* Level Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold border border-slate-700">
                      {level.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      {level.title}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] border border-sky-500/30">
                          Active
                        </span>
                      )}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{level.description}</p>

                  {/* Objective & Star thresholds */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Target className="w-3.5 h-3.5" />
                      Goal: {level.winCondition.description}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      3★: ≤{level.starRequirements.threeStarsMaxSeconds}s
                    </span>
                  </div>
                </div>

                {/* Stars and Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0">
                  {/* Star Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((starIndex) => (
                      <Star
                        key={starIndex}
                        className={`w-4 h-4 ${
                          starIndex <= stars
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Button */}
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        onSelectLevel(level);
                        onClose();
                      }}
                      id={`play-level-${level.id}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isActive ? 'Restart' : stars > 0 ? 'Replay' : 'Launch'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </div>
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
