# 01 — Product Overview

## 1. Product vision

Build **Coffee Plus POS**, a modern point-of-sale experience for independent coffee shops, cafés and small café chains.

The prototype must look credible in a client presentation and support a connected demonstration from product selection through payment, receipt, kitchen preparation and sales reporting.

The first release is a **frontend-only demonstration product**. It uses local mock data and browser-side state. It does not connect to accounting software, inventory services, payment gateways or a server. Its structure must anticipate a **hybrid, offline-first deployment**: normal online operation with safe local order capture during internet outages, followed by synchronization with Sumady ERP.

## 2. Product goals

- Make cashier ordering fast and intuitive.
- Support common café products: espresso drinks, iced drinks, tea, non-coffee drinks, bakery and food.
- Allow detailed drink customization.
- Support dine-in, takeaway and delivery as order types.
- Provide a clear checkout and simulated payment flow.
- Show orders on a kitchen/barista display.
- Give managers a simple view of sales, products, customers, staff and shifts.
- Keep frontend models organized so future API integration can be introduced without redesigning every screen.
- Continue permitted cashier work during an internet outage.
- Synchronize finalized POS sales safely, without losing or duplicating transactions.
- Keep Sumady ERP authoritative for accounting and shared business master data.

## 3. Primary users

### Cashier
Creates orders, customizes products, applies permitted discounts, takes payment and prints or previews receipts.

### Barista / kitchen staff
Views incoming orders and updates preparation status.

### Shop manager
Reviews sales, manages products and menu options, oversees shifts and configures shop preferences.

### Administrator
Manages staff roles, branch details and application settings in the prototype.

## 4. Main navigation

1. POS
2. Orders
3. Kitchen Display
4. Products & Menu
5. Categories & Modifiers
6. Customers
7. Sales & Reports
8. Cash & Shifts
9. Staff & Roles
10. Settings

Navigation should be consistent across management screens. POS may use a focused workspace while retaining access to the main navigation.

## 5. Core café workflows

### Workflow A — Create and pay for an order
1. Cashier opens POS.
2. Selects a category or searches for a product.
3. Selects a product.
4. Customizes the drink if applicable.
5. Adds it to the cart.
6. Selects dine-in, takeaway or delivery.
7. Reviews subtotal, discount, tax and total.
8. Proceeds to checkout.
9. Selects a simulated payment method.
10. Confirms payment.
11. Sees payment success and receipt preview.
12. The order appears in Orders, Kitchen Display and Sales & Reports as appropriate.

### Workflow B — Prepare an order
1. A newly paid order appears in Kitchen Display.
2. Barista moves it from New to Preparing.
3. Barista moves it to Ready.
4. Staff can mark it Completed / Picked Up.
5. Order status is reflected in the Orders screen.

### Workflow C — Manage a shift
1. Cashier opens a shift with opening cash.
2. Cashier processes cash and non-cash sales.
3. Cash in / cash out entries may be recorded as mock drawer movements.
4. Cashier closes the shift.
5. The prototype calculates expected cash and records the closing summary.

## 6. Scope — included

- All ten navigation areas and their key screens.
- Responsive desktop and tablet layouts.
- Product browsing and search.
- Product modifiers and dynamic pricing.
- Cart and order management.
- Hold and resume orders.
- Dine-in / takeaway / delivery order types.
- Table selection for dine-in.
- Simulated cash, card, QR and GrabPay payment choices.
- Receipt preview and browser print action.
- Kitchen Display workflow.
- Product and modifier management UI.
- Customer records and order history.
- Sales dashboard and basic reports.
- Cash shift UI and mock drawer movements.
- Staff and role management UI.
- Shop and branch settings UI.
- Local persistence where suitable.
- Seed data and a reset-demo-data action.

## 7. System ownership and boundaries

### Sumady ERP owns (source of truth)
- Business/company, branch and warehouse identity.
- Core item/product identity, SKU and units of measure.
- Customer and vendor master records.
- Chart of accounts, tax configuration and financial posting rules.
- Payment accounts and payment-method-to-account mapping.
- User identity, roles and permissions where centrally managed.
- Inventory valuation, official sales transactions, journals and general ledger.

### Coffee Shop POS owns
- Café menu presentation, categories, product photos and display order.
- POS menu configuration linked to Sumady item IDs.
- Modifier groups/options such as size, milk, sugar, ice and extras.
- Tables, dine-in/takeaway/delivery workflow and order notes.
- Kitchen/barista tickets and preparation status.
- Cashier shift workflow, drawer movements and receipt presentation.
- Local offline queue and synchronization status for POS-originated operations.

A POS menu item is not a duplicate ERP inventory item. It references the relevant Sumady item using a stable ERP ID. Recipe/ingredient consumption should be designed later against Sumady's inventory model.

## 8. Prototype scope for hybrid readiness

The prototype remains frontend-only and uses mock data. It may demonstrate simulated Online/Offline status, a pending-sync queue, retry behavior and separate order/payment/sync statuses. These are simulations only; they are not real offline multi-terminal synchronization or ERP integration.

## 9. Scope — explicitly excluded

Do not implement any of the following in this phase:

- Backend services or API endpoints.
- Database schemas, migrations or server-side persistence.
- Real payment gateway or bank/QR integration.
- Real printer driver integration.
- Real inventory deduction or stock valuation.
- Accounting journals, general ledger, AR/AP or tax filing.
- Real authentication, authorization or multi-tenant security.
- Real SMS, email, delivery provider or loyalty integrations.
- Production security or compliance claims.

Represent future capabilities as clearly labeled UI placeholders only when they help explain the product direction. Do not pretend that a simulated feature is connected to a real service.

## 10. Future integration principles

Keep the UI and frontend state structured around these concepts:

- Business / branch
- Product and category
- Modifier group and modifier option
- Customer
- Order and order line
- Payment
- Staff member
- Shift
- Tax configuration

Use stable mock IDs and explicit relationships. Avoid embedding all data directly in visual components.

Future integration should replace mock repositories/services with API-backed implementations while preserving the main UI contracts. Use a `MockERPAdapter` now and a `SumadyERPAdapter` later, with a local persistence/outbox layer and synchronization coordinator. Screens must not call ERP endpoints directly. The POS must not create GL journals.

## 11. Non-functional expectations

- Fast, predictable cashier workflow.
- No dead buttons.
- Clear loading, empty, error and success states where relevant.
- Keyboard and touch-friendly controls.
- Consistent visual hierarchy.
- Accessible contrast and readable text.
- Accurate arithmetic with currency-safe rounding.
- No contradictory data between screens.
- Clear distinction between simulated and real operations.
- Offline and synchronization states are explicit; a queued sale is never displayed as posted to ERP.
- Retried synchronization cannot create duplicate ERP sales transactions.

## 12. Definition of done

A client can use the prototype without developer assistance to:
- Browse the menu and customize drinks.
- Add and edit cart items.
- Hold and resume an order.
- Complete a simulated payment.
- View and print a receipt.
- See the order in order history and kitchen display.
- Move the kitchen order through preparation states.
- See dashboard metrics update.
- Open and close a sample cashier shift.
- Navigate the management screens without encountering unfinished placeholder pages.
