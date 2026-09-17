import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export interface DiscoveryToast {
  id: string;
  title: string;
  message: string;
  reward?: number;
}

interface DiscoveryNotificationProps {
  toasts: DiscoveryToast[];
  onDismiss: (id: string) => void;
}

export const DiscoveryNotification: React.FC<DiscoveryNotificationProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: DiscoveryToast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/95 border border-sky-500/50 shadow-xl backdrop-blur-xl text-white animate-in slide-in-from-top-4 duration-300">
      <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 shrink-0">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 pr-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-sky-300 tracking-wide uppercase">{toast.title}</h4>
          {toast.reward && toast.reward > 0 && (
            <span className="flex items-center text-xs font-black text-emerald-400 font-mono">
              +${toast.reward}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
