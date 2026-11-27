# Coffee Plus POS — UI/UX Quality Standard

**Source:** Inspected `src/app.css`, `src/lib/components/*`, `src/lib/components/shell.svelte`, routes.  
**Updated:** 2026-11-17  
**Companion inventory:** [`10-UI-COMPONENT-INVENTORY.md`](./10-UI-COMPONENT-INVENTORY.md)

---

## 1. Core principle

Coffee Plus POS is **one application**. New UI must reuse existing tokens, CSS component classes, and Svelte components.

**Reuse first → extend second → create new only when genuinely different.**

Do not introduce a second CSS framework or parallel button/dialog system without approval.

---

## 2. Design tokens (actual `@theme` in `src/app.css`)

### Colors

| Token | Hex | Role |
| --- | --- | --- |
| `brand-900` | `#075c35` | Sidebar |
| `brand-800` | `#08723b` | Primary hover |
| `brand-700` | `#07883f` | Primary actions, dialog header |
| `brand-500` | `#20b45a` | Accent |
| `brand-100` / `brand-50` | `#eaf6ee` / `#f3faf5` | Soft surfaces |
| `page` | `#f5f7f5` | App background |
| `ink` | `#252b27` | Body text |
| `muted` | `#68736c` | Secondary text |
| `line` | `#dce5de` | Borders |
| `success` | `#168447` | Positive |
| `warning` | `#b7791f` | Caution |
| `danger` | `#c43d3d` | Destructive |
| `info` | `#2674b8` | Info badges |

**Identity:** green-and-white Coffee Plus. Do not introduce orange/purple “KDS theme” palettes on kitchen or elsewhere.

### Typography

| Item | Actual |
| --- | --- |
| Font stack | `Arial, Helvetica, 'KhmerOS_battambang', sans-serif` |
| Khmer face file | `/fonts/KhmerOS_battambang.ttf` (`static/fonts/…`) |
| Page titles (de facto) | `text-2xl font-semibold` |
| Body (de facto) | `text-sm` dominant |
| Meta / table heads | `text-xs` / `text-xs uppercase text-muted` |
| Numeric | `.num` (tabular-nums) |

**Gap:** No named typography utility classes yet (`.ui-title-page`, etc.). Prefer consistent Tailwind usage above until tokens are added.

### Spacing & controls (de facto)

| Element | Actual |
| --- | --- |
| Admin page padding | `p-4 md:p-6` |
| POS / kitchen denser | `p-3` / `p-3 md:p-4` |
| Card padding | commonly `p-4` |
| Radius | `--radius: 0.5rem` → prefer `rounded` |
| Button | `.btn` min-height **44px**; `.btn-sm` **36px** |
| Field | `.field` min-height **44px** |
| Chip | **40px** / `.chip-sm` **34px** |

### Shell dimensions (`shell.svelte`)

| Element | Actual |
| --- | --- |
| Viewport | `h-dvh` overflow hidden |
| Sidebar | `w-64` drawer; `xl:w-72` |
| Header | `h-14` |
| Main | `min-h-0 flex-1 overflow-hidden` |

### Motion

CSS keyframes under `.ui-overlay`, `.ui-dialog`, `.ui-drawer*`, `.ui-toast`, etc.  
`src/lib/motion.ts`: `motionMs()` respects `prefers-reduced-motion`.

---

## 3. Mandatory CSS component classes

Defined in `src/app.css` — **do not reinvent:**

- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` / `.btn-sm`
- `.field`
- `.card`
- `.badge` + info/warn/ok/danger/neutral
- `.chip` / `.chip-sm` (`aria-pressed`)
- `.product-card*` (POS catalog)
- `.select-*` (SelectMenu)
- `.ui-check*` (UiCheckbox)
- `.nav-link`, `.num`

**Debt:** Many of these still hardcode hex instead of `var(--color-*)`. Prefer tokenizing in a future hygiene pass — not a redesign.

---

## 4. Component reuse rules

1. Search `src/lib/components` and this standard’s inventory before adding a component.
2. Prefer configuring `Dialog`, `SelectMenu`, `UiCheckbox` over new modals/selects/checkboxes.
3. Do not create `ProductButton` / `OrderButton` when `.btn` suffices.
4. Domain dialogs (checkout, customize, cart) may remain specialized; still compose shared Dialog/Select where possible.
5. Kitchen and POS may use special **layouts**, but must use the same **tokens and controls**.

---

## 5. Page layout consistency

### Standard admin pages

```
div (h-full overflow-auto p-4 md:p-6)
  h1.text-2xl.font-semibold + actions
  toolbar / filters
  .card / table / forms
```

Used by orders, products, customers, staff, settings, shifts, reports, sync (pattern).

### Approved layout exceptions

| Screen | Why |
| --- | --- |
| `/` POS | Split catalog + cart drawer |
| `/kitchen` | Full-height kanban + optional overview |

Do not redesign the shell when adding modules — add a nav link only.

---

## 6. Interaction consistency

| Concern | Standard |
| --- | --- |
| Cursor | Pointer on actionable; not-allowed when disabled (base CSS) |
| Focus | `.btn` / `.field` focus-visible brand outline |
| Confirm | `demo.ask` → Dialog in shell |
| Toast | `demo.flash` |
| Permissions | `demo.can(...)` before mutating |
| i18n | Paraglide `messages/en.json` + `kh.json` — no hard-coded customer English-only strings |

---

## 7. Responsive checks

When changing layout, verify:

- Sidebar drawer under `xl` does not permanently block content
- Header `h-14` actions wrap or hide gracefully (`min-[1400px]` patterns exist)
- Tables scroll inside `.card`
- Dialogs respect `max-h-[92vh]`
- Kitchen usable at `md` (2 columns) and `xl` (4 lanes)
- EN and KH labels still fit

No dark theme is implemented — do not require dark verification.

---

## 8. Development workflow

**Before:** inspect similar screens; check inventory; decide reuse/extend/new.  
**During:** tokens + shared classes/components; keep EN/KH in sync.  
**After:** visual compare with orders/products; `pnpm check`; smoke the touched flow.

---

## 9. Safe improvement backlog (documentation only — needs approval to code)

| Step | Work |
| --- | --- |
| B | Map hex in `app.css` to CSS variables; add disabled/line-hover tokens |
| C | `.ui-page` / `.ui-title-page` classes; migrate admin pages |
| D | Optional `PageHeader` component |
| E | Shared table head/cell classes or thin DataTable |
| F | Keep kitchen on brand tokens / shared chips/badges/buttons |

**Stop:** No refactoring until product owner approves a step.
