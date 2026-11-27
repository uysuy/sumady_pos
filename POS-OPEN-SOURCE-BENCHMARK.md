# POS Open-Source Benchmark

**Research date:** 2026-11-20  
**Revision:** 2026-11-20 (evidence + license links; demo vs README separation)  
**Git commit SHA:** *Unavailable* — workspace had no `.git` metadata at capture time.  
**Purpose:** Compare accessible open-source / source-available POS projects against Coffee Plus (`pos-web`) for Cambodian café / restaurant SME needs.  
**Scope:** Research and planning only — no Coffee Plus code changes in this pass.  
**Related:** `POS-LIFECYCLE-AND-ARCHITECTURE.md` (states, split bill, KHQR, shift close).

---

## 1. Projects compared

| # | Project | Demo | Source | Stack (summary) | License | Demo accessibility |
|---|---|---|---|---|---|---|
| 1 | **Adminium Point of Sale** | https://adminium.dev/demo/point-of-sale | https://github.com/Adminiumjs/point-of-sale | Vite + React + TypeScript; optional Docker + Postgres + Adminium back-office | **AGPL-3.0** | **Verified** — workflow cards for Login, Register, Floor, Kitchen, Payment, etc. |
| 2 | **Elitale Restro** | Listed: https://restro-blush-rho.vercel.app/ · Working alternate: https://restro-fxyx.vercel.app/ | https://github.com/tirforge/restro | Next.js 16 + React 19 + Prisma + PostgreSQL + Tailwind 4 | **AGPL-3.0** | **Partial** — blush URL **503 paused**; fxyx landing + staff PIN pad verified; full POS after PIN not completed (cashier PIN unpublished) |
| 3 | **POSR** | https://ahmedali5530.xyz/posr | https://github.com/ahmedali5530/restaurant-pos | React + SurrealDB + Bun + Tauri; offline-first | **PSAL** (source-available, **not OSI open source**) | Live site exists; deep interactive capture deferred — feature claims from README/docs |
| 4 | **Tavo POS** | Self-host only (localhost:4242) | https://github.com/sanjayubhrani-lab/tavo-pos | Node Express + JSON/Postgres + Stripe mock | **AGPL-3.0** (+ commercial dual-license) | **Not verified live** — README/API evidence only |
| 5 | **OPEN-POS** | Desktop app (no web demo) | https://github.com/sinecordproductions/OPEN-POS_Free-SmartPOS-Software | Python + PySide6 + SQLite + ESC/POS | **Public domain** | **Not verified live** — README evidence only |

### Additional note

No sixth project was required: Adminium + Tavo already cover Toast-like floor/KDS/payment patterns; OPEN-POS covers offline thermal printing; POSR covers “full suite” (with license caution).

---

## 2. License findings (reuse caution)

| Project | License file (direct) | Implication for Coffee Plus |
|---|---|---|
| Adminium POS | [LICENSE](https://github.com/Adminiumjs/point-of-sale/blob/main/LICENSE) AGPL-3.0 | **Do not copy source.** Workflow learning only. |
| Elitale Restro | [LICENSE](https://github.com/tirforge/restro/blob/main/LICENSE) AGPL-3.0 | Same. |
| Tavo POS | [LICENSE](https://github.com/sanjayubhrani-lab/tavo-pos/blob/main/LICENSE) AGPL-3.0 (+ [commercial](https://github.com/sanjayubhrani-lab/tavo-pos/blob/main/COMMERCIAL-LICENSE.md)) | Workflow only unless commercial license obtained. |
| POSR | [LICENSE](https://github.com/ahmedali5530/restaurant-pos/blob/master/LICENSE) PSAL | **Not OSI open source.** Study OK; do not copy. |
| OPEN-POS | [LICENSE.txt](https://github.com/sinecordproductions/OPEN-POS_Free-SmartPOS-Software/blob/main/LICENSE.txt) Public domain | Legal reuse possible; **stack mismatch** — prefer KOT/print ideas. |

**Coffee Plus policy:** Workflow benchmarks only. Keep Svelte/Tailwind. No AGPL/PSAL incorporation without legal review.

---

## 3. Demo verification notes

### Adminium POS — verified (2026-11-20)

Navigated demo card workflows:

| Workflow | Observed |
|---|---|
| Login | Staff chips + 4-digit PIN + “Good morning — tap in to start your shift” |
| Register | Favourites strip, categories, photo grid, sold-out / low-stock badges, ticket with Sent vs unsent lines, Hold / Send / Pay |
| Floor | Zones (Window / Patio / Bar), Open / Occupied / Needs attention, bill requested |
| Kitchen | New → In progress → Ready; Bump; All-day aggregate; aging timers |
| Payment | Tip presets, even/fraction splits, Cash/Card/QR/Gift card, simulated card reader |

Screenshots: `POS-REFERENCE-SCREENSHOTS/01`–`05`.

### Elitale Restro — partial

| Check | Result |
|---|---|
| restro-blush-rho.vercel.app | **503 DEPLOYMENT_PAUSED** |
| restro-fxyx.vercel.app | Landing (Guest / Staff / Manager) OK |
| Staff login | Name list + PIN pad OK; Meera (Cashier) PIN `1234` failed; published waiter PINs not exercised to POS screen in this session |

Screenshots: `06`–`07`, `00`.

### POSR / Tavo / OPEN-POS

| Project | Live UI this session | How to cite features |
|---|---|---|
| POSR | Marketing/docs site reachable; **deep POS/KDS walkthrough not completed** | **README-only** unless later demo-verified |
| Tavo | Requires local `npm start` — **not verified** | **README-only** |
| OPEN-POS | Windows desktop — **not verified** | **README-only** |

**Rule:** If a demo cannot be accessed, do **not** assume behavior. Mark explicitly.

---

## 4. Feature density vs Coffee Plus (high level)

| Theme | Strongest reference | Coffee Plus today |
|---|---|---|
| PIN login + float open | Adminium, Elitale, Tavo | Staff switcher in shell (demo); **no PIN gate** |
| Floor plan + move/merge | Adminium | Table list select only |
| Tips + split pay UX | Adminium, Tavo, POSR | Multi-tender yes; **no tip / no bill split** |
| Send then void discipline | Adminium (VOID confirm) | Pay → kitchen; hold exists; **no coursing / sent-line void ritual** |
| Station KDS | POSR, Adminium lanes | Category filter; **not true stations** |
| Kitchen ticket print | OPEN-POS, Tavo | Customer receipt print only |
| Offline cash outbox | Tavo, POSR, Coffee Plus | Present (mock ERP) |
| EN/KH + USD/KHR | Coffee Plus (strong) | References are foreign-tax / INR / USD-centric |
| ERP ownership boundary | Coffee Plus (documented) | References often own inventory + ledger |

---

## 5. Fit for Cambodia (summary)

| Need | Best reference signal | Adopt into Coffee Plus? |
|---|---|---|
| Khmer + English | None of the five are KH-native | **Keep ours**; learn density only |
| USD + KHR + FX | OPEN-POS multi-currency label; others single-currency | **Keep ours** |
| KHQR concept | Closest: Adminium QR / Elitale UPI / POSR gateways | **Architecture later** — not copy UPI/GST |
| Local thermal | OPEN-POS ESC/POS | **Phase later** — browser print first remains OK |
| Café modifiers | Adminium sheet, Coffee Plus customize | **Keep ours**; polish UX |
| Offline sync | Tavo outbox story | Align messaging; keep MockERP → SumadyERP |
| No duplicate GL | Coffee Plus docs | **Do not adopt** POSR/OPEN-POS internal ledgers |

---

## 6. Sources

- Adminium README + live demo (2026-11-20)
- Elitale README + live alternate demo (2026-11-20)
- POSR README (`master`)
- Tavo README (`main`)
- OPEN-POS README (`main`)
- Coffee Plus inventory: `pos-web` routes/components/domain + `COFFEE-PLUS-COMPETITIVE-GAP-ANALYSIS.md` + `coffee_shop_pos_docs/`
