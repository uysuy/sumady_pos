# Coffee Plus POS — Settings Configuration UX Research & Proposal

**Status:** Research / design only — **no application code changed**  
**Date:** 2026-11-18  
**Stack inspected:** Svelte 5 + SvelteKit + Tailwind 4 + Paraglide EN/KH · `pos-web`

---

## Executive recommendation (read first)

1. **Do not install AG Grid, Tabulator, or SvGrid** for Settings. Row counts are tiny (payments ≈ 4, branches ≈ 3–10, tables ≈ 10–40). A spreadsheet-class grid fights Coffee Plus branding and adds weight without payoff.
2. **Do not install TanStack Table either** unless you later need shared sorting/pagination across many admin lists. For Settings, a **native Coffee Plus config table** (existing `.card` + table markup + `SelectMenu` + `UiCheckbox` + `Dialog`) is enough.
3. **Not every setting belongs in a grid.** Shop identity, receipt footer, FX rate, language toggle, and demo reset stay as **forms**.
4. **Highest UX win:** replace stacked mini-forms for **Branches**, **Tables**, and **Payment methods** with a **read-only table + Add / Edit dialog** (or light inline toggles for Active only).
5. **Modifiers** already use a list + wide Dialog with option rows. Improve that into a clearer **master/detail** pattern — still not a full grid library.
6. **Language:** keep UI language on the shell. Do not put it in a Settings grid.

Wireframe proposals (mockups only):

- Payments table: `assets/settings-payments-wireframe.jpg` (project assets)
- Branches table: `assets/settings-branches-wireframe.jpg`
- Modifier master/detail: `assets/settings-modifiers-wireframe.jpg`

---

## PART 1 — Repository inspection

### 1.1 Settings surface (actual)

Single route: `src/routes/settings/+page.svelte`  
Permission: `demo.can('settings')` → `locked` disables inputs; toast via `permission_denied` / `settings_saved`.  
Persistence: `demo.updateSettings` / `saveBranch` / `saveTable` → `demo.svelte.ts` → `localStorage` key `coffee-plus-pos.v1`.

| Tab | Fields / records | Current UX | Add / edit / delete |
| --- | --- | --- | --- |
| **Shop** | shopName EN/KH, tagline, address, phone, defaultOrderType | 2-col form in `.card` | Save only — no row model |
| **Branches** | name EN/KH, address EN/KH, phone, warehouseId, active | **One card form per branch** stacked vertically | Edit in place + per-card Save; **no Add / Delete UI** |
| **Tax** | Default tax name/rate/mode/active + FX rate + offline cash limit | Form; tax categories = **read-only list** | Categories not editable here (products pick from `taxCategories`) |
| **Payments** | Fixed `PaymentMethodSetting[]` (method, enabled, label) | **Checkbox list only** — cannot rename, reorder, or add methods | Enable toggles + Save; validation: ≥1 enabled |
| **Receipt** | footer EN/KH, paper 58/80 | Form | Save (reuses `saveShop`) |
| **Tables** | name, capacity, status, active (filtered by active branch) | **Card grid of mini-forms** (one Save per table) | Add table; no delete |
| **Demo** | reset local demo | Danger confirm dialog | Destructive reset |

Related config **outside** Settings (still “configuration” for the brief):

| Screen | What | Current UX |
| --- | --- | --- |
| `/categories` | Categories + modifier groups/options | List + **Dialog** editors; options = stacked bordered fields inside dialog |
| `/products` | Products, prices, branch overrides, tax category | Table list + Dialog editor |
| `/staff` | Staff + roles | List + Dialog |
| Shell header | **UI language** EN/KH | `appLocale` toggle — not a Settings record |

### 1.2 Where a table would help vs hurt

| Pattern observed | Verdict |
| --- | --- |
| Payment methods as independent checkboxes | Table (or toggle column) improves scanability; labels EN/KH currently not editable in UI |
| Branches as N separate forms | **Strong table candidate** — compare phones/warehouse/active side by side |
| Tables as N cards each with Save | **Strong table candidate** — dense list beats card farm |
| Shop / receipt / FX / tax default | **Keep form** — single-entity settings |
| Modifier options inside dialog as repeated field blocks | Improve to **nested option table inside Dialog** or master/detail — not a page-wide spreadsheet |
| Tax categories list (read-only) | Either leave, or table + dialog if product wants CRUD (new capability — call out below) |
| Language preference | **Not a grid** — already shell preference |

### 1.3 Validation & i18n (existing)

- FX: `invalid_rate` if ≤ 0  
- Payments: `at_least_one_tender`  
- Modifiers: `both_names`, `option_required`, `modifier_limits`  
- EN/KH messages present for settings labels; Khmer font via app CSS  

### 1.4 Important model limits (do not invent fields)

- `PaymentMethodSetting` = `{ method, enabled, label }` — no sortOrder, no integration keys, no “cash drawer” flag in settings (drawer logic is method === CASH in domain).
- No product **variant** entity — variants are **modifier combinations** on cart lines.
- Tax categories exist in state but Settings tax tab does not edit them.
- Branches/tables: no delete API in Settings UI today.

---

## PART 2 — Established POS back-office patterns

Sources: Square Help, Lightspeed K-Series Support, Toast Support (official docs). Patterns distilled — **not** visual copies.

| Product | Settings / config pattern | Useful for Coffee Plus |
| --- | --- | --- |
| **Square** | Payment types: enable/disable + **reorder** on a dedicated list; modifiers = **set editor** with rules + option list; menus separated from device settings | Toggle + order for tenders; keep modifiers as set editor, not freeform spreadsheet |
| **Lightspeed Restaurant** | Back Office sections (Business / Payment / Menu); payment methods = **list → detail form**; modifiers = create then attach to group with price; floor plan = visual editor for tables | List + detail for payments/branches; tables may stay list/table for SME (full floor canvas is optional later) |
| **Toast** | Hierarchical menu manager; modifier group settings panel + option list; payments = finance settings + “other payment options” **add form** with many flags; **Save then Publish** | Explicit save; optional later “publish to terminals”; master/detail for modifiers |

### Patterns that genuinely benefit Coffee Plus

1. **Repeatable records as a scannable list/table**, not one form card per row.  
2. **Row → Edit dialog** for bilingual names and multi-field records (matches existing Dialog).  
3. **Inline toggle only for Active / Enabled** (low risk).  
4. **Modifier group = parent; options = child list** (Toast/Lightspeed/Square all do this).  
5. **Separate UI language from catalog languages** (shell vs EN/KH name fields).  
6. **Do not force Publish** until multi-terminal sync is real — demo is localStorage.

### Patterns to avoid copying

- Full floor-plan canvas for tables (overkill for current model).  
- Enterprise payment flags (tax-exempt tender, tip-enabled, etc.) without product requirements.  
- Spreadsheet-style free cell editing for bilingual EN/KH (error-prone on tablets).

---

## PART 3 — Grid / table library evaluation

| Criterion | TanStack Table v9 | AG Grid Community | Tabulator | SvGrid |
| --- | --- | --- | --- | --- |
| Licence | MIT | MIT (Enterprise paid) | MIT | MIT core / Enterprise paid |
| Svelte 5 | Official adapter (runes) | No official; JS/wrapper | Wrapper `onMount` | Native Svelte 5 |
| SvelteKit | Yes | Awkward | Yes | Yes |
| Inline edit | You build | Yes | Yes | Yes |
| Bundle (approx gzip) | ~36 KB headless | ~346 KB | Moderate | ~100 KB + CSS |
| Theming to Coffee Plus | Full control (you own UI) | Grid skin fights brand | Own skin | Own skin but opinionated |
| Touch / tablet | Your UI | Desktop-biased | Mixed | Mixed |
| Khmer / a11y | Your markup | Partial | Partial | Partial |
| Commercial cost risk | None | Enterprise trap for advanced features | Low | Enterprise for Excel etc. |
| Fit for ~10–40 config rows | Overkill unless shared | Overkill | Overkill | Overkill |

### Preference order for Coffee Plus

1. **Native reusable Svelte table** using existing `.field`, `SelectMenu`, `UiCheckbox`, `Dialog`, `.btn`, `.card` — **recommended**.  
2. **TanStack Table** — only if multiple large admin lists need shared headless sorting/filter (products already custom). Optional later.  
3. **SvGrid / Tabulator** — not justified for Settings.  
4. **AG Grid** — reject for this app (weight, Svelte gap, Enterprise upsell).

---

## PART 4 — Recommended interface per section

| Section | Interface type | Notes |
| --- | --- | --- |
| Shop profile | **1. Simple form** | Keep |
| UI language (shell) | **1. Simple form** / toggle | Not Settings grid |
| Receipt + paper | **1. Simple form** | Keep |
| FX rate + offline cash limit | **3. Grouped form** (Money & tax card) | Keep with tax or split “Money” tab |
| Default tax | **3. Grouped form** | Keep |
| Tax categories | **2. Editable table** *or* leave read-only | Only if CRUD is in scope |
| Payment methods | **2. Editable table** (toggle Active; Edit labels in dialog) | Fixed method enum — Add optional later |
| Branches | **2. Editable table** + Edit dialog | Add branch if product wants it |
| Tables | **2. Editable table** + Add | Branch-scoped filter |
| Categories | **2. List/table** + Dialog (already close) | Light table polish |
| Modifier groups | **4. Master/detail** | Group list → detail with option table |
| Product “variants” | **4. Master/detail** via modifiers — **no new Variant entity** | Explain to client |
| Demo reset | **5. Advanced / dangerous** | Keep confirm Dialog |
| Printers / hardware | **Not in model** | Mark unavailable — do not invent |

---

## PART 5 — Proposed grid UX (native)

For Branches / Tables / Payments / (optional) Tax categories:

- Column headers EN/KH via Paraglide  
- **Add** primary button (where model allows)  
- **Active** = `UiCheckbox` or switch inline  
- Other fields: **Edit** opens existing `Dialog`  
- Delete: confirm Dialog only if domain supports deactivate/delete  
- Unsaved: prefer **row dialog Save/Cancel**; avoid dirty whole-page spreadsheet  
- Empty state: illustration text + Add  
- Sticky header on desktop; horizontal scroll only if needed  
- Mobile: **card list** falling back from table (same row actions)  
- Touch: 44px targets (already `.field` / `.btn` min heights)

Modifier options inside group editor: small nested table (name EN, name KH, price delta, active, default, remove) — same components.

---

## PART 6 — Visual design proposal

### Preserve

Coffee Plus green/white, KhmerOS Battambang, shell, `.btn` / `.field` / `.card` / chips, Dialog, SelectMenu, UiCheckbox.

### Navigation structure (proposal)

Keep chip tabs; optional rename/group:

1. Shop  
2. Branches  
3. Money (tax + FX + offline limit)  
4. Payments  
5. Receipt  
6. Tables  
7. Demo (manager only)

Language stays in header.

### Before → after (confusing bits)

| Before | After |
| --- | --- |
| Branch = stacked full forms | One table; Edit dialog for bilingual address |
| Tables = many cards each with Save | One table; Add row; Edit or inline capacity |
| Payments = checkboxes only | Table: method, labels, active; Edit label dialog |
| Modifier options = stacked blocks | Nested options table in dialog / detail pane |

### Desktop

Page header → chips → toolbar (Add, optional Search) → `card` wrapping `<table>` → footer actions if batch save needed (prefer per-dialog save).

### Mobile

Hide dense table; show compact list rows (title + active + Edit).

### Mockups (proposals only)

See generated wireframes in project assets (Payments, Branches, Modifiers). They illustrate layout intent only — **not applied to the app**.

---

## PART 7 — Final recommendation matrix

| Setting section | Current UX | Recommended UX | Reason |
| --- | --- | --- | --- |
| Shop | Form | **Form** | Single entity |
| UI language | Shell toggle | **Shell toggle** | Preference ≠ config list |
| Branches | Per-branch forms | **Table + Edit dialog** | Compare & scan; bilingual fields heavy for inline |
| Tax default + FX | Form | **Grouped form** | Few scalars |
| Tax categories | Read-only list | **Table + dialog** *if* CRUD approved; else leave | Avoid scope creep |
| Payments | Checkbox list | **Table** (Active inline; labels via Edit) | Clearer; still tiny N |
| Receipt | Form | **Form** | Footer + paper |
| Tables | Card mini-forms | **Table + Add** | Highest clutter today |
| Categories | List + Dialog | **List/table + Dialog** | Already good pattern |
| Modifier groups | List + Dialog + option blocks | **Master/detail + option mini-table** | Industry pattern; reduces confusion |
| Product variants | N/A entity | **Remain modifiers** | No silent new fields |
| Demo reset | Danger dialog | **Keep** | Correct for destructive |

### Library decision

| Choice | Verdict |
| --- | --- |
| Install AG Grid / Tabulator / SvGrid | **No** |
| Install TanStack Table now | **No** (revisit for large Products/Orders only) |
| Build native Coffee Plus config table | **Yes** |

### Complexity & risks

| Item | Level | Risk |
| --- | --- | --- |
| Payments / Tables / Branches table polish | Low–medium | Bindings to existing save APIs; don’t break active-branch rules |
| Modifier master/detail | Medium | Keep validation (`modifier_limits`, bilingual names) |
| Tax category CRUD | Medium | New edit paths; products depend on IDs |
| Adding payment methods beyond enum | High | Touches checkout, reports, shifts — **out of Settings-only UX** |
| Heavy grid library | High | Brand mismatch, bundle, Svelte 5 friction |

### Suggested implementation phases (after approval only)

1. **Tables + Branches → native tables** (biggest clarity win).  
2. **Payments → table with label edit dialog**.  
3. **Modifier dialog → nested options table / master-detail**.  
4. Optional tax category CRUD.  
5. Explicitly **skip** library install unless Products list outgrows custom table.

---

## Stop condition confirmation

- No Svelte / CSS / npm / Settings UI / state / translation changes were made for this task.  
- Deliverables: this document + wireframe images + interactive summary canvas.  
- **Awaiting explicit approval** before any implementation.
