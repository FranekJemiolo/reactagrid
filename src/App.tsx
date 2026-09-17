import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HUD } from './components/HUD';
import { BrushPalette } from './components/BrushPalette';
import { StoreModal } from './components/StoreModal';
import { JournalModal } from './components/JournalModal';
import { DiscoveryNotification, DiscoveryToast } from './components/DiscoveryNotification';
import { SimulationWorkerBridge } from './engine/workerBridge';
import { SnapshotsModal } from './components/SnapshotsModal';
import { CellProbe, CellProbeData } from './components/CellProbe';
import { sounds } from './audio/sound';
import { ChemicalDatabase, StoreItem } from './types/chemistry';
import { UserProgress } from './types/game';
import { loadProgress, saveProgress, saveSnapshot } from './storage/db';

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
  const [renderMode, setRenderMode] = useState<'natural' | 'thermal'>('natural');
  const [gravity, setGravity] = useState<1 | 0 | -1>(1);
  const [isProbeActive, setIsProbeActive] = useState<boolean>(false);
  const [probeData, setProbeData] = useState<CellProbeData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Brush & Toolbar State
  const [selectedItemId, setSelectedItemId] = useState<string>('item_tap_water');
  const [brushRadius, setBrushRadius] = useState<number>(3);
  const [brushTempK, setBrushTempK] = useState<number>(298.15);

  // Modal Views
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<DiscoveryToast[]>([]);

  // Simulation references
  const bridgeRef = useRef<SimulationWorkerBridge | null>(null);
  const pixelsRef = useRef<Uint32Array | null>(null);
  const progressRef = useRef<UserProgress | null>(null);
  const pendingSnapshotNameRef = useRef<string>('');

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

  const handleToggleRenderMode = () => {
    const next = renderMode === 'natural' ? 'thermal' : 'natural';
    setRenderMode(next);
    bridgeRef.current?.setRenderMode(next);
  };

  const handleToggleGravity = () => {
    const next: 1 | 0 | -1 = gravity === 1 ? 0 : gravity === 0 ? -1 : 1;
    setGravity(next);
    bridgeRef.current?.setGravity(next);
    addToast({
      title: 'Gravity Altered',
      message:
        next === 1
          ? 'Standard 1G Earth Gravity'
          : next === 0
            ? 'Microgravity 0G (Orbital Space)'
            : 'Inverted -1G Gravity (Ceiling Pull)',
    });
  };

  const handleToggleProbe = () => {
    const next = !isProbeActive;
    setIsProbeActive(next);
    if (!next) setProbeData(null);
  };

  const handleCanvasHover = (gridX: number, gridY: number, screenX: number, screenY: number) => {
    if (!isProbeActive) {
      if (probeData !== null) setProbeData(null);
      return;
    }
    setProbeData({
      x: gridX,
      y: gridY,
      screenX,
      screenY,
      compoundId: 'empty',
      name: '',
      formula: '',
      state: '',
      density: 0,
      tempK: 298.15,
      hazardRating: 0,
    });
    bridgeRef.current?.queryCell(gridX, gridY);
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleLoadPreset = (presetId: string) => {
    if (!bridgeRef.current) return;
    bridgeRef.current.clear();

    const w = GRID_WIDTH;
    const h = GRID_HEIGHT;

    if (presetId === 'volcano') {
      // Build container walls
      for (let y = h - 60; y < h - 10; y++) {
        bridgeRef.current.paint({ x: 30, y, radius: 2, compoundId: 'sio2' });
        bridgeRef.current.paint({ x: w - 30, y, radius: 2, compoundId: 'sio2' });
      }
      for (let x = 30; x <= w - 30; x++) {
        bridgeRef.current.paint({ x, y: h - 10, radius: 2, compoundId: 'sio2' });
      }
      // Fill bottom with Baking Soda
      for (let y = h - 35; y < h - 10; y += 4) {
        for (let x = 35; x < w - 35; x += 4) {
          bridgeRef.current.paint({ x, y, radius: 3, compoundId: 'nahco3' });
        }
      }
      // Pour Vinegar from top
      for (let y = h - 55; y < h - 45; y += 4) {
        for (let x = 45; x < w - 45; x += 4) {
          bridgeRef.current.paint({ x, y, radius: 3, compoundId: 'ch3cooh' });
        }
      }
    } else if (presetId === 'density_tower') {
      // Build wide column
      for (let y = h - 80; y < h - 10; y++) {
        bridgeRef.current.paint({ x: 40, y, radius: 2, compoundId: 'sio2' });
        bridgeRef.current.paint({ x: w - 40, y, radius: 2, compoundId: 'sio2' });
      }
      for (let x = 40; x <= w - 40; x++) {
        bridgeRef.current.paint({ x, y: h - 10, radius: 2, compoundId: 'sio2' });
      }
      // Layer 1 (bottom): Bleach (density 1.11)
      for (let y = h - 25; y < h - 12; y += 3) {
        for (let x = 45; x < w - 45; x += 3) {
          bridgeRef.current.paint({ x, y, radius: 2, compoundId: 'naclo' });
        }
      }
      // Layer 2: Vinegar (density 1.05)
      for (let y = h - 42; y < h - 28; y += 3) {
        for (let x = 45; x < w - 45; x += 3) {
          bridgeRef.current.paint({ x, y, radius: 2, compoundId: 'ch3cooh' });
        }
      }
      // Layer 3: Water (density 1.00)
      for (let y = h - 58; y < h - 45; y += 3) {
        for (let x = 45; x < w - 45; x += 3) {
          bridgeRef.current.paint({ x, y, radius: 2, compoundId: 'h2o' });
        }
      }
      // Layer 4 (top): Alcohol (density 0.79)
      for (let y = h - 75; y < h - 60; y += 3) {
        for (let x = 45; x < w - 45; x += 3) {
          bridgeRef.current.paint({ x, y, radius: 2, compoundId: 'c2h5oh' });
        }
      }
    } else if (presetId === 'sodium_blast') {
      // Fill lower basin with water
      for (let y = h - 50; y < h - 5; y += 4) {
        for (let x = 20; x < w - 20; x += 4) {
          bridgeRef.current.paint({ x, y, radius: 3, compoundId: 'h2o' });
        }
      }
      // Place sodium metal cluster right above surface
      bridgeRef.current.paint({ x: Math.floor(w / 2), y: h - 55, radius: 6, compoundId: 'na' });
    } else if (presetId === 'rust_chamber') {
      // Fill basin with iron filings and spray water
      for (let y = h - 40; y < h - 5; y += 4) {
        for (let x = 25; x < w - 25; x += 4) {
          bridgeRef.current.paint({ x, y, radius: 3, compoundId: 'fe' });
        }
      }
      for (let y = h - 45; y < h - 35; y += 4) {
        for (let x = 30; x < w - 30; x += 6) {
          bridgeRef.current.paint({ x, y, radius: 2, compoundId: 'h2o' });
        }
      }
    }

    addToast({
      title: 'Experiment Loaded',
      message: `Loaded "${presetId}" demonstration into the tank.`,
    });
  };

  const handleRequestSaveSnapshot = (name: string) => {
    pendingSnapshotNameRef.current = name;
    bridgeRef.current?.requestState();
  };

  const handleLoadSnapshotState = (types: Uint16Array, temps: Float32Array) => {
    bridgeRef.current?.loadState(types, temps);
  };

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
        onCellInfo: (info) => {
          setProbeData((prev) =>
            prev && prev.x === info.x && prev.y === info.y ? { ...prev, ...info } : null,
          );
        },
        onReaction: (rxn) => {
          const current = progressRef.current;
          if (!current) return;

          // Procedural sound trigger
          if (Math.abs(rxn.heatYield) > 200 || rxn.reactionId.includes('explosion')) {
            sounds.playExplosion();
          } else {
            sounds.playBubbling();
          }

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
            sounds.playDiscovery();
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

          sounds.playDiscovery();
          addToast({
            title: 'New Compound Synthesized!',
            message: `Unlocked ${mol?.name || compoundId} (${mol?.formula || ''}) in your Lab Journal!`,
          });
        },
        onStateExported: (data) => {
          // Convert to base64 and save
          const typeBytes = new Uint8Array(data.types.buffer);
          let typeStr = '';
          for (let i = 0; i < typeBytes.length; i++) {
            typeStr += String.fromCharCode(typeBytes[i]);
          }
          const typesBase64 = btoa(typeStr);

          const tempBytes = new Uint8Array(data.temps.buffer);
          let tempStr = '';
          for (let i = 0; i < tempBytes.length; i++) {
            tempStr += String.fromCharCode(tempBytes[i]);
          }
          const tempsBase64 = btoa(tempStr);

          const snapshotName = pendingSnapshotNameRef.current || 'Lab State';
          saveSnapshot({
            id: `snap_${Date.now()}`,
            name: snapshotName,
            timestamp: Date.now(),
            width: data.width,
            height: data.height,
            typesBase64,
            tempsBase64,
          });

          addToast({
            title: 'Snapshot Saved',
            message: `Saved configuration "${snapshotName}" to IndexedDB.`,
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
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        renderMode={renderMode}
        onToggleRenderMode={handleToggleRenderMode}
        gravity={gravity}
        onToggleGravity={handleToggleGravity}
        isProbeActive={isProbeActive}
        onToggleProbe={handleToggleProbe}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        discoveredCount={progress?.discoveredCompounds.length ?? 0}
        totalCompoundsCount={Object.keys(chemicalDatabase.molecules).length - 1}
      />

      {/* Main Simulation Tank Canvas */}
      <CanvasRenderer
        width={GRID_WIDTH}
        height={GRID_HEIGHT}
        onPaint={handlePaint}
        onHover={handleCanvasHover}
        pixelsRef={pixelsRef}
        brushRadius={brushRadius}
      />

      {/* Real-time Pixel Probe Tooltip */}
      <CellProbe data={probeData} molecules={chemicalDatabase.molecules} />

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

      {/* Lab Presets & Saved Snapshots Modal */}
      <SnapshotsModal
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
        onLoadPreset={handleLoadPreset}
        onRequestSaveSnapshot={handleRequestSaveSnapshot}
        onLoadSnapshotState={handleLoadSnapshotState}
      />

      {/* Discovery Notification Banners */}
      <DiscoveryNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
