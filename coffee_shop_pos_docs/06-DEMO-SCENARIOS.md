# 06 — Client Demo Scenarios

## 1. Demo setup

Before the client presentation:
- Open the application in desktop viewport.
- Confirm “Demo Mode” is visible.
- Reset to seed data if needed.
- Confirm the demo cashier is John Smith.
- Confirm the sample branch is Main Branch.
- Confirm currency is USD.
- Confirm sample tax is labeled as a configurable demo setting.
- Ensure sample orders populate dashboard and KDS.
- Keep the demo reset action accessible in Settings or a clearly marked demo menu.

Do not present simulated payment as a real bank, QR provider or wallet transaction.

## 2. Primary demonstration — take an order

**Goal:** Show the most important cashier journey.

1. Open POS.
2. Select Coffee.
3. Select Latte.
4. In customization, choose:
   - Large.
   - Iced.
   - Oat milk.
   - 50% sugar.
   - Extra shot.
5. Show the updated price.
6. Add to Cart.
7. Add Blueberry Muffin.
8. Increase muffin quantity to 2.
9. Show the cart recalculating.
10. Select Takeaway.
11. Proceed to Checkout.

Expected result:
- Cart lines show product and customization.
- Quantity and line totals are correct.
- Subtotal, discount, tax and total agree.
- Checkout summary matches cart.

## 3. Demonstration — payment

1. Choose Cash.
2. Enter an amount greater than the total.
3. Show calculated change.
4. Confirm Demo Payment.
5. Show payment success.
6. Open receipt preview.
7. Use Print to demonstrate browser print preview, if appropriate.
8. Start a New Order.

Expected result:
- One paid order is created.
- Cart clears.
- Receipt reflects the saved order snapshot.
- Sales dashboard and order history update.
- Kitchen order appears if the order contains prepared products.

Alternative:
- Choose QR Payment.
- Show the explicit “Simulated QR payment” confirmation.
- Do not show an actual QR payment as completed by a real provider.

## 4. Demonstration — kitchen workflow

1. Open Kitchen Display.
2. Find the new order.
3. Open order details.
4. Click Start Preparing.
5. Confirm it moves to Preparing.
6. Click Mark Ready.
7. Confirm it moves to Ready.
8. Click Completed / Picked Up.
9. Open Orders and verify the status timeline.

Expected result:
- KDS and Orders show the same order state.
- Payment status remains Paid.
- Kitchen status changes independently.

## 5. Demonstration — dine-in order

1. Return to POS.
2. Add Cappuccino and Cheesecake.
3. Select Dine-in.
4. Select an available table.
5. Checkout with simulated Card payment.
6. Verify table/order reference appears in receipt, Orders and KDS.

Expected result:
- Dine-in order is associated with selected table.
- Table selection is not required for takeaway.
- No real card processing occurs.

## 6. Demonstration — hold and resume

1. Add two products.
2. Add custom modifiers to a drink.
3. Click Hold Order.
4. Enter reference such as “Guest returning”.
5. Confirm hold.
6. Verify active cart clears.
7. Open Held Orders.
8. Resume the held order.

Expected result:
- Held order is preserved exactly.
- Modifiers and quantities are restored.
- Held order is not counted as paid revenue or sales.

## 7. Demonstration — manager dashboard

1. Open Sales & Reports.
2. Show today's sales, order count and average order value.
3. Filter by a date range.
4. Show sales by category and payment method.
5. Return to POS and complete another demo order.
6. Return to dashboard and verify metrics update.

Expected result:
- Metrics derive from the same shared order/payment state.
- Unpaid, held and cancelled orders are excluded according to metric definitions.
- The report's date filter changes all relevant figures consistently.

## 8. Demonstration — cashier shift

1. Open Cash & Shifts.
2. Open a shift with sample opening cash.
3. Record a Cash In movement.
4. Record a Cash Out movement.
5. Complete a cash sale.
6. Return to shift overview.
7. Verify expected cash.
8. Close shift with a counted amount.
9. Show difference.

Expected result:
`Expected cash = opening cash + cash sales + cash in − cash out`

Non-cash sales must not increase expected cash in drawer.

## 9. Short client presentation sequence

For a 5–7 minute presentation:
1. Main POS and menu browsing.
2. Drink customization.
3. Cart and checkout.
4. Payment simulation and receipt.
5. Kitchen Display.
6. Sales dashboard.
7. Briefly show product/menu management.

For a longer presentation, add held orders, customer profiles, shift management and settings.

## 10. Recovery and reset

Provide a Reset Demo Data action:
- Require confirmation.
- Restore initial products, customers, orders, settings and sample shifts.
- Clear active cart and held orders.
- Restore the initial active branch and staff.
- Show a success message.

If local persistence is enabled, reset must overwrite persisted demo state as well as in-memory state.

## 11. Demo honesty

Use labels such as:
- Demo Mode.
- Simulated Payment.
- Local Demo Data.
- Browser Print Preview.

Never claim:
- A real payment was processed.
- A real printer received the receipt.
- Inventory was deducted in a backend.
- Accounting entries were posted.
- Data synchronized with another terminal or server.

## 12. Demonstration — hybrid sync simulation

1. Complete a demo cash sale.
2. Show it as Paid (Demo) and Sync Pending.
3. Open Sync Status and inspect the queued transaction.
4. Simulate connectivity returning and select Retry / Sync Now.
5. Show Synced (Demo) with a sample ERP reference.
6. Retry the same event and demonstrate that the mock adapter does not create a second transaction.

Expected: payment, order and sync states remain separate; the same POS transaction ID is reused; the prototype never claims a real Sumady posting.

## 13. Demonstration — offline limitations

1. Switch to Demo Offline mode.
2. Add items and hold an order.
3. Complete an explicitly labeled simulated cash sale if supported.
4. Show it as locally saved / sync pending.
5. Attempt simulated QR/card payment and show that it cannot be confirmed offline.
6. Restore Demo Online mode and synchronize the queued cash sale.

Expected: the UI explains which actions are local and which require connectivity. A queued sale is not described as posted to Sumady.
