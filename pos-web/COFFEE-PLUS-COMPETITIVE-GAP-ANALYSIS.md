# Coffee Plus — Competitive Gap Analysis (code-based)

**Date:** 2026-11-17  
**Method:** Inspect `pos-web` implementation only.  
**Not used:** Vendor reverse-engineering, unverified competitor screenshots, or claims that external systems are live.

**Peer context (category-level only):** Cambodian café/restaurant POS products typically expect fast cashier UI, modifiers, dine-in tables, kitchen display, shifts, bilingual receipts, and some path to accounting sync. Named market peers are **expectations**, not audited feature lists.

---

## 1. Current capabilities (in this repo)

### Strengths already coded

- Touch POS with modifiers, cart, multi-tender checkout, hold/resume.
- Orders list/detail with refunds and browser receipt view.
- Kitchen display with order + line status, sound/flash, rush aging, category filters.
- Products with archive, tax categories, per-branch price/availability resolution.
- Categories/modifiers with EN/KH and selection limits.
- Customers with bilingual names, active flag, history page.
- Shifts (open/close/cash move), staff/roles, settings (branches, tables, payment methods).
- Demo offline/online toggle + outbox sync against a **mock** ERP adapter.
- EN/KH Paraglide messages; Khmer font `KhmerOS_battambang`.
- Multi-venue **seed** data (café / skybar / restaurant) for demo testing.

### Explicit non-capabilities (do not claim)

- Real Sumady ERP posting.
- Real card/KHQR/e-wallet settlement.
- Online ordering / QR customer channel connected to this POS.
- Loyalty ledger.
- Multi-terminal shared live kitchen over a server (browser localStorage demo only).

---

## 2. Gap matrix

Status values: **Present** | **Partial** | **Missing**

### Cashier & floor

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| Fast product + modifier sell | Present | Keep; density polish only if needed |
| Dine-in table select | Present | |
| Split bill | Missing | High value for restaurant venues — needs cart/order model work |
| Transfer / merge tables | Missing | Floor ops for restaurant seed |
| Delivery fields | Present | No courier integration |

### Menu / catalog

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| Branch price/availability | Present | Via `branchOverrides` + `resolveProduct` |
| Tax categories | Present | |
| Archive/restore | Present | Soft `active` flag |
| Prep station routing | Missing / Partial | Only `preparesInKitchen` + category filter on KDS |
| Inventory qty / 86 sync | Missing | Sold-out boolean only |

### Kitchen

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| KDS columns + bump | Present | |
| Item ready | Present | |
| Dedicated bar station | Missing | Skybar seed still uses same kitchen screen |
| Configurable SLA | Partial | Hardcoded 10-minute rush |
| Kitchen reprint | Missing | |

### Customers / CRM

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| Customer profiles + history | Present | |
| KH phone normalization | Partial | Loose digit-length check |
| Merge duplicates | Missing | |
| Loyalty | Missing | Optional flag/settings later |

### Money & compliance

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| Multi-tender + refunds | Present | Demo simulation |
| Real payment gateway | Missing | External not connected |
| E-invoice / KHQR compliance | Missing | Do not claim |

### Sync / HQ

| Capability | Status | Gap / recommendation |
| --- | --- | --- |
| Outbox + mock sync | Present | |
| Real SumadyERPAdapter | Missing | Keep adapter boundary; replace mock later |
| HO menu push / exports | Missing | |

---

## 3. Prioritized recommendations

### P0 (commercial café/restaurant demo credibility)

1. Keep POS/kitchen/refunds stable — do not regress.
2. True prep/bar station routing if skybar + kitchen are sold as separate stations.
3. Split bill + table transfer for restaurant venue story.
4. Stricter Cambodian phone validation on customers.

### P1

5. Category/modifier reassignment safety warnings.
6. Customer merge + archive policy.
7. Configurable kitchen rush SLA.
8. Kitchen ticket reprint.

### P2

9. Loyalty optional toggle (no points engine until Sumady-backed).
10. Reporting exports.
11. HO / multi-branch remote config.

### Integration track (separate)

12. Replace `mock-adapter.ts` with SumadyERPAdapter behind the same store calls.
13. Real tender acquisition — only after adapter + compliance review.

---

## 4. Dependencies for Sumady integration

| Dependency | Current state |
| --- | --- |
| Stable `posTransactionId` / outbox events | Present in demo model |
| Idempotent submit | Mock adapter dedupes by `posTransactionId` |
| Offline queue UX | Present (`/sync`) |
| Chart of accounts / tax mapping | Local tax categories only — map later |
| Auth / tenant / terminal identity | Demo `businessId` / `terminalId` in settings seed |

**Rule:** Screens call `demo` store; store calls adapter. Do not call ERP from components.

---

## 5. Risks

| Risk | Mitigation |
| --- | --- |
| Treating mock sync as “live ERP” | Label Demo Mode; keep adapter stub clear |
| Feature parity chasing | Prefer café P0 + Sumady truth over cloning every peer feature |
| localStorage as multi-terminal truth | Document as demo limitation |
| Claiming KHQR/e-invoice | Forbidden until certified integration exists |

---

## 6. Suggested sequencing

1. Finish remaining **catalog/customer commercial polish** that is still Missing/Partial above.  
2. **Station routing** if multi-venue kitchen is a sales demo requirement.  
3. **Split bill / table transfer** for restaurant demos.  
4. **SumadyERPAdapter** spike with contract tests — no UI rewrite required.
