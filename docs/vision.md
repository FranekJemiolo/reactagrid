# ReactaGrid: Project Vision & Philosophy

## The Core Problem

Most chemistry games and falling-sand simulators rely on hardcoded "A + B = C" scripting. While fun, they hit a combinatorial wall: adding 10 new elements requires writing hundreds of bespoke interaction rules. Furthermore, they are often locked to specific platforms or require heavy downloads.

## The ReactaGrid Solution

ReactaGrid is an offline-first Progressive Web Application (PWA) that decouples **state rendering** from **chemical logic**. By grounding the simulation in real-world thermodynamic and stoichiometric data, the engine naturally handles explosive chain reactions, state changes, and pressure dynamics without relying on arbitrary game logic.

### 1. Simulation over Scripting

We do not hardcode "explosions." We encode the specific heat, density, and combustion thresholds of elements. If a player drops Sodium into Water, the engine generates Sodium Hydroxide and Hydrogen Gas alongside a massive heat yield. The engine's thermal pass naturally ignites the Hydrogen, while the physics pass naturally expands the gases. The explosion is an _emergent property_ of the physics, not an animation.

### 2. The Data-Driven Pipeline

ReactaGrid is fueled by real-world chemistry. The static JSON ledgers powering the game are generated via Python ETL pipelines that extract and compress data from open-access chemical databases (like CAMEO Chemicals and PubChem). This ensures our sandbox remains scientifically grounded and highly extensible. Contributors don't write game code to add a chemical; they add it to the pipeline.

### 3. Uncompromising Web Performance

Simulating thousands of interacting particles at 60 FPS in a browser requires strict architectural discipline.

- **Main Thread Isolation:** The UI thread handles only state management and Canvas drawing.
- **Web Worker Compute:** The entire cellular automata engine runs in an isolated Web Worker, utilizing flat, typed arrays (`Uint8Array`, `Float32Array`) to prevent garbage collection stutter.
- **Offline Resilience:** Deployed via GitHub Pages, the Service Worker caches the engine and ledgers immediately. ReactaGrid is designed to be installed on home screens and played on an airplane, completely offline.

## The End Goal

To build the most accessible, scientifically grounded 2D physics sandbox on the web—serving as both a chaotic puzzle game and an interactive educational tool.

---

## Educational Value & Safety Protocols

ReactaGrid turns consumer chemistry into an interactive sandbox where players learn the actual composition of everyday supermarket products:

- Why mixing Bleach ($\text{NaClO}$) and Window Cleaner ($\text{NH}_3$) generates toxic chloramine gas ($\text{NH}_2\text{Cl}$).
- Why Baking Soda ($\text{NaHCO}_3$) and Vinegar ($\text{CH}_3\text{COOH}$) produce an energetic release of pressurized $\text{CO}_2$ gas.
- How iron filings slowly oxidise into rust ($\text{Fe}_2\text{O}_3$) in the presence of water and ambient oxygen.

By rewarding players with Research Grants and unlocking detailed Discovery Journal entries, ReactaGrid transforms safety warnings and chemical properties into engaging gameplay discoveries.
