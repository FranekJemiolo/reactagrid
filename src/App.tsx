import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HUD } from './components/HUD';
import { BrushPalette } from './components/BrushPalette';
import { StoreModal } from './components/StoreModal';
import { JournalModal } from './components/JournalModal';
import { DiscoveryNotification, DiscoveryToast } from './components/DiscoveryNotification';
import { SimulationWorkerBridge } from './engine/workerBridge';
import { ChemicalDatabase, StoreItem } from './types/chemistry';
import { UserProgress } from './types/game';
import { loadProgress, saveProgress } from './storage/db';

import moleculesJson from './data/molecules.json';
import reactionsJson from './data/reactions.json';
import storeItemsJson from './data/store_items.json';

const chemicalDatabase: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

const GRID_WIDTH = 180;
const GRID_HEIGHT = 180;

export const App: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [activeParticles, setActiveParticles] = useState<number>(0);
  const [avgTemp, setAvgTemp] = useState<number>(298.15);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Brush & Toolbar State
  const [selectedItemId, setSelectedItemId] = useState<string>('item_tap_water');
  const [brushRadius, setBrushRadius] = useState<number>(3);
  const [brushTempK, setBrushTempK] = useState<number>(298.15);

  // Modal Views
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<DiscoveryToast[]>([]);

  // Simulation references
  const bridgeRef = useRef<SimulationWorkerBridge | null>(null);
  const pixelsRef = useRef<Uint32Array | null>(null);
  const progressRef = useRef<UserProgress | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const addToast = useCallback((toast: Omit<DiscoveryToast, 'id'>) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize IndexedDB progress & Worker Bridge
  useEffect(() => {
    let bridge: SimulationWorkerBridge | null = null;

    async function init() {
      const saved = await loadProgress();
      setProgress(saved);

      bridge = new SimulationWorkerBridge({
        onFrame: (data) => {
          pixelsRef.current = data.pixels;
          setFps(data.fps);
          setActiveParticles(data.activeParticles);
          setAvgTemp(data.avgTemperature);
        },
        onReaction: (rxn) => {
          const current = progressRef.current;
          if (!current) return;

          const isNew = !current.discoveredReactions.includes(rxn.reactionId);
          const reward = isNew ? rxn.reward : 1; // Base micro-grant for running reactions

          const updated: UserProgress = {
            ...current,
            funds: current.funds + reward,
            totalEarned: current.totalEarned + reward,
            totalReactionsTriggered: current.totalReactionsTriggered + 1,
            energyGeneratedKj: current.energyGeneratedKj + Math.abs(rxn.heatYield),
            discoveredReactions: isNew
              ? [...current.discoveredReactions, rxn.reactionId]
              : current.discoveredReactions,
          };

          setProgress(updated);
          saveProgress(updated);

          if (isNew) {
            addToast({
              title: 'Reaction Discovered!',
              message: `${rxn.name}: Discovered new reaction chemistry!`,
              reward: rxn.reward,
            });
          }
        },
        onCompoundDiscovered: (compoundId) => {
          const current = progressRef.current;
          if (!current || current.discoveredCompounds.includes(compoundId)) return;

          const mol = chemicalDatabase.molecules[compoundId];
          const updated: UserProgress = {
            ...current,
            discoveredCompounds: [...current.discoveredCompounds, compoundId],
          };

          setProgress(updated);
          saveProgress(updated);

          addToast({
            title: 'New Compound Synthesized!',
            message: `Unlocked ${mol?.name || compoundId} (${mol?.formula || ''}) in your Lab Journal!`,
          });
        },
      });

      await bridge.init(GRID_WIDTH, GRID_HEIGHT, chemicalDatabase);
      bridge.start();
      bridgeRef.current = bridge;
    }

    init();

    return () => {
      bridge?.terminate();
    };
  }, [addToast]);

  const handleTogglePlay = () => {
    if (!bridgeRef.current) return;
    if (isRunning) {
      bridgeRef.current.pause();
      setIsRunning(false);
    } else {
      bridgeRef.current.start();
      setIsRunning(true);
    }
  };

  const handleStep = () => {
    if (!bridgeRef.current) return;
    bridgeRef.current.step();
  };

  const handleClear = () => {
    if (!bridgeRef.current) return;
    bridgeRef.current.clear();
  };

  const handlePaint = (gridX: number, gridY: number) => {
    if (!bridgeRef.current) return;

    let targetCompound = 'empty';

    if (selectedItemId !== 'empty') {
      const storeItem = chemicalDatabase.storeItems.find((i) => i.id === selectedItemId);
      if (storeItem) {
        // Roll mixture composition
        const roll = Math.random() * 100;
        let cumulative = 0;
        targetCompound = storeItem.primary_compound;

        for (const comp of storeItem.composition) {
          cumulative += comp.percentage;
          if (roll <= cumulative) {
            targetCompound = comp.compound;
            break;
          }
        }
      }
    }

    bridgeRef.current.paint({
      x: gridX,
      y: gridY,
      radius: brushRadius,
      compoundId: targetCompound,
      temperature: brushTempK,
    });
  };

  const handlePurchase = (item: StoreItem) => {
    if (!progress || progress.funds < item.cost) return;

    const updated: UserProgress = {
      ...progress,
      funds: progress.funds - item.cost,
      unlockedStoreItems: [...progress.unlockedStoreItems, item.id],
    };

    setProgress(updated);
    saveProgress(updated);

    setSelectedItemId(item.id);

    addToast({
      title: 'Item Unlocked',
      message: `Purchased ${item.name}! Added to your active chemical palette.`,
    });
  };

  const unlockedItems = chemicalDatabase.storeItems.filter(
    (item) => progress?.unlockedStoreItems.includes(item.id) || item.unlocked_by_default,
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Heads-Up Display */}
      <HUD
        fps={fps}
        activeParticles={activeParticles}
        avgTemperature={avgTemp}
        funds={progress?.funds ?? 0}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onStep={handleStep}
        onClear={handleClear}
        onOpenStore={() => setIsStoreOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
        discoveredCount={progress?.discoveredCompounds.length ?? 0}
        totalCompoundsCount={Object.keys(chemicalDatabase.molecules).length - 1}
      />

      {/* Main Simulation Tank Canvas */}
      <CanvasRenderer
        width={GRID_WIDTH}
        height={GRID_HEIGHT}
        onPaint={handlePaint}
        pixelsRef={pixelsRef}
        brushRadius={brushRadius}
      />

      {/* Brush & Chemical Selection Palette */}
      <BrushPalette
        unlockedItems={unlockedItems}
        molecules={chemicalDatabase.molecules}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        brushRadius={brushRadius}
        onSelectRadius={setBrushRadius}
        brushTempK={brushTempK}
        onSelectTemp={setBrushTempK}
      />

      {/* Store Drawer Modal */}
      <StoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        storeItems={chemicalDatabase.storeItems}
        molecules={chemicalDatabase.molecules}
        unlockedItemIds={progress?.unlockedStoreItems ?? []}
        funds={progress?.funds ?? 0}
        onPurchase={handlePurchase}
      />

      {/* Discovery Journal Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        molecules={chemicalDatabase.molecules}
        discoveredCompoundIds={progress?.discoveredCompounds ?? []}
      />

      {/* Discovery Notification Banners */}
      <DiscoveryNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
