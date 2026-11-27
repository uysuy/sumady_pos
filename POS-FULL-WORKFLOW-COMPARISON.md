# POS Full Workflow Comparison

**Research date:** 2026-11-20  
**Revision:** 2026-11-20 — see **`POS-LIFECYCLE-AND-ARCHITECTURE.md`** for split bill vs multi-tender, state machines, stations, floor, shift closing report, KHQR layers.  
**Coffee Plus baseline:** `sumady_pos/pos-web` (Svelte 5 / SvelteKit / Tailwind 4 / Paraglide EN·KH)  
**Git SHA:** unavailable · **Screenshots:** `POS-REFERENCE-SCREENSHOTS/`  
**Verification legend:** **Demo** = navigated live · **README** = documented only · **Code** = Coffee Plus repo inspected

Classification for Coffee Plus column:  
**OK** = already good · **Partial** = exists but incomplete · **UX** = exists with workflow weakness · **Missing** · **N/A** = not needed for target SMEs now

### Critical distinction (revision)

| Term | Meaning | Coffee Plus |
|---|---|---|
| Multi-tender / split **payment** | Several methods on **one** bill | **OK** (CheckoutDialog) |
| Split **bill** | Multiple sub-bills (items / equal / amounts), each payable | **Missing** — design in lifecycle doc §1 |

---

## A. Login and cashier setup

### Adminium (Demo)

| Step | Behaviour |
|---|---|
| Start | Staff chips (role shown) |
| Action | Enter 4-digit PIN (demo autofill available) |
| Next | Opening float / shift start narrative |
| Rule | Wrong PIN shakes; auto-submit at 4 digits |
| Result | Enter register / floor |

### Elitale (Partial demo)

| Step | Behaviour |
|---|---|
| Start | Landing → Staff Login → name list |
| Action | 4–6 digit PIN |
| Next | Role-routed UI (waiter / kitchen / cashier) — **not completed after PIN** |
| Error | “Incorrect PIN.” (observed) |

### Coffee Plus (Code)

| Step | Behaviour |
|---|---|
| Start | Shell opens; pick staff + branch from header |
| Action | No PIN |
| Rule | `demo.can(permission)` gates screens |
| Result | Immediate POS access |

| Feature | Reference workflow | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| PIN login | Adminium / Elitale / Tavo | Missing | Weak accountability | Optional PIN lock for production demo | P1 |
| Opening float | Adminium close/open float | Partial — shift open cash | No dedicated float UX on login | Tie float to `/shifts` open flow | P2 |
| Role home screens | Elitale routes by role | Partial — nav hidden by permission | OK for demo | Keep; optional KDS-only home later | P2 |

---

## B. Product and menu

### Adminium Register (Demo)

- Favourites quick-add strip  
- Category chips + density toggle  
- Photo cards; sold-out overlay; “Only N left”  
- Modifier bottom-sheet (size / milk / extras / seat / note) with live deltas  

### Coffee Plus (Code)

- Category chips + search + product cards (`ProductThumb`)  
- `CustomizeDialog` for modifier groups (SINGLE/MULTIPLE, min/max, required, conditional ice)  
- Branch price/availability overrides  
- Sold-out boolean; archive  

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Photo menu | Adminium | OK | — | Keep | — |
| Favourites | Adminium | Missing | Speed for cashiers | Optional “pinned” products | P2 |
| Nested modifiers | POSR README | Partial — flat groups + conditional | Deep nesting rare in KH cafés | Keep flat; document conditional as enough | N/A |
| Stock qty / 86 | Adminium / OPEN-POS | Partial — boolean available | No qty sync | Stay boolean until Sumady stock API | P2 |
| Branch pricing | Coffee Plus stronger | OK | — | Keep | — |

---

## C. Order taking

### Adminium (Demo)

| Step | Behaviour |
|---|---|
| Start | Register with table ticket |
| Actions | Add items → Send to kitchen → Hold tray → Transfer / Discount on ticket |
| Rule | Sent lines show “Sent”; void requires typing VOID |
| Pay | Separate Payment screen |

### Coffee Plus (Code)

| Step | Behaviour |
|---|---|
| Start | `/` POS + `CartPanel` |
| Actions | Dine-in table / takeaway / delivery fields; customize; qty; notes; hold/resume |
| Kitchen | Items with `preparesInKitchen` go NEW on pay (not on “Send”) |
| Edit after pay | Order detail / refund — not mid-prep ticket edit |

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Hold / resume | Adminium / Coffee Plus | OK | — | Keep | — |
| Send before pay | Adminium / Tavo fire | UX | Café often pays then cook; restaurants need fire | Add optional **Send to kitchen** without closing check | P0 restaurant |
| Void sent lines | Adminium VOID confirm | Missing | Risk of silent deletes | Manager-confirm void after send | P1 |
| Delivery courier | OPEN-POS rider | Partial — address fields | No rider app | Keep fields; no courier stack | N/A |

---

## D. Kitchen Display System

### Adminium (Demo)

- Columns: New / In progress / Ready  
- Bump / Clear ticket  
- All-day item aggregate  
- Aging timers (red when late)  

### Coffee Plus (Code)

- Lanes NEW / PREPARING / near-ready / READY / COMPLETED  
- Order + line ready; recall; sound/flash; 10‑min rush hardcoded  
- Category chips as “station” proxy  

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Multi-lane bump | Adminium | OK | — | Keep layout; polish only | — |
| True bar vs kitchen stations | POSR / Adminium | Partial | Skybar story weak | Add `prepStation` on product/category | P0 multi-venue |
| Configurable rush SLA | — | Partial | Hardcoded 10m | Setting: rush minutes | P1 |
| Kitchen ticket reprint | OPEN-POS / Tavo | Missing | Ops pain | Print kitchen ticket from KDS card | P1 |
| All-day aggregate | Adminium | Missing | Nice for bar peak | Optional aggregate strip | P2 |

---

## E. Payment and checkout

### Adminium (Demo)

- Tip presets + custom  
- Split evenly / charge fraction  
- Cash / Card (simulated) / QR / Gift card  
- Decline path on simulated reader  

### Coffee Plus (Code)

- Multi-tender CASH / CARD / QR / GRABPAY  
- Change for cash; simulate fail  
- Open shift required; offline cash-only + limit  
- Discount % / fixed on cart  

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Multi-tender | Adminium / Coffee Plus | OK | Demo settlement only | Keep; wire adapters later | — |
| Tips | Adminium / Tavo / POSR | Missing | Common for tourist cafés | Optional tip on checkout | P1 |
| Split bill (items/equal/amount) | Adminium fraction UI = Demo amount-like only | Missing | Not same as multi-tender | See lifecycle §1; sequence Step 5 | After OPEN orders |
| KHQR | UI vs adapter vs provider — lifecycle §6 | Missing | Never PAID on QR show | Step 10 INT | After stable pay |
| Service charge | OPEN-POS / POSR | Missing | Some KH restaurants | Optional % by order type | P2 |
| Gift / loyalty pay | Adminium | Missing | Nice-to-have | **N/A** until Sumady CRM | N/A |

---

## F. Tables and restaurant operations

### Adminium Floor (Demo)

- Zones; open / occupied / needs attention  
- Bill requested state  
- Move/Merge workflow card  

### Coffee Plus (Code)

- Tables in settings; select on cart  
- Occupancy helper for reports  
- No visual floor, merge, move, multi-check table  

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Visual floor | Adminium / Elitale | Missing | Restaurant UX | Simple zone + table cards (reuse badges) | P0 restaurant |
| Move / merge | Adminium | Missing | Ops | Transfer order ↔ table | P1 |
| Multi-order per table | POSR | Missing | Complex | Defer unless resto pitch | P2 |
| Reservations | Adminium cards | Missing | Separate product | **N/A** for v1 | N/A |

---

## G. Receipts and printing

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Customer receipt designer | Coffee Plus strong | OK | — | Keep EN/KH designer | — |
| 58 / 80 / A4 | Coffee Plus + OPEN-POS | OK | Browser print only | Keep | — |
| Kitchen KOT | OPEN-POS / Tavo | Missing | Ops | Kitchen ticket layout + print | P1 |
| ESC/POS drivers | OPEN-POS | Missing | Hardware | Phase after browser KOT | P2 |
| Reprint customer | Coffee Plus | OK | — | Keep | — |

---

## H. Reports and cashier closing

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Sales tabs + CSV | Coffee Plus / OPEN-POS | OK | Refund consistency notes in docs | Keep; fix reporting edge cases | P2 |
| Cashier Shift Closing Report | Tavo/Adminium “end of day” (README/Demo labels) | Partial — `shiftFigures` exists | Not a fiscal Z-report | Printable closing report §5 lifecycle | Step 8 |
| Tips / void reports | POSR / Tavo | Missing | Depends on tip/void features | After tip/void land | P2 |
| P&amp;L / expenses | OPEN-POS | Missing | ERP owns accounting | **Do not duplicate** | N/A |

---

## I. Administration and settings

| Feature | Reference | Coffee Plus | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| Products / modifiers / tax / branches | Coffee Plus | OK | — | Keep | — |
| Staff permissions | Coffee Plus | OK | Demo switcher | Keep; PIN later | — |
| Printer config | OPEN-POS | Missing | — | Settings stub → later ESC/POS | P2 |
| QR guest ordering | Elitale / POSR | Missing | Channel product | Out of POS core; optional later | P2 |
| Internal inventory ledger | POSR / OPEN-POS / Elitale recipes | Missing by design | Sumady owns stock | **Do not add official ledger** | N/A |

---

## End-to-end: typical café sale

### Coffee Plus today (Code)

1. Shell → POS `/`  
2. Pick product → CustomizeDialog → cart  
3. Optional customer / discount  
4. Ensure shift open → CheckoutDialog → multi-tender  
5. Kitchen gets NEW if prep flag  
6. Receipt via browser print  
7. Outbox → MockERPAdapter  

### Adminium restaurant path (Demo)

1. PIN login → float  
2. Floor seat / Register ticket  
3. Add + modifiers → **Send** → kitchen  
4. Pay with tip/split → receipt  
5. KDS bump to ready  

**Gap summary:** Coffee Plus is **pay-centric café**. Adminium is **fire-then-pay restaurant**. Both valid; Coffee Plus should support **optional fire-before-pay** for restaurant branches without ripping café UX.

---

## Error / exception behaviour (notable)

| Case | Reference | Coffee Plus |
|---|---|---|
| Offline non-cash | Tavo blocks cards | Blocks non-cash + cash limit |
| Payment fail | Adminium simulated decline | `checkoutPhase === 'failed'` keeps cart |
| Wrong PIN | Elitale alert | N/A (no PIN) |
| Refund reason | — | Required in order detail |

---

## Screenshot map

See `POS-REFERENCE-SCREENSHOTS/README.md`.
