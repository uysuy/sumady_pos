# 03 — Screen Specifications

## 1. Global application shell

### Sidebar
Show:
- Coffee Plus logo / shop identity.
- POS.
- Orders.
- Kitchen Display.
- Products & Menu.
- Categories & Modifiers.
- Customers.
- Sales & Reports.
- Cash & Shifts.
- Staff & Roles.
- Settings.
- Current staff identity and sign-out-style demo action (no real authentication).

The active menu must be visually highlighted.

### Header
Show where relevant:
- Current branch selector.
- Global or page-specific search.
- Current date and time (local display).
- Demo connection indicator such as “Demo Mode”.
- Current staff/cashier.
- Contextual page actions.

Do not show “Online” as though a real server is connected. Prefer a clear “Demo Mode” or “Local Demo” label.

---

## 2. POS

### 2.1 Main POS screen

**Purpose:** Primary cashier workspace.

**Layout:**
- Top: branch, search, cashier context and demo indicator.
- Category strip: All Items, Coffee, Tea, Non-Coffee, Cold Drinks, Bakery, Pastries, Food.
- Main area: responsive product card grid.
- Right side: current order / cart.
- Optional order type and table selection near cart header.

**Product card:**
- Product image.
- Product name.
- Price.
- Availability state.
- Optional quick-add behavior for products without required modifiers.

**Cart panel:**
- Order type selector.
- Table selector when Dine-in is selected.
- Cart lines with image, product name, selected options, quantity controls, line price and remove action.
- Subtotal.
- Discount.
- Tax.
- Total.
- Hold Order, Clear and Checkout actions.

**States:**
- Empty cart.
- Product selected.
- Cart with multiple items.
- Product unavailable.
- Held order restored.
- Checkout in progress.

### 2.2 Product search
- Search by product name.
- Search results update as the user types.
- Empty result message with clear-search action.
- Search should work with current category selection or clearly indicate when it searches all categories.

### 2.3 Product customization modal

Open when a product has required or optional modifiers.

**Suggested controls:**
- Product image, name and base price.
- Size: Small, Medium, Large.
- Temperature: Hot, Iced.
- Milk: Regular, Oat, Soy, Almond.
- Sugar: 100%, 70%, 50%, 0%.
- Ice: Extra, Regular, Less, No Ice (only for suitable cold drinks).
- Extras: extra shot, caramel syrup, vanilla syrup, whipped cream.
- Special instructions.
- Quantity.
- Dynamic total.
- Cancel and Add to Cart.

Only show modifiers applicable to that product. For example, do not show ice level for a hot-only product.

### 2.4 Order type selection
Support:
- Dine-in.
- Takeaway.
- Delivery (demonstration only).

For Dine-in, show a table selector. For Takeaway and Delivery, table selection is hidden.

### 2.5 Table selection
- Visual table list or floor-style grid.
- Table number/name.
- Available / Occupied / Reserved demo state.
- Selecting a table associates it with the current order.
- Do not imply real-time synchronization across terminals.

### 2.6 Hold orders
- Save current cart as a held order in local state.
- Ask for optional reference/customer/table.
- Clear active cart after successful hold.
- Show held orders in a selection panel.
- Resume restores exact items and customizations.
- Allow held order cancellation with confirmation.

### 2.7 Checkout and payment
Show:
- Order summary.
- Order type and table/reference.
- Subtotal, discount, tax and total.
- Payment method cards: Cash, Card, QR Payment, GrabPay.
- Amount received for cash.
- Change due.
- Confirm Payment.
- Cancel / Back to Order.

Payment is simulated. Clearly label the payment as a demo transaction.

### 2.8 Payment result
- Success state with order number and amount.
- View Receipt.
- Print Receipt.
- New Order.
- Failed/cancelled simulation state if included.

### 2.9 Receipt preview
Include:
- Shop logo/name and contact details from mock settings.
- Branch.
- Receipt/order number.
- Date and time.
- Cashier.
- Order type/table.
- Items and modifiers.
- Quantity and line amount.
- Subtotal, discount, tax and total.
- Payment method and amount received/change when applicable.
- Friendly footer.

Provide print-friendly CSS and use the browser print action. Do not claim to control a physical printer.

---

## 3. Orders

### 3.1 All Orders
- Search by order number or customer.
- Filters: date, status, order type, payment method.
- Columns: order number, date/time, customer, type, items, total, payment status, preparation status.
- Row action opens details.

### 3.2 Order details
- Full order summary.
- Product lines and modifiers.
- Payment details.
- Order status timeline.
- Customer and table details when applicable.
- Receipt preview / print.
- Cancel or refund controls only as simulated UI actions with confirmation and clear demo limitations.

### 3.3 Order status views
Provide filters or tabs for:
- Open.
- Completed.
- Cancelled.
- Held.

Do not duplicate separate data stores for each tab; filter the same order collection.

---

## 4. Kitchen Display (KDS)

### 4.1 Kitchen board
Use a high-visibility board with columns:
- New.
- Preparing.
- Ready.
- Completed (optional collapsed history).

Each order card shows:
- Order number.
- Time received / elapsed time.
- Order type.
- Table or pickup reference.
- Items and quantities.
- Modifiers and special instructions.
- Current status.
- Next available action.

### 4.2 Kitchen actions
- Start Preparing.
- Mark Ready.
- Mark Completed / Picked Up.
- Revert only where appropriate, with confirmation if needed.

Changes must update the shared frontend order state and be reflected in Orders.

### 4.3 Empty and attention states
- No new orders.
- No orders preparing.
- New order highlight.
- Long-wait indicator based on elapsed demo time if implemented.

Do not invent a real kitchen printer or multi-terminal synchronization.

---

## 5. Products & Menu

### 5.1 Product list
- Search.
- Category filter.
- Availability filter.
- Table/list view.
- Product image, name, SKU, category, price, availability.
- Add Product and Edit actions.

### 5.2 Add / Edit Product
Fields:
- Product name.
- SKU / short code.
- Category.
- Description.
- Image.
- Base price.
- Product type: Drink, Food, Bakery, Other.
- Available / Unavailable.
- Modifier groups.
- Tax category (mock configuration).

Validation:
- Name required.
- Price must be zero or greater; warn on zero.
- Category required.
- SKU uniqueness in mock data if SKU is supplied.

### 5.3 Product details
- Product summary.
- Pricing.
- Modifier groups.
- Availability.
- Mock sales summary.

---

## 6. Categories & Modifiers

### 6.1 Categories
- Category list.
- Add / edit / archive category.
- Name, description, display order and active status.
- Category product count.

### 6.2 Modifier groups
Examples:
- Size.
- Temperature.
- Milk.
- Sugar.
- Ice.
- Extras.

Fields:
- Group name.
- Selection type: single-select or multi-select.
- Required / optional.
- Minimum and maximum selections.
- Applicable products/categories.
- Display order.

### 6.3 Modifier options
Fields:
- Option name.
- Price adjustment.
- Active state.
- Default selection.
- Display order.

Enforce minimum/maximum selections in the UI. Do not allow contradictory options, such as selecting both Hot and Iced in a single-select group.

---

## 7. Customers

### 7.1 Customer list
- Search by name, phone or email.
- Customer name.
- Phone.
- Email (optional).
- Total orders.
- Last order.
- Add customer action.

### 7.2 Customer profile
- Contact information.
- Order history.
- Total spend in mock data.
- Notes.
- Edit action.

### 7.3 Customer selection
- Optional customer association during POS.
- Quick add customer.
- Guest customer remains supported.

Do not require customer details for every sale.

---

## 8. Sales & Reports

### 8.1 Sales dashboard
KPI cards:
- Today's sales.
- Total orders.
- Average order value.
- Best-selling product.

Charts / lists:
- Sales over time.
- Sales by category.
- Payment method breakdown.
- Top products.

All figures must derive from the shared mock order/payment data, not hardcoded independent totals.

### 8.2 Reports
- Daily sales.
- Sales by product.
- Sales by category.
- Sales by payment method.
- Discounts.
- Tax summary.
- Cashier sales.

Filters:
- Today.
- Yesterday.
- Last 7 days.
- Custom date range (if supported).

Include clear empty states.

---

## 9. Cash & Shifts

### 9.1 Shift overview
- Current shift status.
- Cashier.
- Start time.
- Opening cash.
- Cash sales.
- Non-cash sales.
- Cash in/out.
- Expected cash.

### 9.2 Open shift
- Opening cash amount.
- Optional note.
- Confirm opening.
- Prevent duplicate open shift for the same demo cashier.

### 9.3 Cash movement
- Cash In / Cash Out.
- Amount.
- Reason.
- Note.
- Confirmation.
- Add to shift movement history.

### 9.4 Close shift
Show:
- Opening cash.
- Cash sales.
- Cash in.
- Cash out.
- Expected cash.
- Counted cash input.
- Difference.
- Confirm close.

Clearly label values as demo calculations. Do not create accounting postings.

---

## 10. Staff & Roles

### 10.1 Staff list
- Name.
- Role.
- Status.
- Contact (mock).
- Assigned branch.
- Add / edit staff.

### 10.2 Staff profile
- Basic details.
- Role.
- Branch.
- Recent demo activity.

### 10.3 Roles & permissions
Show editable demo permissions for:
- POS access.
- Order management.
- Refund/void.
- Product management.
- Reports.
- Shift management.
- Settings.

This is a UI demonstration only. It is not a security boundary.

---

## 11. Settings

### 11.1 Shop profile
- Shop name.
- Logo.
- Address.
- Phone.
- Receipt footer.

### 11.2 Branch settings
- Branch name.
- Address.
- Contact.
- Active status.

### 11.3 General preferences
- Currency.
- Date/time display.
- Default order type.
- Default category.
- Theme preference if desired.

### 11.4 Tax settings
- Tax name.
- Rate.
- Inclusive / exclusive display setting.
- Active status.

Use configurable demo settings; do not assume a real legal tax treatment.

### 11.5 Payment methods
- Enable/disable demo payment options.
- Display labels.
- No gateway credentials or real integration.

### 11.6 Receipt settings
- Logo.
- Header/footer text.
- Show/hide optional fields.
- Preview receipt.

### 11.7 Printer settings
- Paper width preview (e.g. 58mm / 80mm).
- Browser print instructions.
- No physical printer connection.

### 11.8 Table management
- Table name/number.
- Capacity.
- Demo status.
- Active/inactive.

---

## 12. Global states and shared UI

Every screen should account for:
- Loading (only if simulated loading is useful).
- Empty.
- Populated.
- Search no results.
- Validation error.
- Confirmation.
- Success.
- Failure/cancelled simulation.

All screens must use the same shared mock application state so changes are reflected consistently.
