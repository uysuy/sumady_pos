# 04 — Interaction Logic

## 1. Core principle: one shared frontend state

All modules must use the same frontend data source/state layer.

Do not build isolated mock data inside individual screens. A paid order created in POS must appear in Orders, Kitchen Display and Sales & Reports without manually editing those screens.

Suggested separation:
- `mock-data/` — seed records.
- `domain/` or `types/` — TypeScript types/interfaces.
- `services/` or `repositories/` — frontend-only operations over local state.
- `stores/` or existing project state mechanism — shared application state.
- `components/` — reusable UI.
- `routes/` or existing routing structure — pages.

Follow the existing repository's conventions rather than forcing these exact folder names.

## 2. Product selection

1. User selects a category.
2. Product grid filters to active products in that category.
3. Search filters products by name/SKU.
4. Selecting a product checks its modifier requirements.
5. If required modifiers exist, open customization.
6. If no customization is required, add a default-configured line or add directly according to product settings.

A product marked unavailable cannot be added. Show a clear message.

## 3. Customization logic

Each modifier group defines:
- Selection mode: single or multiple.
- Required flag.
- Minimum selections.
- Maximum selections.
- Available options.
- Default option where configured.

Validation:
- Required groups must satisfy minimum selection.
- Single-select groups cannot have multiple selected values.
- Multi-select groups cannot exceed maximum.
- Inactive options cannot be selected.
- Modifiers must apply to the selected product.

Price calculation:

`lineUnitPrice = product.basePrice + sum(selectedModifier.priceDelta)`

`lineTotal = lineUnitPrice * quantity`

Use decimal-safe currency arithmetic. In JavaScript/TypeScript, prefer integer minor units (e.g. cents) or a well-defined decimal utility instead of repeated floating-point arithmetic.

Customization identity:
- Same product + same modifier choices may increment an existing cart line if that is the chosen UX.
- Same product + different modifier choices must remain separate cart lines.
- Preserve special instructions per cart line.

## 4. Cart behavior

Supported actions:
- Add item.
- Increase quantity.
- Decrease quantity.
- Remove line.
- Edit customization.
- Clear cart.
- Apply/remove discount.
- Change order type.
- Select table.
- Hold order.
- Resume held order.

Rules:
- Quantity cannot fall below 1; decrementing from 1 may ask to remove or remove according to consistent UX.
- Removing a line recalculates all totals.
- Editing a line updates its modifiers and price.
- Clearing cart requires confirmation if it contains items.
- A cart with no items cannot proceed to checkout.
- Hold order preserves all line data, order type, table, customer and discount.
- Resuming a held order restores the exact state.
- Holding clears the active cart only after the held record is saved successfully.

## 5. Order type behavior

Order types:
- Dine-in.
- Takeaway.
- Delivery (demo).

Dine-in:
- Table selection is required before payment, unless explicitly configured otherwise.
- Show table reference on cart, checkout, receipt, Orders and KDS.

Takeaway:
- Hide table selection.
- Optional customer/name or pickup note.

Delivery:
- Display a demo delivery information section (recipient/name, phone, address/note) if included.
- Do not integrate a delivery provider.
- Mark delivery as simulated.

Changing order type must not silently discard cart items. If changing away from Dine-in, clear table association only after appropriate user confirmation or according to a clear rule.

## 6. Totals and discounts

Define one central calculation function and use it everywhere.

Suggested calculation order:
1. Sum line totals.
2. Apply eligible order-level discount.
3. Calculate tax according to configured tax mode.
4. Calculate grand total.

Example:
- Item subtotal: $10.00
- Discount: $0.50
- Taxable amount: $9.50
- Tax rate: 10% (sample demo setting)
- Tax: $0.95
- Total: $10.45

This example assumes tax is calculated after discount and is exclusive of tax. The prototype must make tax behavior configurable and display the chosen method clearly.

Rules:
- Do not calculate tax twice.
- Discount cannot exceed the eligible amount.
- Percentage discount and fixed discount must be supported if both are exposed.
- Round according to the selected currency precision.
- Display the same totals in cart, checkout, receipt and order details.
- Keep a breakdown of subtotal, discount, tax and total.

## 7. Checkout and payment simulation

Payment methods:
- Cash.
- Card.
- QR Payment.
- GrabPay.

All are simulations. No external requests or real financial actions.

Cash:
- Enter amount received.
- Amount received must be at least the total before confirmation.
- Change = amount received − total.
- Display change clearly.

Card / QR / GrabPay:
- Show a confirmation step.
- Simulate a successful payment after user confirmation.
- Optionally provide a clearly labeled “Simulate failure” path for demo testing.
- Never show a false bank/provider approval message. Use “Demo payment successful”.

On successful payment:
1. Create a unique demo order ID/number.
2. Set payment status to Paid.
3. Store payment method and amounts.
4. Set order status to Confirmed / Paid.
5. Set kitchen status to New for items requiring preparation.
6. Add the order to shared state.
7. Clear the active cart.
8. Update sales metrics derived from orders.
9. Show payment result and receipt actions.

Prevent duplicate confirmation if the user clicks twice. Use a processing state and disable the confirm action until completion.

On cancellation/failure:
- Do not create a paid order.
- Preserve the cart.
- Allow retry or return to order.

## 8. Receipt behavior

- Receipt is derived from the completed order snapshot.
- It must not change if product prices or modifier labels are edited later.
- Include item modifier details.
- Use the order's saved currency and totals.
- Print action opens browser print flow.
- Do not claim a real printer has received the job.

## 9. Kitchen status state machine

Suggested order-level kitchen status:
- `NEW`
- `PREPARING`
- `READY`
- `COMPLETED`

Allowed transitions:
- NEW → PREPARING
- PREPARING → READY
- READY → COMPLETED

Optional controlled reverse transition for manager demo:
- PREPARING → NEW
- READY → PREPARING

Do not allow arbitrary jumps without a clear action.

When kitchen status changes:
- Update the shared order record.
- Update KDS column.
- Update Orders status/timeline.
- Keep payment status separate from kitchen status.

An order can be Paid but still New in the kitchen. Do not confuse financial state and preparation state.

## 10. Hold orders

Held orders are not paid sales.

- Save a snapshot of cart lines and selections.
- Assign held ID and held timestamp.
- Store customer/order type/table/note as applicable.
- Exclude held orders from sales, paid-order counts and revenue.
- Resume restores cart.
- Cancel held order removes it from active held list after confirmation.

## 11. Refund / void simulation

If included:
- Require confirmation.
- Require a reason.
- Show clear “Demo only” messaging.
- Record a refund/void event in local state.
- Do not silently delete the original order.
- Exclude refunded amounts from net sales only if the report specification explicitly implements that rule.
- Keep original transaction visible for audit-style demonstration.

## 12. Shift calculations

Opening shift:
- Store cashier, start time and opening cash.

Cash movements:
- Cash In increases expected drawer cash.
- Cash Out decreases expected drawer cash.
- Each movement requires amount and reason.

Suggested expected cash:

`expectedCash = openingCash + cashSales + cashIn - cashOut`

Non-cash payments do not increase expected drawer cash.

Closing:
- Cashier enters counted cash.
- Difference = countedCash − expectedCash.
- Store closing summary.
- Mark shift closed.
- Prevent further sales from being assigned to the closed shift unless a new shift is opened.

If the prototype allows sales without an open shift, show a clear warning or define a demo default shift. Be consistent.

## 13. Dashboard and report calculations

Use paid orders only for sales metrics unless a report explicitly states otherwise.

Suggested metrics:
- Gross sales = sum of paid order subtotals before discount/tax, according to the chosen definition.
- Discounts = sum of applied discounts.
- Tax = sum of saved tax amounts.
- Net collected = sum of paid totals minus recorded refunds, if refunds are implemented.
- Order count = count of qualifying paid orders.
- Average order value = net collected / qualifying order count.
- Best seller = highest quantity sold in selected period.

Document metric definitions in the UI (tooltip/help text) where ambiguity exists.

Use a consistent date filter and branch filter where those concepts are shown.

## 14. Customer behavior

- Customer is optional.
- Guest orders are allowed.
- Selecting a customer associates them with the order.
- Quick-add customer validates name and optional phone/email format.
- Customer order history derives from shared orders.
- Customer totals derive from qualifying orders.

## 15. Product and modifier administration

- Add/edit product updates the shared product collection.
- Category changes update product filters.
- Availability changes affect POS product selection immediately.
- Modifier group edits affect future cart lines.
- Existing completed orders retain their saved product/modifier snapshots.

## 16. Local persistence

Use localStorage or the project's existing client persistence approach if appropriate.

Requirements:
- Persist demo state across refresh.
- Include schema/version key for safe reset/migration of mock state.
- Handle malformed stored state by restoring seed data with a visible, non-blocking notice.
- Provide a Reset Demo Data action with confirmation.
- Never store secrets or real payment credentials.

## 17. Global acceptance rules

- No dead buttons.
- No fake independent screen data.
- No contradictory totals.
- No duplicate order creation on repeated clicks.
- No paid order created for a cancelled payment.
- Held orders excluded from sales.
- Payment status and kitchen status remain separate.
- All actions show appropriate feedback.
- All destructive actions require confirmation.

## Hybrid deployment behavior (future production requirement)

### Connection states
Show a persistent, unobtrusive indicator: **Online**, **Offline**, **Sync pending**, or **Sync issue**. Internet connectivity and successful ERP synchronization are different things; the POS may be online while Sumady is unavailable.

### Offline order rules
- Carts can be edited locally; held orders are operational data, not accounting transactions.
- A completed cash sale may be saved locally and queued only if the business explicitly enables offline cash sales and defines limits.
- Never mark card/QR payment PAID offline unless the payment provider independently confirms authorization through a supported offline process.
- Offline limits (amount, duration, methods and cashier permissions) require business approval.
- If local storage is unavailable/full, block finalization with a clear message rather than claiming the sale was saved.

### Synchronization rules
1. Persist the finalized sale and its outbox event together.
2. Upload using the stable `posTransactionId` as the idempotency key.
3. Sumady validates branch, warehouse, item IDs, tax, payment mapping, permissions and accounting rules.
4. Sumady creates the official sales transaction using its existing transaction/posting engine.
5. Mark SYNCED only after confirmed success and store the returned ERP transaction ID.
6. On timeout, retry with the same idempotency key; never create a new sale ID.
7. Keep validation failures visible for authorized correction; never silently discard them.

### Cancellation, void and refund
Do not delete finalized sales. After ERP posting, use Sumady's supported void/reversal/refund workflow and retain the original sale reference. A refund is a new linked event, not an edit to the original receipt.

### Keep statuses independent
Order status, payment status, kitchen status and ERP sync status are separate. Kitchen preparation does not prove payment or accounting posting. Browser storage on one terminal is not shared with another terminal; multi-terminal offline continuity requires a local branch service.
