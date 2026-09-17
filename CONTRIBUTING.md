# Contributing to ReactaGrid

Welcome to ReactaGrid! Our philosophy is simple: **we do not hardcode game logic.**

Explosions, state changes, and chemical reactions are emergent properties of real-world thermodynamic and stoichiometric data. If you want to add a new chemical or a new explosion to the game, you don't touch the TypeScript game engine. Instead, you add it to our Python ETL pipeline, which generates the JSON ledgers that the Web Worker physics engine consumes.

This guide explains how to set up your local environment and add new elements to the game.

---

## 1. Local Environment Setup

ReactaGrid is split into two halves: the Node.js frontend (Vite/React) and the Python data pipeline.

**Prerequisites:**

- Node.js (v18+)
- Python 3.10+ (Using Conda or a standard `venv` is highly recommended)
- [prek](https://github.com/someone/prek) (for pre-commit hooks)

**Setup Steps:**

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/FranekJemiolo/reactagrid.git
   cd reactagrid
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Set up the Python environment:
   ```bash
   conda create -n reactagrid python=3.10
   conda activate reactagrid
   pip install -r data-pipeline/requirements.txt
   ```
4. Install pre-commit hooks:
   ```bash
   prek install
   ```

---

## 2. The Architecture: The Python ETL Pipeline

All chemistry data lives in `data-pipeline/`. During the build process, our Python scripts extract raw data from open chemical databases (like CAMEO), transform it to fit our Web Worker schema, and load it into `public/ledgers/`.

```
reactagrid/
├── data-pipeline/
│   ├── raw_data/          # Cached CSV/JSONs from external APIs
│   ├── extractors/        # Scripts that query CAMEO/ORD
│   ├── transformers/      # Scripts mapping real data to our schema
│   ├── targets.yaml       # YOUR ENTRY POINT: The list of chemicals to ingest
│   └── build_ledgers.py   # The master pipeline script
├── public/ledgers/        # The generated molecules.json & reactions.json
```

---

## 3. How to Add a New Chemical (Molecule)

We track the base chemicals we want in the game via `data-pipeline/targets.yaml`. The ETL pipeline reads this file to know what data to fetch.

1. Open `data-pipeline/targets.yaml`.
2. Add your new chemical's CAS Registry Number or IUPAC name under the `molecules` list:

```yaml
# targets.yaml
molecules:
  - id: 'h2o'
    cas: '7732-18-5'
    color_hex: '#3498db' # We define visual hex codes manually here
  - id: 'k'
    cas: '7440-09-7'
    color_hex: '#bdc3c7' # Potassium
```

3. Run the pipeline locally:
   ```bash
   python data-pipeline/build_ledgers.py
   ```
   The pipeline will fetch Potassium's density, specific heat, and melting point, and automatically append it to `public/ledgers/molecules.json`.

---

## 4. How to Add a New Reaction

The Web Worker physics engine swaps pixels based on the `reactions.json` ledger. Our ETL pipeline generates this by cross-referencing the `targets.yaml` list against reactivity databases.

1. Ensure all reactants and products for your desired reaction exist in `targets.yaml`.
2. Add the interaction target to `targets.yaml` under `tracked_reactions`:

```yaml
# targets.yaml
tracked_reactions:
  - reactants: ['k', 'h2o']
    # The pipeline will look up what happens when Potassium meets Water,
    # calculate the heat yield, and output the resulting products (KOH + H2)
```

3. Run the pipeline:
   ```bash
   python data-pipeline/build_ledgers.py
   ```

### Manual Overrides

If an external API is missing thermodynamic data, you can provide manual overrides in `data-pipeline/overrides.json`. Only use this if the ETL pipeline fails to find accurate data—do not invent heat_yield numbers for game balance.

---

## 5. Adding Items to the Store

The in-game store sells mixtures of base molecules. You can add new consumer products by editing `data-pipeline/store_inventory.yaml`:

```yaml
- item_id: 'potassium_block'
  name: 'Pure Potassium'
  category: 'Metals'
  cost: 150
  composition:
    k: 1.0 # 100% Potassium
```

---

## 6. Testing & Pull Requests

Before opening a PR, ensure your changes don't break the physics engine or the pipeline:

- **Run the Pipeline:** `python data-pipeline/build_ledgers.py`
- **Run the Test Suite:** `npm run test` (Validates the Web Worker logic and the JSON schemas).
- **Run E2E Tests:** `npm run test:e2e` (Ensures the Playwright UI tests still pass).

If `prek` passes locally and GitHub Actions is green on your fork, you are ready to submit your Pull Request!
