import React from 'react';
import { X, Keyboard, Zap, Eye, Sliders, Palette } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories: ShortcutCategory[] = [
    {
      title: 'Simulation Controls',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      items: [
        { keys: ['Space'], description: 'Play / Pause simulation' },
        { keys: ['.', 'S'], description: 'Step forward 1 frame' },
        { keys: ['C'], description: 'Clear laboratory tank' },
      ],
    },
    {
      title: 'Sensors & Physics Modes',
      icon: <Eye className="w-4 h-4 text-sky-400" />,
      items: [
        { keys: ['T'], description: 'Toggle Thermal IR Vision (FLIR heat map)' },
        { keys: ['G'], description: 'Cycle Gravity (Normal 1G → Zero 0G → Inverted -1G)' },
        { keys: ['P'], description: 'Toggle Pixel Inspector Probe Tool' },
        { keys: ['M'], description: 'Toggle procedural audio mute' },
      ],
    },
    {
      title: 'Tools & Brush Palette',
      icon: <Palette className="w-4 h-4 text-emerald-400" />,
      items: [
        { keys: ['E'], description: 'Select Vacuum / Eraser tool' },
        { keys: ['1', '2', '3', '4', '5'], description: 'Select brush radius (1, 3, 5, 8, 14 px)' },
        { keys: ['[', ']'], description: 'Decrease / increase brush size' },
      ],
    },
    {
      title: 'Interface & Help',
      icon: <Sliders className="w-4 h-4 text-indigo-400" />,
      items: [
        { keys: ['?'], description: 'Open / close this shortcuts guide' },
        { keys: ['Esc'], description: 'Close any open drawer or modal' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        id="shortcuts-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">
                Tactile desktop controls for laboratory efficiency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-shortcuts-modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                {cat.icon}
                <span>{cat.title}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {cat.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-xs text-slate-300">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-200 bg-slate-800 border border-slate-600/60 rounded shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">
              ?
            </kbd>{' '}
            anywhere to toggle this guide
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
