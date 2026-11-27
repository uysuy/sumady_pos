# Client demo — pass/fail checklist

**Goal:** Prove a commercial café POS story. Do not claim live Sumady ERP or real KHQR settlement.

**Prep:** Use manager or cashier role · open café branch · do not reset localStorage mid-demo.

---

## P0 — must pass

| # | Step | Pass if | ☐ |
| --- | --- | --- | --- |
| 1 | Open shift with opening cash | Shift shows open; expected cash includes float | ☐ |
| 2 | Sell latte + modifiers + one food item | Cart totals look correct in USD + KHR | ☐ |
| 3 | Pay split (cash + QR/card) | Order PAID; change on cash only; QR not in drawer cash | ☐ |
| 4 | Kitchen: ticket appears, bump to ready | No lag; status moves; optional sound works | ☐ |
| 5 | View / print receipt | EN or KH receipt readable | ☐ |
| 6 | Partial refund on that order | Refundable reduced; payment status partial | ☐ |
| 7 | Close shift with counted cash | Expected vs counted + difference shown | ☐ |
| 8 | Reports → Summary / Sales detail for today | Figures match the sales just made | ☐ |
| 9 | Switch branch (skybar or restaurant) | Different menu; can sell one item | ☐ |
| 10 | Demo sync screen | Clearly mock / demo — no “live ERP” claim | ☐ |

**Demo fails if:** pay blocked with no clear reason · kitchen blank/stuck · refund breaks totals · reports empty after sales · presenter claims real bank/ERP posting.

---

## P1 — polish (nice if time)

| # | Check | ☐ |
| --- | --- | --- |
| 11 | POS search: text sits close to magnifying icon | ☐ |
| 12 | Reports CSV export downloads filtered rows | ☐ |
| 13 | Reports by product / hour / cashier tabs open | ☐ |
| 14 | Hold order → resume → pay | ☐ |
| 15 | Cancel paid sale (manager) | ☐ |
| 16 | Customer add with phone | ☐ |

---

## Script (≈8–10 minutes)

1. Open shift → sell modified drink + food → split pay → kitchen bump → receipt  
2. Partial refund → close shift  
3. Reports today → point at collected / detail row  
4. Switch branch → one quick sale  
5. Sync: “demo outbox only; Sumady adapter next phase”

---

## Do not say

- Real KHQR settlement / bank reconciliation  
- Live Sumady accounting or inventory valuation  
- Profit / COGS from this POS  
