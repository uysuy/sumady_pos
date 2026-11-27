# Receipt & Printing (Coffee Plus POS)

## What ships in v1

- Configurable document types: café receipt, general POS receipt, commercial invoice, VAT tax invoice **layout**.
- Settings → **Receipt & Printing** live designer (preview + show/hide + language + paper).
- Shared renderer (`receipt-view.svelte`) driven by the **order receipt snapshot** frozen at pay time.
- Browser print only (`window.print()` + `@media print`).
- EN/KH bilingual lines (Khmer above English when both are shown).

## What is intentionally out of scope

- ESC/POS / Bluetooth / USB thermal drivers.
- Claiming GDT certification or official tax-invoice numbering.
- Fabricating VATTIN, buyer TIN, or exchange rates.
- Recalculating historical receipt totals from current settings.

## Browser print test

1. Complete a paid sale (or open an existing paid order).
2. Print from checkout success or **Orders → view receipt**.
3. In the print dialog, set paper to match Settings (80mm / 58mm / A4).
4. Confirm shop name, lines, USD + ៛ totals, FX rate, and tenders match the order screen.
5. Reprint from order detail — **REPRINT** banner should appear; amounts must not change.

## Hardware disclaimer

Browser print is **not** validated ESC/POS output. Margin, cut, and font behavior vary by OS printer driver. Do not claim thermal printer compatibility until a real 58/80mm device has been tested with this build.

## Designer notes

- Preview prefers a recent paid order; otherwise a labeled sample ticket is used.
- Service charge / guest count toggles are reserved; they print only when order data exists.
- VAT tax invoice selection shows compliance warnings and never invents registration data.
