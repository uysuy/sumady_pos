# Coffee Plus POS — Implementation Status

**Generated from repository inspection:** 2026-11-17  
**Codebase:** `pos-web` (Svelte 5 + SvelteKit + Tailwind 4 + Paraglide)  
**Source of truth:** source under `src/`, not prior chat claims.

**Verification legend**

| Label | Meaning |
| --- | --- |
| **Implemented** | Feature logic and UI exist in code |
| **Partial** | UI and/or logic incomplete or simplified |
| **Not implemented** | No meaningful implementation found |
| **External not connected** | Adapter/interface exists; real Sumady/ERP/payment not wired |
| **Tested** | Covered by automated test and/or documented manual check in this repo |
| **Not fully tested** | Works in demo code paths; little/no automated coverage |

Automated tests found: `src/lib/domain/money.test.ts` only.

---

## 1. Architecture (actual)

```
src/routes/+layout.ts     → ssr = false, prerender = false (client SPA)
src/routes/+layout.svelte → Shell wraps all pages
src/routes/*              → pages
src/lib/state/demo.svelte.ts → single demo app store + localStorage (`coffee-plus-pos.v1`)
src/lib/domain/*          → money, catalog, payments, reports, product-resolve, types
src/lib/data/seed.ts      → seed catalog, venues, sample orders
src/lib/erp/mock-adapter.ts → offline/online mock ERP submit (idempotent posTransactionId)
src/lib/components/*      → shared UI
src/app.css               → @theme tokens + .btn/.field/.card/.badge/.chip
messages/{en,kh}.json     → Paraglide locales (en, kh)
```

Permissions are role-string based (`demo.can('pos' | 'kitchen' | …)`). Staff/branch switch is demo-only in the shell.

---

## 2. Routes (screens present)

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | POS catalog, cart, customize, checkout, hold | Implemented — Not fully tested |
| `/orders` | Order list + filters | Implemented — Not fully tested |
| `/orders/[id]` | Order detail, receipt, refund UI | Implemented — Not fully tested |
| `/kitchen` | KDS lanes, item ready, bump/recall, station chips | Implemented — Not fully tested |
| `/products` | Product CRUD, archive, branch override, tax | Implemented — Not fully tested |
| `/categories` | Categories + modifier groups | Implemented — Not fully tested |
| `/customers` | Customer list + create/edit | Implemented — Not fully tested |
| `/customers/[id]` | Customer history / spend | Implemented — Not fully tested |
| `/shifts` | Open/close shift, cash in/out | Implemented — Not fully tested |
| `/reports` | Demo sales summary + ECharts bar chart | Implemented — Not fully tested |
| `/staff` | Staff + role permissions | Implemented — Not fully tested |
| `/settings` | Shop, branches, tables, tax categories, payments, kitchen sound | Implemented — Not fully tested |
| `/sync` | Outbox list + sync actions | Implemented — Not fully tested |

---

## 3. Feature matrix (by capability)

### Selling / cart / pay

| Feature | Status | Notes |
| --- | --- | --- |
| Product grid + category chips | Implemented | Uses `resolveProduct` for branch price/availability |
| Modifiers / customize dialog | Implemented | Validation in `catalog.ts` + save flows |
| Cart, qty, discount, note | Implemented | `cart-panel.svelte` |
| Order types dine-in / takeaway / delivery | Implemented | Delivery fields required for delivery pay |
| Hold / resume / cancel held | Implemented | |
| Multi-tender pay | Implemented | `pay()` + `checkout-dialog` |
| Offline tender limits / fail simulate | Implemented | Demo codes on `PayCode` |
| Shift required for pay | Implemented | `no_shift` path |
| Browser receipt print | Partial | `ReceiptView` + print CSS; not a real printer driver |

### Orders / refunds

| Feature | Status | Notes |
| --- | --- | --- |
| Order list + detail | Implemented | |
| Full / partial refund | Implemented | `refund()` allocates across tenders |
| Cancel paid | Implemented | `cancelPaid()` |
| Split bill | Not implemented | No code |
| Table transfer / merge | Not implemented | Table select only |

### Kitchen

| Feature | Status | Notes |
| --- | --- | --- |
| Status lanes + ticket move | Implemented | NEW→PREPARING→READY→COMPLETED; UI also splits Preparing into In progress / Near ready |
| Item-level ready | Implemented | `kitchenLine` |
| Sound + flash on new | Implemented | |
| Long-wait (≥10 min) rush | Implemented | Hardcoded threshold |
| Category “station” filter chips | Partial | Filters by product category; not real prep-station routing |
| Separate bar KDS / station IDs | Not implemented | |
| Kitchen ticket reprint | Not implemented | Customer receipt reprint only |

### Catalog / commercial menu

| Feature | Status | Notes |
| --- | --- | --- |
| Products create/edit | Implemented | `saveProduct` |
| Sold-out / available | Implemented | `setProductAvailability` |
| Archive / restore (`active`) | Implemented | `setProductArchived` |
| Tax categories + product tax pick | Implemented | `taxCategories`, `saveTaxCategory` |
| Branch price / availability overrides | Implemented | `branchOverrides` + `product-resolve.ts` |
| Product `sortOrder` | Implemented | |
| Categories + modifiers EN/KH, min/max | Implemented | `saveCategory`, `saveModifierGroup` |
| Inactive category hide on POS | Implemented | Filter on active categories |
| Category reassignment warnings (commercial 3B) | Not implemented / Partial | No dedicated warn flow found beyond normal saves |

### Customers

| Feature | Status | Notes |
| --- | --- | --- |
| CRUD + active flag | Implemented | |
| Bilingual name required | Implemented | |
| Phone validation | Partial | Digits length ≥6 only — not full KH `0XX` / `+855` rules |
| Order history on detail | Implemented | |
| Customer merge | Not implemented | |
| Loyalty points / config | Not implemented | |

### Shifts / reports / staff / settings

| Feature | Status | Notes |
| --- | --- | --- |
| Open / close shift, cash move | Implemented | |
| Reports by period/category/tender | Implemented | Client-side from local orders (`reports.ts`) + ECharts on `/reports` |
| Staff + role permissions UI | Implemented | |
| Multi-branch + tables in settings | Implemented | Seed includes café / skybar / restaurant venues |
| Payment method toggles | Implemented | Settings |
| Kitchen sound setting | Implemented | |

### Sync / ERP

| Feature | Status | Notes |
| --- | --- | --- |
| Outbox + sync UI | Implemented | |
| Mock ERP adapter | External not connected | `mock-adapter.ts` invents `SI-DEMO-*` IDs; offline returns fail |
| Real SumadyERPAdapter | Not implemented | |
| Real KHQR / card gateway | Not implemented | Demo tender simulation only |

---

## 4. Technical debt (observed in code)

1. Almost no automated tests beyond money helpers.
2. Large monolith store `demo.svelte.ts`.
3. Admin list tables duplicated across orders/products/customers/staff.
4. Page chrome (`p-4 md:p-6` + `h1.text-2xl`) duplicated across many routes.
5. `app.css` hardcodes many hex values that duplicate `@theme` tokens.
6. Customize/checkout sometimes bypass shared controls (inline checkbox markup; native `<select>` in places).
7. Persist is localStorage JSON of entire demo state (demo-scale only).
8. Kitchen/station model is category filter, not routing stations.

---

## 5. Suggested phase framing (for planning only)

Based on **what exists vs what is missing in code** (not a claim of prior phase completion certificates):

| Focus | State |
| --- | --- |
| Core POS + orders + kitchen + shifts + reports + staff + settings | **Present in code** |
| Commercial catalog (tax categories, branch overrides, archive) | **Present in code** |
| Commercial categories polish (reassignment warnings) | **Gap** |
| Commercial customers (KH phone, merge, loyalty flag) | **Gap** |
| Floor ops (split bill, transfer/merge tables, true stations) | **Gap** |
| Online/loyalty/QR channel sync | **Gap** |
| Real ERP / payments | **Gap** |

---

## 6. Recommended next implementation step

**Either:**

1. **Commercial categories/modifiers hardening** (warn on reassignment / inactive group assignment) — catalog already exists; polish rules next, **or**
2. **UI token hygiene only** (map `app.css` hex → CSS variables) — docs-driven, low behavior risk,

…after product owner approval. Do not start a redesign without approval.
