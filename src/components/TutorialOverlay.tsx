import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface TutorialOverlayProps {
  isOpen: boolean;
  onComplete: () => void;
  onOpenStore?: () => void;
}

interface TutorialStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  instructions: string;
  targetElementId: string;
  targetDescription: string;
  icon: React.ReactNode;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TutorialStep[] = [
    {
      stepNumber: 1,
      title: 'The Chemical Store',
      subtitle: 'Acquire Authentic Reactants',
      instructions:
        'Everyday household items are discrete chemical compounds. Click the Store button to inspect verified molecular compositions like Tap Water (100% H₂O) and Play Sand (100% SiO₂).',
      targetElementId: 'open-store-button',
      targetDescription: 'Top Navigation → Store Button',
      icon: <ShoppingBag className="w-5 h-5 text-indigo-400" />,
    },
    {
      stepNumber: 2,
      title: 'Density & Gravity Sorting',
      subtitle: 'Paint & Observe Particulates',
      instructions:
        'Select Play Sand from your palette and draw inside the laboratory tank. Dense granular silica falls and stacks with a realistic angle of repose, while liquids displace according to density.',
      targetElementId: 'simulation-canvas',
      targetDescription: 'Simulation Canvas Tank',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    },
    {
      stepNumber: 3,
      title: 'Thermodynamics & Phase Changes',
      subtitle: 'Boiling Liquids into Steam',
      instructions:
        'Select the Heat Tool (150°C). When liquid water heats above its empirical boiling point of 373.15 K (100°C), it flashes into buoyant, expanding steam!',
      targetElementId: 'temp-heat-tool',
      targetDescription: 'Bottom Palette → Heat Tool (150°C)',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
  ];

  const activeStep = steps[currentStep - 1];

  // Update target element bounding rectangle on step change and resize
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      const el = document.getElementById(activeStep.targetElementId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isOpen, currentStep, activeStep.targetElementId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  // Determine dialog position relative to target
  const dialogPositionClass =
    currentStep === 1
      ? 'top-20 sm:top-24 left-1/2 -translate-x-1/2'
      : currentStep === 3
        ? 'bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2'
        : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      id="tutorial-overlay"
      data-testid="tutorial-overlay"
    >
      {/* SVG Cutout Mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.x - 6)}
                y={Math.max(0, targetRect.y - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.78)" mask="url(#tutorial-mask)" />
      </svg>

      {/* Target Glowing Spotlight Ring */}
      {targetRect && (
        <div
          className="fixed border-2 border-sky-400 ring-4 ring-sky-400/40 rounded-xl pointer-events-none z-40 transition-all duration-300 animate-pulse shadow-2xl shadow-sky-500/50"
          style={{
            top: Math.max(0, targetRect.y - 6),
            left: Math.max(0, targetRect.x - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tutorial Guidance Card */}
      <div
        className={`absolute z-50 w-[92%] max-w-lg p-6 rounded-3xl bg-slate-900/95 border border-sky-500/40 shadow-2xl shadow-sky-500/20 flex flex-col gap-4 text-white backdrop-blur-xl ${dialogPositionClass}`}
        id={`tutorial-step-${currentStep}`}
      >
        {/* Skip button */}
        <button
          onClick={onComplete}
          id="skip-tutorial-button"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Skip Guided Tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with step progress */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {activeStep.icon}
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Tutorial Step {activeStep.stepNumber} of {steps.length}
              </span>
              <h2 className="text-lg font-black tracking-tight" id="tutorial-step-title">
                {activeStep.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Target Area Highlight Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Focus Area: {activeStep.targetDescription}</span>
        </div>

        {/* Step Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">{activeStep.subtitle}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{activeStep.instructions}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {steps.map((s) => (
              <div
                key={s.stepNumber}
                className={`h-1.5 rounded-full transition-all ${
                  s.stepNumber === currentStep
                    ? 'w-6 bg-sky-400'
                    : s.stepNumber < currentStep
                      ? 'w-3 bg-emerald-400'
                      : 'w-3 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onComplete}
              id="tutorial-skip-btn"
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              id="tutorial-next-button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>{currentStep === steps.length ? 'Finish Onboarding' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
