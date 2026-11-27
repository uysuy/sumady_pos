# Coffee Plus POS — UI Component Inventory

**Inspected:** `src/lib/components/*.svelte`, `src/app.css`, route imports  
**Updated:** 2026-11-17  
**Standard:** [`09-UI-UX-QUALITY-STANDARD.md`](./09-UI-UX-QUALITY-STANDARD.md)

**Rule:** If a row says **New equivalent prohibited**, do not create a parallel component.

---

## 1. Svelte components

| Name | Path | Purpose | Key props / variants | Used by | New equivalent? |
| --- | --- | --- | --- | --- | --- |
| Shell | `src/lib/components/shell.svelte` | Sidebar, header, locale, staff/branch, toast, global confirm | `children` | `routes/+layout.svelte` | **Prohibited** |
| Dialog | `src/lib/components/dialog.svelte` | Modal: brand/plain header, body, footer snippet | `title`, `onclose`, `wide`, `brand`, `leading`, `footer`, `children` | Shell confirm; POS; products; categories; customers; staff; customize; checkout | **Prohibited** |
| SelectMenu | `src/lib/components/select-menu.svelte` | Custom select | `value`, `options`, `tone` light/dark, `face`, `disabled`, `onchange` | Shell; cart; orders; products; categories; staff; shifts; settings | **Prohibited** |
| UiCheckbox | `src/lib/components/ui-checkbox.svelte` | Checkbox control | `checked`, `label`, `disabled`, `onchange`, `children` | products; categories; customers; staff; settings; (customize should prefer this) | **Prohibited** |
| ProductThumb | `src/lib/components/product-thumb.svelte` | Image or coffee placeholder | `src`, `alt`, `class` | products | Prefer for thumbs |
| CartPanel | `src/lib/components/cart-panel.svelte` | POS cart drawer/panel | reads `demo` | `/` POS | Domain OK |
| CheckoutDialog | `src/lib/components/checkout-dialog.svelte` | Pay + success/fail | reads `demo`; uses Dialog, ReceiptView | `/` POS | Domain OK |
| CustomizeDialog | `src/lib/components/customize-dialog.svelte` | Modifiers / qty / note | `product`; uses Dialog | `/` POS | Domain OK |
| ReceiptView | `src/lib/components/receipt-view.svelte` | Printable receipt block | `order` | checkout; `orders/[id]` | Prefer reuse |
| AdminSection | `src/lib/components/admin-section.svelte` | Settings/list section: title, hint, actions, body | `title`, `hint`, `pad`, `actions`, `children` | settings; categories | Prefer for admin config panels |

**Routes with no direct `$lib/components` import (still wrapped by Shell):**  
`/kitchen`, `/reports`, `/sync`, `/customers/[id]` (orders detail imports ReceiptView only).

---

## 2. CSS component classes (`src/app.css`)

| Class family | Purpose | New equivalent? |
| --- | --- | --- |
| `.btn*` | Buttons | **Prohibited** |
| `.field` | Inputs | Prefer |
| `.card` | Panels | Prefer |
| `.config-table` / `.config-empty` | Admin config grids (Sumady-inspired, POS tokens) | Prefer for settings/list tables |
| `.badge*` | Status pills | **Prohibited** to invent alternate pill systems |
| `.chip*` | Toggle filters | Prefer |
| `.product-card*` | POS tiles | POS-only OK |
| `.select-*` | SelectMenu chrome | Do not fork |
| `.ui-check*` | Checkbox visuals | Via UiCheckbox |
| `.ui-overlay` / `.ui-dialog` / `.ui-drawer*` / `.ui-toast` | Motion shells | Keep centralized |
| `.nav-link` | Sidebar rows | Shell only |
| `.num` | Tabular numbers | Prefer on money |

---

## 3. Helpers (non-visual)

| Name | Path | Purpose |
| --- | --- | --- |
| `demo` store | `src/lib/state/demo.svelte.ts` | All demo business actions + persist |
| `motionMs` | `src/lib/motion.ts` | Reduced-motion-aware durations |
| i18n | `src/lib/i18n/*`, `messages/en.json`, `messages/kh.json` | Labels / locale |
| `resolveProduct` | `src/lib/domain/product-resolve.ts` | Branch price/availability |

---

## 4. Duplicated page patterns (not extracted)

| Pattern | Evidence | Recommendation |
| --- | --- | --- |
| Page frame | `h-full overflow-auto p-4 md:p-6` on most admin routes | Future `.ui-page` |
| Page title | `h1.text-2xl.font-semibold` | Future `.ui-title-page` / PageHeader |
| Data tables | Nearly identical `<table>` in `orders`, `products`, `customers`, `staff` | Shared classes or thin DataTable |
| Form field | `label.text-sm.font-semibold` + `input.field` many forms | Optional FormField later |
| Dialog footer | Cancel secondary + Save primary snippets | Keep snippets; optional DialogActions |
| Chip toolbars | POS, kitchen, orders, settings, reports | Compose `.chip`; optional ChipGroup |
| Stat tiles | reports, customer detail, kitchen overview, shifts | Optional StatCard |
| `payBadge` helper | Duplicated on orders list + detail (if still present) | Single `$lib` helper |

---

## 5. Inconsistencies / bypasses (code-observed)

1. **CustomizeDialog** may inline `.ui-check-box` markup instead of always using `UiCheckbox`.
2. **CheckoutDialog** uses native `<select class="field">` in places instead of `SelectMenu`.
3. Some action footers use one-off button classes instead of `.btn`.
4. **Kitchen** uses shared CSS classes but no shared Svelte primitives (acceptable exception if brand tokens kept).
5. KPI text sizes vary (`text-xl` / `2xl` / `3xl`) across reports / kitchen / shifts.

---

## 6. Candidates to add later (only if reuse count justifies)

| Candidate | Create when |
| --- | --- |
| PageHeader | Migrating ≥3 admin headers in one approved pass |
| DataTable / table CSS | Touching ≥2 list tables for shared styling |
| EmptyState | Unifying empty copy patterns |
| FormField | New dense multi-field forms beyond settings |
| DialogActions | Standardizing every Cancel/Save footer |

Do **not** create these during unrelated feature work.

---

## 7. Icons

- Library in use: **lucide-svelte** (shell, POS category icons, etc.).
- Prefer existing icon sizes used in shell (e.g. 16 nav, 18 header).

---

## 8. Maintenance

When adding a file under `src/lib/components/` or a global class in `app.css`, update this inventory in the same change.
