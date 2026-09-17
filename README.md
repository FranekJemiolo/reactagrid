# ReactaGrid 🧪⚡

[![CI](https://github.com/FranekJemiolo/reactagrid/actions/workflows/ci.yml/badge.svg)](https://github.com/FranekJemiolo/reactagrid/actions/workflows/ci.yml)
[![Deploy](https://github.com/FranekJemiolo/reactagrid/actions/workflows/deploy.yml/badge.svg)](https://github.com/FranekJemiolo/reactagrid/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](https://FranekJemiolo.github.io/reactagrid/)

> **A 2D "falling sand" cellular automata chemistry sandbox and game powered by real-world chemical data.**

Play live in your browser: **[https://FranekJemiolo.github.io/reactagrid/](https://FranekJemiolo.github.io/reactagrid/)**

---

## 🔬 What is ReactaGrid?

ReactaGrid combines the nostalgic, tactile joy of 2D falling sand games with **rigorous, empirical chemistry**. Unlike traditional sand simulations that rely on arbitrary game heuristics, every particle in ReactaGrid behaves according to documented physical and chemical laws:

- **Density & Buoyancy:** Denser liquids sink, lighter liquids float, and gases rise according to true physical densities.
- **Thermodynamics:** Realistic Fourier thermal conduction, specific heat capacities, latent heat, and phase changes (melting, boiling, condensation).
- **Stoichiometric Reactions:** Real-world enthalpy ($\Delta H$), activation energy, and gas emissions derived from verified databases.
- **Consumer Product Chemistry:** Experiment with household items—from Baking Soda and Vinegar to Bleach, Ammonia, and Iron Filings.
- **Discovery Journal & Meta-Game:** Discover new compounds, unlock entries in your Lab Notebook, and earn Research Grants to expand your chemical laboratory.

---

## 🚀 Key Architectural Features

- **60 FPS Web Worker Engine:** All cellular automata passes (gravity, heat conduction, stoichiometry, and pixel updates) run in an isolated Web Worker, ensuring a stutter-free 60 FPS UI on desktop and mobile.
- **Zero-Allocation Memory Architecture:** Simulation cells are backed by contiguous TypedArrays (`Uint16Array`, `Float32Array`, `Uint8Array`, and `Uint32Array`).
- **Offline-First PWA:** Full offline functionality powered by Workbox service workers and standalone manifest installation.
- **Persistent State:** Saves unlocked chemicals, research wallet, and laboratory snapshots in IndexedDB using `idb`.
- **Anti-Hallucination Chemical Pipeline:** Seed data is generated and verified via Python scripts against real chemical literature and strictly checked by JSON schemas.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript (Strict Mode)
- **Engine:** Web Worker, TypedArray Buffers, HTML5 2D Canvas Direct Memory Blitting
- **Persistence:** IndexedDB (`idb`)
- **PWA:** Vite PWA Plugin, Workbox
- **Data Extraction:** Python 3 (CAMEO Chemicals / PubChem stoichiometry model)
- **Tooling & CI:** `prek` pre-commit hooks, Vitest, Playwright, GitHub Actions

---

## 📦 Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+
- `prek` (pre-commit hook runner)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/FranekJemiolo/reactagrid.git
cd reactagrid

# Install dependencies
npm install

# Run prek hooks verification
prek run --all-files

# Start development server
npm run dev
```

Visit `http://localhost:5173/reactagrid/` in your browser.

---

## 🧪 Testing & Verification

```bash
# Run Vitest unit & simulation tests
npm run test

# Run Playwright end-to-end tests
npm run test:e2e

# Validate chemical database schemas
npm run pipeline:validate
```

---

## 📖 Documentation

- [Architecture & Simulation Pipeline](docs/architecture.md)
- [Vision & Design Philosophy](docs/vision.md)
- [Contribution Guidelines](CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
