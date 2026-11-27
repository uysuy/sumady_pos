# Horpao POS — UI research (explore only)

**Date:** 2026-11-19  
**Status:** Research findings. **No Coffee Plus UI was changed.**  
**Sources:** [horpao.com](https://www.horpao.com), [Google Play — Hor Pao](https://play.google.com/store/apps/details?id=com.tipi.horpao), [App Store](https://apps.apple.com/kh/app/hor-pao/id1543007321), Techo Startup Center / LinkedIn, App Store release notes.

---

## 1. What Horpao is

| Item | Finding |
| --- | --- |
| Product | Cambodian cloud SaaS POS (“Hor Pao” / Horpao) for cafés, restaurants, retail, salon, SMEs |
| Developer | Tipi Hing (Phnom Penh); Techo DPA Cohort 5 startup |
| Clients | Android / iOS / iPad / Windows / Mac claimed |
| Related app | **Hor Pao Card** — loyalty / e-cash companion |
| Contact (public) | Telegram / phone listed on marketing; Play lists +855 788 20022 |

Website fetch returned little content (likely JS-heavy). UI evidence comes mainly from **store screenshots + release notes**.

---

## 2. Visual UI (from Play Store screenshots)

Observed (not a full product audit):

| Element | Horpao pattern |
| --- | --- |
| Brand colors | **Slate / navy blue** + white; **orange–gold** accent banners |
| Login | Diagonal split dark/light, Khmer copy, illustration |
| Sale screen | White canvas; hamburger header; optional promo / “POP UP” banner |
| Product grid | **3-column** mobile grid; **circular** product thumbs |
| Product cell | Image + **dual price lines** (`$` and `៛`) + bilingual label |
| Selection | Thin ring / highlight on selected item |
| Checkout | **Sticky dark bottom bar**: cart (Khmer), running total, Done / pay CTA |
| Density | Airy / high whitespace vs dense café tablet POS |

**Coffee Plus today:** green brand (`#07883F`), rectangular product cards, cart often side panel on desktop, dual currency more in totals/receipt than on every tile.

---

## 3. Feature surface (from marketing + App Store changelogs)

Useful as a **capability checklist**, not a clone list:

- Sales / mini-POS, variants & add-ons (sub-items), combos / packages  
- Seats / tables, table remarks, waiting / express numbers, seat QR PDF  
- Kitchen ticket printing + **kitchen layout** settings, sticker / label print  
- Dual currency, KHQR, ABA payment dialog, cash-in naming on reports  
- Split bill, pay later, quotations, delivery / pickup, online order accept  
- Digital menu, secondary customer screen templates  
- Membership / loyalty (separate Card app), promotions, staff commission  
- Reports: sale detail, summary v2, payment-channel filters, group-by category/add-on  
- Printer IP, receipt/invoice header customization  

Many of these are **beyond** Coffee Plus demo scope (loyalty ledger, real ABA/KHQR acquisition, online ordering).

---

## 4. Clone vs adapt — recommendation

### Do **not** clone Horpao UI 1:1

1. **Brand conflict** — Coffee Plus is green café POS; Horpao is blue/orange. Copying their chrome makes Coffee Plus look like a competitor knockoff.  
2. **Legal / IP risk** — Pixel-perfect clone of screens, icons, and layout chrome is a bad idea; learn patterns, don’t reproduce assets.  
3. **Form factor** — Horpao store shots are **phone-first**; Coffee Plus is already a **tablet/desktop** shell + KDS + Sumady-inspired admin.  
4. **Incomplete public UI** — We only saw a few store screenshots, not Settings, KDS, reports, or payment flows in detail.

### What **is** worth borrowing (patterns only, Coffee Plus skin)

| Pattern | Why it helps Cambodia café POS | Fit in Coffee Plus |
| --- | --- | --- |
| Dual USD + KHR on product / cart lines | Matches how shops quote prices | Enhance tiles or cart lines; rate already in settings |
| Sticky checkout summary + strong pay CTA | Faster on tablet/phone | Strengthen POS bottom/side cart CTA |
| Clear selected-item highlight | Faster tapping | Subtle brand-green ring on product cards |
| Seat / table remarks & express wait numbers | Restaurant / café floor | Optional later — tables exist, remarks don’t |
| Kitchen print layout controls | Real shops care about ticket font/layout | Settings stub later; don’t fake printers |
| Payment method highlight in reports | Cash vs KHQR clarity | Aligns with our payment reports roadmap |
| Bilingual labels on sale UI | Khmer-first staff | Already Paraglide; ensure tiles show both where useful |

### What **not** to chase for demo

- Horpao Card loyalty / e-cash  
- ABA/KHQR live acquisition  
- Grab/Wownow deep integration  
- Full digital menu guest channel  
- Copying their login illustration / icon set / blue theme  

---

## 5. Gap vs Coffee Plus (honest)

| Area | Horpao (public) | Coffee Plus now |
| --- | --- | --- |
| Visual ID | Blue / gold mobile | Green tablet shell |
| Product grid | Circular, dual price on cell | Rectangular cards, price mainly USD |
| Checkout chrome | Bottom bar dominant | Side cart + dialog |
| Kitchen | Print layout + stickers emphasized | On-screen KDS strong; print limited |
| Loyalty / delivery / online | Present in product story | Not in demo |
| Admin settings | Unknown UI depth from public shots | AdminSection + tables (our work) |

---

## 6. Suggested next steps (awaiting your choice)

**A. No UI change** — keep research only (this doc).  
**B. Pattern adaptation (recommended)** — keep Coffee Plus green; add dual-price on POS tiles / cart, stronger checkout CTA, clearer selection ring.  
**C. Feature parity spikes** — table remarks, express wait number, report payment highlight — still Coffee Plus look.  
**D. Full Horpao visual clone** — **not recommended**.

---

## 7. Adaptation applied (2026-11-19)

User choice: keep Coffee Plus / Sumady **green** brand; borrow Horpao **layout ideas** only.

| Horpao layout idea | Coffee Plus implementation |
| --- | --- |
| Circular product thumbs + dense grid | `.product-card` circular media; 3–6 column grid |
| Dual $ / ៛ on each tile | `formatUsd` + `formatKhr(toKhr(...))` on tiles |
| Selected item ring | `.product-card.is-in-cart` green ring when product is in cart |
| Sticky bottom checkout bar | `.pos-checkout-bar` (brand-900 + brand-500 CTA) on mobile |
| Strong pay CTA in cart | Cart footer uses same checkout strip |

**Not copied:** Horpao blue/gold theme, login art, icons, loyalty Card app, ABA chrome.

## 8. Earlier stop condition

Research-only phase had no code changes; layout adaptation landed after explicit approval.
