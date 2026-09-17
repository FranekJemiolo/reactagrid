# Contributing to ReactaGrid

Thank you for your interest in contributing to **ReactaGrid**! We welcome contributions from developers, educators, and chemists alike.

---

## 1. Development Setup

### Prerequisites

- **Node.js**: v20 or higher (`node -v`)
- **Python**: v3.10 or higher (`python3 --version`)
- **prek**: Pre-commit hook runner (`prek --version` or install via Cargo / binary)

### Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/FranekJemiolo/reactagrid.git
   cd reactagrid
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Install pre-commit hooks using `prek`:

   ```bash
   prek install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 2. Chemical Data Pipeline (Zero Hallucination Protocol)

All chemical species and reactions in ReactaGrid **must be derived from verified empirical sources** (e.g. PubChem, NIST Chemistry WebBook, CAMEO Chemicals, or Open Reaction Database).

### Adding New Chemicals or Reactions

1. Open `data-pipeline/extract_chemistry.py`.
2. Add the verified compound specification (empirical formula, molecular weight, density in $\text{g/cm}^3$, specific heat, melting point, boiling point, hazard statements, and color mapping).
3. If adding a reaction, specify balanced stoichiometric ratios, enthalpy of reaction ($\Delta H$ in $\text{kJ/mol}$), activation threshold, and output phases.
4. Execute the extraction script:
   ```bash
   npm run pipeline
   ```
5. Validate against the strict JSON schemas:
   ```bash
   npm run pipeline:validate
   ```

---

## 3. Running Quality Checks & Tests

Before submitting a Pull Request, verify that all local checks pass:

```bash
# Run prek hooks across all files
prek run --all-files

# Or run individual verification suites
npm run format:check
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run build
```

---

## 4. Architectural Rules

- **Simulation Threading:** Heavy grid updates, particle sorting, and thermodynamics must strictly reside inside the Web Worker. Do not perform grid math on the React UI thread.
- **Strict Typing:** No `any` types. All worker messages must use discriminated unions defined in `src/types/worker.ts`.
- **Memory Efficiency:** Avoid object allocations within the 60 FPS tick loop; use contiguous TypedArrays.
