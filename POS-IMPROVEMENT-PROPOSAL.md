# POS Improvement Proposal (Revised — final corrections)

**Status:** Awaiting approval — **documentation only**  
**Revision date:** 2026-11-20 (occupancy, payment layers, shift math, split finance, offline, void/transfer, OPEN snapshots)  
**Authoritative rules:** `POS-LIFECYCLE-AND-ARCHITECTURE.md`  
**Gaps / priority:** `POS-FEATURE-GAP-AND-PRIORITY.md`

---

## 1. Corrections made in this revision

| # | Correction |
|---|---|
| 1 | **Occupancy ≠ payment** — table stays occupied through PAID until order COMPLETED/released or CANCELLED |
| 2 | **Order payment status ≠ PaymentAttempt** — failed KHQR cannot mark order FAILED; balance from APPLIED payments only |
| 3 | **Shift close** — payment/refund row attribution by **event shiftId**; refunds never rewrite prior shift snapshot; PARTIALLY_PAID included; cash received vs applied vs change |
| 4 | **Split bill finance** — discount/tax/rounding/qty/refunds/receipts rules; implementation gated on unresolved U3–U5 |
| 5 | **Offline** — single-terminal OK; multi-terminal offline **not** promised without edge service |
| 6 | **Void / transfer** — state-specific void; KDS notify; send-batch table snapshot + live move badge; reprint from batch |
| 7 | **OPEN snapshots** — frozen prices/names/mods/station; catalog drift ignored; sent lines only via void+add |

---

## 2. What stays unchanged

Svelte 5/Kit, Tailwind 4, green UI, shared components, EN/KH, USD/KHR, receipt designer + snapshots, existing multi-tender/refunds/hold/KDS bump, MockERP→SumadyERP, no POS GL/inventory.

---

## 3. Revised implementation sequence

```
Step 0  Docs approved (incl. unresolved list)
Step 1  Persist OPEN orders + occupancy rules + line snapshots
Step 2  Send batches + UNSENT/VOIDED + void/transfer notify hooks
Step 3  Prep stations (config) + snapshot at line/send
Step 4  Floor board (occupancy from order status, not payment)
Step 5  Split bill  ***only after U3–U5 resolved***
Step 6  Table transfer (uses Step 2 notify + Step 4)
Step 7  Kitchen ticket reprint from send batch
Step 8  Shift Closing Report (immutable snapshot; refund-by-event-shift)
Step 9  Tips (optional)
Step 10 KHQR PaymentAttempt layer (UI + Demo adapter; never PAID on show)
```

**Do not** parallelize Step 1 with Step 5 or Step 10.  
**Do not** start Step 5 until split financial unresolved decisions are closed.

---

## 4. Exact acceptance criteria — **Step 1** (OPEN orders foundation)

### 4.1 Functional

1. **Create OPEN order** from cart (dine-in with table, or takeaway/delivery per policy) without taking payment; `orderStatus=OPEN`, `paymentStatus=UNPAID`.  
2. **Persistence:** After full page reload, OPEN order still listed and loadable.  
3. **Line snapshots:** Each line stores frozen name, modifiers, unit price, station (or preparesInKitchen until stations land), erpItemId.  
4. **Catalog drift:** Changing product price/archive/modifier/station in admin does **not** change existing OPEN line snapshots; new adds use new catalog.  
5. **Edit rules:** UNSENT lines editable (qty/note); no kitchen send required in Step 1, but lines must support `kitchenStatus=UNSENT` (or omit until Step 2 maps it).  
6. **Café regression:** With feature flag **off**, existing pay-from-cart → PAID path behaves as today.  
7. **Occupancy (even if floor UI is Step 4):** Helper/API used by future floor: table occupied for OPEN/SENT/IN_PROGRESS regardless of `paymentStatus`; PAID alone does **not** free table; COMPLETED/CANCELLED frees table.  
8. **HELD:** Default does **not** occupy table (unless U1 changes).  
9. **No PaymentAttempt / FAILED order pollution:** Creating OPEN order does not set order `paymentStatus=FAILED`.  
10. **EN/KH** strings for new actions; USD/KHR totals still from existing money helpers.

### 4.2 Non-goals for Step 1

- Send to kitchen, void, split bill, floor UI, KHQR, shift report UI, multi-terminal sync.

### 4.3 Offline (Step 1)

- Single-terminal local persist only.  
- Docs/UI must **not** claim multi-terminal offline safety.

### 4.4 Test ideas (for later implementation)

- Create OPEN → reload → same id/lines/prices.  
- Change product price → OPEN line price unchanged.  
- Pay-from-cart flag off regression.  
- Occupancy helper: PAID+IN_PROGRESS ⇒ occupied; COMPLETED ⇒ free.

---

## 5. Acceptance sketches for later steps (summary)

| Step | Must prove |
|---|---|
| 2 | Send only UNSENT; void NEW/PREPARING/READY; duplicate send blocked; batch reprint identity |
| 3 | Station config; historical line station stable |
| 4 | Floor uses occupancy §1; never cart-as-occupied |
| 5 | Part sum == order total; pay/refund per part; guards |
| 6 | Transfer after send notifies KDS; batch snapshot table unchanged |
| 7 | Reprint = batch snapshot |
| 8 | Refund in S2 absent from S1 snapshot; cash received ≠ applied clarity |
| 9 | Tip optional; receipt flag |
| 10 | FAILED attempt + cash APPLIED ⇒ order PAID |

---

## 6. Approval checklist

| Item | Approve? |
|---|---|
| Lifecycle corrections §1–7 | ☐ |
| Unresolved U1–U10 (resolve or defer explicitly) | ☐ |
| Sequence §3 | ☐ |
| Step 1 acceptance §4 | ☐ |
| Hold Step 5 until split finance decided | ☐ |
| Single-terminal offline only for now | ☐ |

---

## 7. Stop

Documentation only. **No code, schema, CSS, UI, dependency, or test changes.**

Awaiting approval of corrections, unresolved decisions, sequence, and Step 1 criteria.
