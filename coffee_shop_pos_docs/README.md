# Coffee Shop POS — Documentation Pack

**Purpose:** A polished Coffee Plus POS prototype designed to evolve into a hybrid, offline-first café POS connected to Sumady ERP.

**Visual direction:** Coffee Plus green reference — deep green navigation, bright green primary actions, white cards, pale green highlights, light neutral workspace, and high-quality coffee/product photography.

## Documents

1. `01-PRODUCT-OVERVIEW.md` — product goals, users, scope and system boundaries.
2. `02-GREEN-DESIGN-SYSTEM.md` — colors, typography, spacing and responsive behavior.
3. `03-SCREEN-SPECIFICATIONS.md` — navigation and detailed screen requirements.
4. `04-INTERACTION-LOGIC.md` — workflows, calculations, offline behavior and sync states.
5. `05-MOCK-DATA-STRUCTURES.md` — demo models and future integration data contracts.
6. `06-DEMO-SCENARIOS.md` — client demo journeys and reset instructions.
7. `07-CURSOR-IMPLEMENTATION-GUIDE.md` — implementation sequence and Cursor instructions.
8. `08-SUMADY-ERP-INTEGRATION-ARCHITECTURE.md` — hybrid deployment, data ownership, synchronization and accounting flow.

## How to use with Cursor

1. Copy this folder into the existing repository under `docs/coffee-pos/`.
2. Add the approved green reference image to `docs/coffee-pos/references/`.
3. Ask Cursor to inspect the repository and read all eight documents before changing code.
4. Build the frontend prototype first using mock adapters.
5. Add real Sumady integration incrementally after reviewing the existing ERP APIs and posting engine.

## Architecture in one sentence

**Coffee Shop POS owns café operations; Sumady ERP owns shared business master data, inventory/accounting rules and the general ledger; a synchronization layer safely transfers finalized POS sales to Sumady.**

The current prototype is still a demo. A simulated payment, local record or simulated sync is not a real payment, ERP posting or successful synchronization.
