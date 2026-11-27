# Reporting research + Phase 2/3 status

**Date:** 2026-11-18

## Research — which reports matter for Cambodia SME cafés / restaurants

Sources reviewed: Cambodian POS products (Scale KH, BrownPOS, Bill&Go, Humaneti) and café POS report patterns (Sansflow, Dripos, Kafe360, shift Z-report practice).

### Must-have for Cambodia SME counters (~12)

| # | Report | Why it matters locally |
| --- | --- | --- |
| 1 | **Day / period sales summary** | Owner asks “how much today?” before locking the door |
| 2 | **Sales detail (order list)** | Dispute resolution, drill to receipt |
| 3 | **Sales by product** | Menu decisions; top / slow movers |
| 4 | **Sales by category** | Coffee vs food vs retail mix |
| 5 | **Sales by hour** | Staffing for morning rush / evening |
| 6 | **Payment method mix** | Cash vs **KHQR** vs card must stay separate |
| 7 | **Cashier sales** | Accountability per PIN / staff |
| 8 | **Shift / Z-style cash report** | Opening float, expected vs counted, cash in/out |
| 9 | **Refund / return detail** | Leakage control |
| 10 | **Discount detail** | Promo control |
| 11 | **Dual currency (USD + KHR)** | Every Cambodian competitor shows both; rate must be configurable |
| 12 | **CSV / PDF export** | Owner Telegram / accountant share |

### Strong for coffee / multi-branch

| # | Report | Why |
| --- | --- | --- |
| 13 | **Sales by variant** | Size / ice / milk combinations |
| 14 | **Sales by modifier** | Extra shot, toppings revenue |
| 15 | **Sales by branch** | Multi-outlet SMEs |
| 16 | **Cash movement** | Petty cash trail inside the shift |

### Do **not** promise as POS “truth”

| Topic | Reason |
| --- | --- |
| Gross margin / COGS / profit | Needs reliable recipe cost — not in Coffee Plus model |
| Inventory valuation | Sumady ERP authority |
| Bank / KHQR settlement batch | Needs processor settlement feed — not available |
| Official tax filing pack | Accountant / ERP job |

**Suitable count for Coffee Plus operational POS:** about **14–16** reports (the must-have set + variant/modifier/branch/cash movement). Profitability suite stays **unavailable**.

---

## Implemented in this change (Phase 2 + Phase 3)

### Framework (Phase 2)

- Shared calc policy in `report-core.ts`
- Aggregations in `sales-reports.ts`
- Filter bar component `report-filters.svelte` (date, branch, cashier, CSV)
- Permission gate `demo.can('reports')`
- USD + KHR via `settings.usdToKhr`
- Search + pagination on detail tabs
- CSV export (filter-faithful) for every tab

### Sales reports (Phase 3) — visible under `/reports` tabs

1. Summary (dashboard)
2. Sales detail (links to `/orders/[id]`)
3. By product
4. By category
5. By variant (product + modifier signature)
6. By modifier (option qty + delta revenue)
7. By hour (0–23, shop hours emphasized)
8. By cashier
9. By branch

### Not yet (Phase 4 / 5)

- Payment summary/detail screens (payment mix is on Summary only)
- Refund detail / Discount detail dedicated tables
- Cashier shift + cash movement inside Reports (still primarily `/shifts`)
- Excel / PDF
- Full scenario QA matrix on live demo transactions

---

## How to see it

1. Run the app, sign in as **cashier** or **manager** (role with `reports`).
2. Open **Sales & Reports**.
3. Use the chips: Summary, Sales detail, By product, …
4. Change date / branch / cashier filters; Export CSV.
