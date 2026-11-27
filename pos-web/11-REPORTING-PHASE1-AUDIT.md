# Reporting Phase 1 — Audit Findings

**Date:** 2026-11-18  
**Scope:** Code inspection only. No report implementation in this phase.  
**Primary sources:** `src/routes/reports/+page.svelte`, `src/lib/domain/reports.ts`, `src/lib/domain/order-payments.ts`, `src/lib/domain/types.ts`, `src/routes/shifts/+page.svelte`, `src/lib/domain/money.ts`

---

## 1. What exists today

### Screen

| Item | Detail |
| --- | --- |
| Route | `/reports` only (`src/routes/reports/+page.svelte`) |
| Nav | Shell link “Sales & Reports” |
| Permission | Role may include `'reports'`, but **the reports page does not call `demo.can('reports')`** — any staff can open the URL |
| UI shape | Date chips (today / yesterday / last7 / custom) → KPI cards → ECharts bar → four summary lists |

### Calculations (`summarize` in `reports.ts`)

Scoped to **`demo.state.activeBranchId`** (shell branch), date via `paidAt ?? createdAt`.

| Metric | How computed (code) |
| --- | --- |
| Paid set | `PAID` or `PARTIAL_REFUND`, not `HELD`/`CANCELLED`, in range |
| Gross | Sum `order.totals.subtotal` |
| Discounts | Sum `order.totals.discount` |
| Tax | Sum `order.totals.tax` |
| Net | Sum `order.totals.total` |
| Refunds | Sum `refundedTotal(order)` for refunded / partial-refund / refund rows in range |
| Collected | `net - refunds` |
| AOV | `collected / orderCount` |
| By category / top products | Sum **line `lineTotal`** and qty (order-level discount **not** allocated to lines) |
| By payment | Sum tender `amount` from `orderPayments` on paid set |
| By cashier | Sum `total - refundedTotal` per `cashierId` |
| Series | Hourly 07–21 if range ≤ ~36h; else daily totals of `order.totals.total` |

### Related but not under `/reports`

| Location | What |
| --- | --- |
| `/shifts` + `shiftFigures()` | Cash vs non-cash sales, cash in/out, expected vs counted |
| `/orders`, `/orders/[id]` | Transaction truth for drill-down (no link from reports today) |
| `settings.usdToKhr` | Exchange rate for KHR display (not hardcoded in report calc) |

### Shared UI / export

| Capability | Present? |
| --- | --- |
| Shared report page header component | No (inline `h1`) |
| Branch filter control on report | No (uses active shell branch only) |
| Cashier filter | No |
| Detailed data table + sort/search/pagination | No |
| Export CSV / Excel / PDF | **No** |
| Loading / error states | No (sync local derive only) |
| Empty state | Yes (`empty_report` copy) |
| EN/KH labels | Yes (Paraglide) |
| USD + KHR display | Yes (`formatUsd` / `formatKhr` + `settings.usdToKhr`) |

---

## 2. Available data sources (domain model)

| Entity | Usable fields for reporting |
| --- | --- |
| **Order** | `branchId`, `cashierId`, `shiftId`, `orderType`, `tableId`, `paidAt`, `createdAt`, `totals.*`, `discountMode/Value`, `paymentStatus`, `orderStatus`, `payments[]`, `refunds[]`, `refundedTotal`, `lines[]` |
| **CartLine / order line** | `productId`, `productName`, `categoryId`, `sku`, `quantity`, `unitPrice`, `lineTotal`, `baseUnitPrice`, **`selectedModifiers[]`** (group/option names + priceDelta) |
| **Payment** | `method` (`CASH`/`CARD`/`QR`/`GRABPAY`), `amount`, `amountReceived`, `changeDue`, `status`, `createdAt` |
| **RefundRecord** | `amount`, `method`, `kind`, `reason`, `staffId`, `createdAt` |
| **CashShift** | `openingCash`, `movements[]` (CASH_IN/OUT), `countedCash`, `expectedCash`, `cashSales`, `nonCashSales` |
| **Settings** | `usdToKhr`, `currency: 'USD'`, tax categories |
| **Cost / recipe / COGS** | **Not in model** — profitability reports must stay unavailable |
| **Settlement / bank batch** | **Not in model** — do not invent |

Money is integer **cents USD** throughout; KHR is display conversion via configurable `usdToKhr`.

---

## 3. Known calculation / integrity gaps (current summary)

1. **Branch** = shell active branch only; no multi-branch compare on one screen.  
2. **Product totals use `lineTotal`**, which does not share order-level discount/tax down to lines → product/category totals can disagree with order net.  
3. **Variants/modifiers** exist on lines but are **ignored** in aggregates (same `productId` rolled together).  
4. **Top products** capped at 5; no full product/category/cashier detail tables.  
5. **Hour series** fixed 07:00–21:00 window; overnight sales outside that window dropped from hourly chart.  
6. **Refunds:** partial-refund orders sit in both paid and refunded filters — `collected = net - refunds` needs careful re-spec for Phase 3 so refunds are not double-applied vs net.  
7. **Cancelled / held** excluded from paid set (good); confirm every new report uses the same rule.  
8. **QR/CARD/GRABPAY** already separated from cash in `orderCashApplied` / `orderNonCashApplied` (shift logic) — report payment module must keep that distinction.  
9. **No permission gate** on `/reports` page.  
10. **No export**; no drill-down to `/orders/[id]`.

---

## 4. Report implementation matrix

Status: **Present** = usable UI+logic · **Partial** = summary-only / incomplete · **Missing** = not built · **Unavailable** = no data source (must not fake)

### A. Sales reports (Phase 3 target)

| Report | Existing | Missing | Data sources | Required calculations | Dependencies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **Sales summary dashboard** | KPIs, chart, 4 lists | Filters, export, permission, line-discount allocation | Orders + lines + payments | Documented `summarize` (revise for consistency) | Active branch | **Partial** |
| **1. Sales Detail** | — | Order-level rows, filters, drill-down, export | Orders, payments, refunds | Gross/discount/tax/net/refund/collected per order | Orders route | **Missing** |
| **2. Sales by Product** | Top 5 list only | Full table, qty, gross/net, refunds, filters | Lines + products | Aggregate by `productId`; allocate order discount/tax/refund policy | Shared allocator | **Partial** |
| **3. Sales by Category** | Totals list only | Qty, net vs gross, filters, export | Lines + categories | Aggregate by `categoryId` | Same allocator | **Partial** |
| **4. Sales by Variant** | — | Identity key = product + modifier option set | `selectedModifiers` | Group by normalized modifier signature | Modifier display helper | **Missing** |
| **5. Sales by Modifier** | — | Per option qty/revenue | `selectedModifiers.priceDelta` × qty | Attribute delta revenue; note base price elsewhere | — | **Missing** |
| **6. Sales by Hour** | Chart series only | Full 0–23 or shop hours setting, table, filters | `paidAt` | Bucket by local hour | Locale/time | **Partial** |
| **7. Sales by Cashier** | Totals list only | Detail table, filters, export | `cashierId` | Net after refunds; order count | Staff names | **Partial** |
| **8. Sales by Branch** | Implicit single branch | Multi-branch table / compare | `branchId` | Same metrics per branch | Branch list; may need permission | **Missing** (as report) |

### B. Payment & cashier reports (Phase 4 target)

| Report | Existing | Missing | Data sources | Required calculations | Dependencies | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **Payment Summary** | By-payment list (tender amounts on paid orders) | Cash vs non-cash net, refunds by method, filters | `payments[]`, `refunds[]` | Paid by method − refunds by method; never treat QR/CARD as drawer cash | `order-payments.ts` | **Partial** |
| **Payment Detail** | — | Tender-level rows linked to orders | Payments | Amount paid / received / change | — | **Missing** |
| **Refund Detail** | KPI refunds total only | Row per refund | `refunds[]` | Amount, method, kind, reason, staff | — | **Missing** |
| **Discount Detail** | KPI discounts total only | Per-order discount rows | `discountMode/Value`, `totals.discount` | Order-level discounts (line discounts N/A — none stored separately) | — | **Missing** |
| **Cashier Shift Report** | On `/shifts` via `shiftFigures` | Unify under reporting module / date filters / export | Shifts + orders | Opening + cash sales − cash refunds + in − out = expected | Shift APIs | **Partial** (wrong module) |
| **Cash Movement Report** | Movements shown in shift UI | Dedicated filtered report + export | `shift.movements` | Sum CASH_IN / CASH_OUT | — | **Partial** (wrong module) |

### C. Explicitly unavailable (do not implement as “real” numbers)

| Report / field | Reason |
| --- | --- |
| Profit / margin / COGS | No recipe cost or ingredient cost in POS model |
| Inventory valuation | Sumady ERP authority; not in POS |
| Bank settlement / KHQR reconciliation | No settlement feed; demo tenders only |
| Official accounting P&L | Mock ERP only |

---

## 5. Proposed shared reporting framework (Phase 2 — not built yet)

Reuse Coffee Plus tokens/components only:

| Piece | Approach |
| --- | --- |
| Domain layer | Extend `src/lib/domain/reports.ts` (or `reports/*.ts`) — **no formulas in pages** |
| Filters | Date range (existing chips + custom), **branch SelectMenu**, **cashier SelectMenu**, report-specific chips |
| Layout | Admin page pattern (`p-4 md:p-6`), `.card` KPIs, `.btn` export |
| Tables | Same table markup pattern as orders/products (until shared DataTable exists) |
| Money/date | `formatUsd` / `formatKhr` / locale-aware dates; `settings.usdToKhr` |
| Permission | Gate with `demo.can('reports')` |
| Export | CSV first (filter-faithful); Excel/PDF after CSV validated |
| Drill-down | Links to `/orders/[id]` |

**Calculation policy to lock in Phase 2/3 (before coding detail reports):**

- **Gross** = sum line merchandise before order discount (or document as order subtotal — pick one and stick to it).  
- **Discount** = order `totals.discount` (only order-level exists).  
- **Net sales** = paid order `totals.total` − refunds attributed in period.  
- **Cash drawer** = CASH tenders − CASH refunds + CASH_IN − CASH_OUT; **CARD/QR/GRABPAY never enter drawer cash**.  
- **Cancelled/held** excluded from sales; refunds reported separately and netted consistently.

---

## 6. Phase 1 conclusions

| Question | Answer |
| --- | --- |
| Is reporting “complete”? | **No** — one summary dashboard only |
| Enough data for sales/payment/cashier detail reports? | **Yes**, from orders/lines/payments/refunds/shifts |
| Enough data for profitability? | **No** |
| Biggest integrity risk? | Line totals vs order discount; refund netting; hourly window |
| Export? | **None** |
| Framework? | **None** — page-local UI + single `summarize` |

---

## 7. Recommended next step (awaiting approval)

**Do not start Phase 2+ until approved.**

Suggested sequence after approval:

1. **Phase 2** — Shared filter bar + permission gate + document money definitions in `reports` domain module.  
2. **Phase 3** — Sales Detail + by Product/Category/Modifier/Hour/Cashier/Branch (variant after product).  
3. **Phase 4** — Payment/Refund/Discount detail + pull shift/cash movement into reporting UX.  
4. **Phase 5** — CSV export → then Excel/PDF; scenario test matrix from the brief.

---

## 8. Files inspected

- `src/routes/reports/+page.svelte`
- `src/lib/domain/reports.ts`
- `src/lib/domain/order-payments.ts`
- `src/lib/domain/types.ts` (Order, CartLine, Payment, Refund, Shift, SalesSummary)
- `src/lib/domain/money.ts` (formatters; used by UI)
- `src/routes/shifts/+page.svelte` (shift figures consumer)
- `src/lib/components/shell.svelte` (nav)
- `src/lib/data/seed.ts` (roles permissions include `reports` for cashier/manager; barista does not)
