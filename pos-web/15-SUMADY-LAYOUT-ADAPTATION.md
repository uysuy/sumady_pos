# Sumady Book → Coffee Plus layout adaptation

**Source explored:** `C:\Suy\Coding\SuMady-Book\erp-web` (PageContainer, TabPageContainer, Table, FieldSet, pos-preference)  
**Rule:** Borrow **concepts**, keep **Coffee Plus** look (green/white, `.btn` / `.field` / `.card` / Dialog). Do not copy ERP chrome.

## Borrowed

| Sumady concept | Coffee Plus implementation |
| --- | --- |
| Page header + primary actions | `AdminSection` title bar with Save / Add on the right |
| List toolbar (filters left, actions right) | Section hint + action cluster |
| Config data table | `.config-table` (brand-50 header, brand-100 selected row) |
| Empty guidance | `.config-empty` |
| List → dialog edit | Existing `Dialog` for branch / table / pay / tax / category |
| Master/detail | Categories modifiers: list select + detail panel |
| Page-level Save for prefs | Shop / tax / receipt Save in section header |

## Explicitly not copied

- Gray ERP canvas / slate uppercase grid headers / sky selection  
- Full ERP sidebar tree / WindowDialog maximize chrome  
- SweetAlert2 / purple FieldSet icon wells  
- Battambang+Segoe ERP stack (POS keeps its own fonts)  
- AG Grid / Sumady Table component port  

## Files

- `src/lib/components/admin-section.svelte`
- `src/app.css` — `.config-table`, `.config-empty`
- Settings + Categories routes use the pattern
