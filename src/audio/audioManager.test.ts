import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, ProceduralAudioEngine } from './audioManager';

describe('Milestone 20: AudioManager & Event Throttling Suite', () => {
  let mockEngine: ProceduralAudioEngine;
  let manager: AudioManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEngine = new ProceduralAudioEngine();
    // Spy on synthesis methods to verify calls without needing browser AudioContext hardware
    vi.spyOn(mockEngine, 'synthesizeBoil').mockImplementation(() => {});
    vi.spyOn(mockEngine, 'synthesizeBubbling').mockImplementation(() => {});
    vi.spyOn(mockEngine, 'synthesizeExplosion').mockImplementation(() => {});
    vi.spyOn(mockEngine, 'synthesizeSizzling').mockImplementation(() => {});
    vi.spyOn(mockEngine, 'synthesizeClick').mockImplementation(() => {});
    vi.spyOn(mockEngine, 'synthesizeDiscovery').mockImplementation(() => {});

    manager = new AudioManager(mockEngine);
    manager.resetMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces and aggregates 1,000 simultaneous boil events into a single synthesized audio buffer call within 16ms', () => {
    // Fire 1,000 simultaneous boil events within the 16ms tick frame
    for (let i = 0; i < 1000; i++) {
      manager.trigger('boil');
    }

    // Advance timer by 16ms to trigger the throttled flush
    vi.advanceTimersByTime(16);

    // Verify mockEngine.synthesizeBoil was called exactly once
    expect(mockEngine.synthesizeBoil).toHaveBeenCalledTimes(1);

    // Verify synthesizeBoil received the scaled volume
    const calls = manager.getSynthesizedCalls().filter((c) => c.type === 'boil');
    expect(calls).toHaveLength(1);
    expect(calls[0].count).toBe(1000);
    // Logarithmic scaling: vol = min(0.4, 0.08 + 0.08 * log10(1000)) = min(0.4, 0.08 + 0.24) = 0.32
    expect(calls[0].volume).toBeCloseTo(0.32, 2);
  });

  it('aggregates multi-category events (bubbling, sizzling, explosion) within the same throttle window', () => {
    // Fire 150 bubbles, 40 sizzles, and 5 explosions with different heat yields
    for (let i = 0; i < 150; i++) {
      manager.trigger('bubble');
    }
    for (let i = 0; i < 40; i++) {
      manager.trigger('sizzle');
    }
    manager.trigger('explosion', { heatYield: 150 });
    manager.trigger('explosion', { heatYield: 450 });
    manager.trigger('explosion', { heatYield: 300 });

    vi.advanceTimersByTime(16);

    expect(mockEngine.synthesizeBubbling).toHaveBeenCalledTimes(1);
    expect(mockEngine.synthesizeSizzling).toHaveBeenCalledTimes(1);
    expect(mockEngine.synthesizeExplosion).toHaveBeenCalledTimes(1);

    const calls = manager.getSynthesizedCalls();
    const explosionCall = calls.find((c) => c.type === 'explosion');
    expect(explosionCall).toBeDefined();
    expect(explosionCall?.count).toBe(3);
    // Highest heat yield recorded
    expect(explosionCall?.metadata?.heatYield).toBe(450);
  });

  it('supports direct procedural click and discovery sounds', () => {
    manager.playClick();
    expect(mockEngine.synthesizeClick).toHaveBeenCalledTimes(1);

    manager.playDiscovery();
    expect(mockEngine.synthesizeDiscovery).toHaveBeenCalledTimes(1);
  });

  it('correctly toggles mute state', () => {
    expect(manager.isMuted()).toBe(false);
    manager.toggleMute();
    expect(manager.isMuted()).toBe(true);
    manager.toggleMute();
    expect(manager.isMuted()).toBe(false);
  });
});
