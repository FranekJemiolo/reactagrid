import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CanvasRenderer } from './components/CanvasRenderer';
import { HUD } from './components/HUD';
import { BrushPalette } from './components/BrushPalette';
import { StoreModal } from './components/StoreModal';
import { JournalModal } from './components/JournalModal';
import { DiscoveryNotification, DiscoveryToast } from './components/DiscoveryNotification';
import { SimulationWorkerBridge } from './engine/workerBridge';
import { SnapshotsModal } from './components/SnapshotsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { CampaignModal } from './components/CampaignModal';
import { CellProbe, CellProbeData } from './components/CellProbe';
import { sounds } from './audio/sound';
import { VFXRenderer } from './rendering/vfxRenderer';
import { ChemicalDatabase, StoreItem } from './types/chemistry';
import { UserProgress } from './types/game';
import { CampaignLevel } from './types/campaign';
import { LevelManager } from './engine/campaign';
import { loadProgress, saveProgress, saveSnapshot } from './storage/db';
import { Trophy, Star } from 'lucide-react';

import moleculesJson from './data/molecules.json';
import reactionsJson from './data/reactions.json';
import storeItemsJson from './data/store_items.json';
import levelsJson from './data/levels.json';

const chemicalDatabase: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

const campaignLevels = levelsJson as unknown as CampaignLevel[];

const GRID_WIDTH = 180;
const GRID_HEIGHT = 180;

export const App: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [activeParticles, setActiveParticles] = useState<number>(0);
  const [avgTemp, setAvgTemp] = useState<number>(298.15);
  const [maxTemp, setMaxTemp] = useState<number>(298.15);
  const [minTemp, setMinTemp] = useState<number>(298.15);
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    compoundId: string;
    name: string;
    tempK: number;
  } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [renderMode, setRenderMode] = useState<'natural' | 'thermal'>('natural');
  const [gravity, setGravity] = useState<1 | 0 | -1>(1);
  const [isProbeActive, setIsProbeActive] = useState<boolean>(false);
  const [probeData, setProbeData] = useState<CellProbeData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [floorDrain, setFloorDrain] = useState<boolean>(false);
  const lastDrainedCountRef = useRef<number>(0);

  // Brush & Toolbar State
  const [selectedItemId, setSelectedItemId] = useState<string>('item_tap_water');
  const [brushRadius, setBrushRadius] = useState<number>(3);
  const [brushTempK, setBrushTempK] = useState<number>(298.15);

  // Modal Views
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState<boolean>(false);
  const [activeLevel, setActiveLevel] = useState<CampaignLevel | null>(null);
  const [victoryModal, setVictoryModal] = useState<{
    levelId: string;
    levelTitle: string;
    stars: number;
    timeSec: number;
    nextLevelId?: string;
  } | null>(null);

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [toasts, setToasts] = useState<DiscoveryToast[]>([]);

  // Simulation references
  const bridgeRef = useRef<SimulationWorkerBridge | null>(null);
  const pixelsRef = useRef<Uint32Array | null>(null);
  const progressRef = useRef<UserProgress | null>(null);
  const pendingSnapshotNameRef = useRef<string>('');
  const levelStartTimeRef = useRef<number | null>(null);
  const vfxRef = useRef<VFXRenderer | null>(null);

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

  const handleToggleFloorDrain = () => {
    setFloorDrain((prev) => {
      const next = !prev;
      bridgeRef.current?.setFloorDrain(next);
      if (next) {
        sounds.playBubbling();
        addToast({
          title: 'Floor Waste Drain Open 🚰',
          message: 'Bottom dynamic sediment & liquids will drain away and recycle into funds.',
        });
      } else {
        addToast({
          title: 'Tank Floor Sealed 🛡️',
          message: 'Floor drain closed. Liquids will pool and solids will stack.',
        });
      }
      return next;
    });
  };

  const handleFlushFloor = () => {
    bridgeRef.current?.flushFloor(10);
    sounds.playBubbling();
    addToast({
      title: 'Tank Floor Flushed 🌊',
      message: 'Purged dynamic bottom sediment without touching glassware or equipment.',
    });
  };

  const handleToggleProbe = () => {
    const next = !isProbeActive;
    setIsProbeActive(next);
    if (!next) setProbeData(null);
  };

  const handleCanvasHover = (gridX: number, gridY: number, screenX: number, screenY: number) => {
    if (isProbeActive) {
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
    } else if (probeData !== null) {
      setProbeData(null);
    }
    bridgeRef.current?.queryCell(gridX, gridY);
  };

  const handleCanvasLeave = () => {
    setHoveredCell(null);
    if (probeData !== null) {
      setProbeData(null);
    }
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleCycleSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const currentIndex = speeds.indexOf(speedMultiplier);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeedMultiplier(nextSpeed);
    bridgeRef.current?.setSpeed(nextSpeed);
    addToast({
      title: 'Simulation Speed',
      message: `Running at ${nextSpeed}x speed`,
    });
  };

  const handleExportSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `reactagrid-snapshot-${timestamp}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        title: 'Snapshot Exported',
        message: 'Saved high-resolution PNG of the laboratory tank.',
      });
    } catch (err) {
      console.error('Failed to export canvas snapshot:', err);
    }
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
      if (!saved.hasCompletedTutorial) {
        setIsTutorialOpen(true);
      }

      bridge = new SimulationWorkerBridge({
        onFrame: (data) => {
          pixelsRef.current = data.pixels;
          setFps(data.fps);
          setActiveParticles(data.activeParticles);
          setAvgTemp(data.avgTemperature);
          if (data.maxTemperature !== undefined) setMaxTemp(data.maxTemperature);
          if (data.minTemperature !== undefined) setMinTemp(data.minTemperature);

          if (data.drainedCount !== undefined && data.drainedCount > lastDrainedCountRef.current) {
            const delta = data.drainedCount - lastDrainedCountRef.current;
            lastDrainedCountRef.current = data.drainedCount;
            const earned = Math.floor(delta / 25);
            if (earned > 0) {
              setProgress((prev) => {
                if (!prev) return prev;
                const nextProg = { ...prev, funds: prev.funds + earned };
                saveProgress(nextProg);
                return nextProg;
              });
            }
          }
        },
        onLevelWon: (payload) => {
          const current = progressRef.current;
          if (!current) return;
          const currentLevel = campaignLevels.find((l) => l.id === payload.levelId);
          if (!currentLevel) return;

          const now = Date.now();
          const start = levelStartTimeRef.current || now - 10000;
          const elapsed = Math.max(1, Math.round((now - start) / 1000));
          const manager = new LevelManager(campaignLevels, current);
          const { stars, nextLevelUnlocked, updatedProgress } = manager.completeLevel(
            payload.levelId,
            elapsed,
          );

          setProgress(updatedProgress);
          saveProgress(updatedProgress);

          sounds.playDiscovery();
          setVictoryModal({
            levelId: payload.levelId,
            levelTitle: currentLevel.title,
            stars,
            timeSec: elapsed,
            nextLevelId: nextLevelUnlocked,
          });
          addToast({
            title: `Mission Complete! ${'★'.repeat(stars)}`,
            message: `${currentLevel.title} completed in ${elapsed}s!`,
            reward: stars * 25,
          });
        },
        onCellInfo: (info) => {
          setProbeData((prev) =>
            prev && prev.x === info.x && prev.y === info.y ? { ...prev, ...info } : null,
          );
          setHoveredCell({
            x: info.x,
            y: info.y,
            compoundId: info.compoundId,
            name: info.name,
            tempK: info.tempK,
          });
        },
        onReaction: (rxn) => {
          const current = progressRef.current;
          if (!current) return;

          // Milestone 19: Emit visual particle effects (sparks, smoke, shockwaves)
          vfxRef.current?.onReaction(
            rxn.x ?? Math.floor(GRID_WIDTH / 2),
            rxn.y ?? Math.floor(GRID_HEIGHT / 2),
            rxn.heatYield,
            rxn.reactionId,
          );

          // Milestone 20: Procedural audio synthesis routed through Event Throttler
          if (
            Math.abs(rxn.heatYield) > 200 ||
            rxn.reactionId.includes('explosion') ||
            rxn.reactionId.includes('hydrolysis')
          ) {
            sounds.playExplosion(rxn.heatYield);
            sounds.playSizzling();
          } else {
            sounds.playBubbling();
          }

          const isNew = !current.discoveredReactions.includes(rxn.reactionId);
          // Milestone 7: Award funds for discovery + energy micro-grants for sustaining exothermic reactions
          const energyBonus = Math.floor(Math.abs(rxn.heatYield) / 100);
          const reward = isNew ? rxn.reward : Math.max(1, energyBonus);

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

  const handleCompleteTutorial = () => {
    setIsTutorialOpen(false);
    const current = progressRef.current;
    if (!current) return;
    const updated: UserProgress = {
      ...current,
      hasCompletedTutorial: true,
    };
    setProgress(updated);
    saveProgress(updated);
  };

  const handleSelectLevel = (level: CampaignLevel) => {
    setActiveLevel(level);
    levelStartTimeRef.current = Date.now();
    bridgeRef.current?.clear();
    bridgeRef.current?.setCampaignLevel(level);
    addToast({
      title: `Campaign Mission: ${level.title}`,
      message: level.winCondition.description,
      reward: 0,
    });
  };

  const handleExitCampaign = () => {
    setActiveLevel(null);
    levelStartTimeRef.current = null;
    setVictoryModal(null);
    bridgeRef.current?.setCampaignLevel(null);
  };

  const unlockedItems = chemicalDatabase.storeItems.filter((item) => {
    if (activeLevel && !activeLevel.availableStoreItems.includes(item.id)) {
      return false;
    }
    return progress?.unlockedStoreItems.includes(item.id) || item.unlocked_by_default;
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setIsStoreOpen(false);
        setIsJournalOpen(false);
        setIsSnapshotsOpen(false);
        setIsShortcutsOpen(false);
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => {
          if (prev) {
            bridgeRef.current?.pause();
            return false;
          } else {
            bridgeRef.current?.start();
            return true;
          }
        });
        return;
      }

      if (e.key === '.' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        bridgeRef.current?.step();
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        bridgeRef.current?.clear();
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setRenderMode((prev) => {
          const next = prev === 'natural' ? 'thermal' : 'natural';
          bridgeRef.current?.setRenderMode(next);
          return next;
        });
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setGravity((prev) => {
          const next: 1 | 0 | -1 = prev === 1 ? 0 : prev === 0 ? -1 : 1;
          bridgeRef.current?.setGravity(next);
          return next;
        });
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setFloorDrain((prev) => {
          const next = !prev;
          bridgeRef.current?.setFloorDrain(next);
          return next;
        });
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsProbeActive((prev) => {
          if (prev) setProbeData(null);
          return !prev;
        });
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const muted = sounds.toggleMute();
        setIsMuted(muted);
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setSelectedItemId('empty');
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        setBrushRadius((prev) => Math.max(1, prev - 2));
        return;
      }

      if (e.key === ']') {
        e.preventDefault();
        setBrushRadius((prev) => Math.min(14, prev + 2));
        return;
      }

      const radiuses = [1, 3, 5, 8, 14];
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 5) {
        e.preventDefault();
        setBrushRadius(radiuses[digit - 1]);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-col justify-between">
      {/* Top Header Region: Heads-Up Display & Mission Banner */}
      <div className="relative z-20 flex-shrink-0 w-full flex flex-col items-center">
        <HUD
          fps={fps}
          activeParticles={activeParticles}
          avgTemperature={avgTemp}
          maxTemperature={maxTemp}
          minTemperature={minTemp}
          hoveredCell={hoveredCell}
          funds={progress?.funds ?? 0}
          isRunning={isRunning}
          onTogglePlay={handleTogglePlay}
          onStep={handleStep}
          onClear={handleClear}
          floorDrain={floorDrain}
          onToggleFloorDrain={handleToggleFloorDrain}
          onFlushFloor={handleFlushFloor}
          onOpenStore={() => setIsStoreOpen(true)}
          onOpenJournal={() => setIsJournalOpen(true)}
          onOpenSnapshots={() => setIsSnapshotsOpen(true)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          onOpenCampaign={() => setIsCampaignOpen(true)}
          renderMode={renderMode}
          onToggleRenderMode={handleToggleRenderMode}
          gravity={gravity}
          onToggleGravity={handleToggleGravity}
          isProbeActive={isProbeActive}
          onToggleProbe={handleToggleProbe}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          speedMultiplier={speedMultiplier}
          onCycleSpeed={handleCycleSpeed}
          onExportSnapshot={handleExportSnapshot}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          discoveredCount={progress?.discoveredCompounds.length ?? 0}
          totalCompoundsCount={Object.keys(chemicalDatabase.molecules).length - 1}
        />

        {/* Active Campaign Mission Banner */}
        {activeLevel && (
          <div
            className="mt-0.5 px-4 py-1.5 rounded-2xl bg-slate-900/95 border border-sky-500/50 backdrop-blur-md shadow-xl flex items-center gap-3 text-xs text-white"
            id="campaign-active-banner"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-sky-400">Mission: {activeLevel.title}</span>
            <span className="text-slate-300">Goal: {activeLevel.winCondition.description}</span>
            <button
              onClick={handleExitCampaign}
              id="exit-campaign-button"
              className="ml-2 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              Exit Mission
            </button>
          </div>
        )}
      </div>

      {/* Main Simulation Tank Canvas - Guaranteed Zero Overlap */}
      <main className="relative z-10 flex-1 w-full min-h-0 min-w-0 flex items-center justify-center px-2 py-1 sm:px-4">
        <CanvasRenderer
          width={GRID_WIDTH}
          height={GRID_HEIGHT}
          onPaint={handlePaint}
          onHover={handleCanvasHover}
          onLeave={handleCanvasLeave}
          pixelsRef={pixelsRef}
          brushRadius={brushRadius}
          floorDrain={floorDrain}
          vfxRef={vfxRef}
        />
      </main>

      {/* Brush & Chemical Selection Palette - Responsive Bottom Flow */}
      <div className="relative z-20 flex-shrink-0 w-full flex justify-center pb-2.5 px-3">
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
      </div>

      {/* Real-time Pixel Probe Tooltip */}
      <CellProbe data={probeData} molecules={chemicalDatabase.molecules} />

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

      {/* Campaign Mode Modal */}
      <CampaignModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        levels={campaignLevels}
        completedLevels={progress?.completedLevels ?? {}}
        activeLevelId={activeLevel?.id ?? null}
        onSelectLevel={handleSelectLevel}
      />

      {/* Interactive Guided Tutorial Overlay */}
      <TutorialOverlay
        isOpen={isTutorialOpen}
        onComplete={handleCompleteTutorial}
        onOpenStore={() => setIsStoreOpen(true)}
      />

      {/* Victory Modal */}
      {victoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          id="victory-modal"
        >
          <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/50 shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
            <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Mission Complete!</h2>
            <p className="text-sm font-semibold text-sky-400">{victoryModal.levelTitle}</p>
            <div className="flex items-center gap-1.5 my-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${
                    s <= victoryModal.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 font-mono">Completed in {victoryModal.timeSec}s</p>
            <div className="flex items-center gap-2 w-full pt-2">
              {victoryModal.nextLevelId && (
                <button
                  onClick={() => {
                    const next = campaignLevels.find((l) => l.id === victoryModal.nextLevelId);
                    if (next) handleSelectLevel(next);
                    setVictoryModal(null);
                  }}
                  id="next-level-button"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-bold text-xs text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
                >
                  Next Mission
                </button>
              )}
              <button
                onClick={() => setVictoryModal(null)}
                id="close-victory-button"
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 transition-colors"
              >
                Continue Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Discovery Notification Banners */}
      <DiscoveryNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
