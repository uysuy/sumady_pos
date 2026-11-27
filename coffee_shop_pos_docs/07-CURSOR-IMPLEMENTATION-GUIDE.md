# 07 — Cursor Implementation Guide

## 1. First instruction: inspect before coding

Paste this instruction into Cursor before implementation:

> Read all documents in `docs/coffee-pos/`, especially `08-SUMADY-ERP-INTEGRATION-ARCHITECTURE.md`, together with the product overview, design system, screen specifications, interaction logic, mock data structures and demo scenarios.
>
> Inspect the existing repository before changing anything. Identify the frontend framework, routing, state management, component library, styling system, asset handling, build commands and existing conventions.
>
> Do not rebuild or replace the current architecture. This phase is frontend-only and uses local mock data. Do not implement backend APIs, database schemas or migrations yet. Structure repositories/services behind adapters so a future Sumady API adapter and local offline outbox can be added without rewriting screens.
>
> First return:
> 1. A concise architecture assessment.
> 2. A proposed screen and route map.
> 3. A proposed component/state structure that fits the existing project.
> 4. Any conflicts between this specification and the current codebase.
> 5. An incremental implementation plan.
>
> Do not start coding until the plan is clear.

## 2. Recommended milestones

### Milestone 1 — Design foundation
- Green design tokens.
- Typography and spacing.
- Buttons, inputs, cards, badges, dialogs and tables.
- Sidebar and header.
- Responsive shell.
- Demo Mode indicator.

Acceptance:
- Navigation works.
- All screens share consistent visual language.
- No brown primary theme.
- No horizontal overflow at target desktop size.

### Milestone 2 — POS browsing and customization
- Category filters.
- Product search.
- Product grid.
- Product availability.
- Product customization modal.
- Modifier validation and dynamic price.

Acceptance:
- Products filter and search correctly.
- Modifiers apply only where relevant.
- Price updates accurately.
- Different customizations create distinct cart lines.

### Milestone 3 — Cart and order setup
- Cart lines.
- Quantity controls.
- Edit customization.
- Remove and clear.
- Discounts.
- Order type.
- Table selection.
- Hold/resume.

Acceptance:
- Totals always recalculate.
- Held orders preserve all selections.
- Empty cart cannot proceed to checkout.

### Milestone 4 — Checkout and receipt
- Payment method selection.
- Cash received and change.
- Simulated non-cash payment.
- Confirmation and duplicate-click protection.
- Paid order creation.
- Receipt preview and browser print.

Acceptance:
- Cancelled payment does not create a paid order.
- Successful payment creates exactly one order.
- Cart clears only after success.
- Receipt matches saved order data.

### Milestone 5 — Shared Orders and Kitchen
- Orders list and details.
- KDS columns and actions.
- Shared status updates.
- Order timeline.

Acceptance:
- One order appears consistently across POS result, Orders and KDS.
- Kitchen status is separate from payment status.

### Milestone 6 — Management screens
- Products and Menu.
- Categories and Modifiers.
- Customers.
- Staff and Roles.
- Cash and Shifts.
- Settings.

Acceptance:
- CRUD-style UI actions update mock state.
- Product availability and modifier changes affect future POS use.
- Historical order snapshots remain unchanged.

### Milestone 7 — Reports and dashboard
- Sales KPI cards.
- Charts and breakdowns.
- Filters.
- Consistent metric definitions.

Acceptance:
- Metrics derive from shared data.
- Filters work.
- Held and unpaid orders are not counted as paid sales.

### Milestone 8 — Demo hardening
- Seed data.
- Local persistence.
- Reset demo data.
- Empty/error/success states.
- Keyboard and responsive checks.
- End-to-end demo scenario testing.

Acceptance:
- Complete the primary demo without manual data edits or page refreshes.
- Reset returns the application to a known starting state.

## 3. Implementation rules

- Follow the existing project structure.
- Reuse existing components where appropriate.
- Do not introduce a new UI framework without a strong reason.
- Keep mock data separate from presentation components.
- Use one shared state source.
- Centralize totals and price calculations.
- Use stable IDs.
- Use integer minor units or a decimal-safe money utility.
- Avoid hardcoded dashboard totals.
- Do not duplicate order collections for separate screens.
- Add meaningful empty, validation and confirmation states.
- All buttons must work or be explicitly disabled with an explanation.
- Do not use screenshots as substitutes for working UI.
- Do not add backend placeholders that look operational.
- Do not claim real payment, printer, inventory or accounting integration.

## 4. Testing checklist

### POS
- Category filtering.
- Product search.
- Unavailable product.
- Modifier required validation.
- Modifier price changes.
- Add same product with same modifiers.
- Add same product with different modifiers.
- Quantity and remove.
- Clear confirmation.
- Discount and tax calculations.
- Dine-in table selection.
- Takeaway and delivery behavior.

### Orders and payments
- Cash exact payment.
- Cash with change.
- Cash insufficient amount.
- Simulated QR/card success.
- Simulated payment cancellation/failure.
- Double-click confirmation protection.
- Receipt data consistency.
- Hold/resume.
- Cancel held order.

### Kitchen
- New → Preparing → Ready → Completed.
- Status reflected in Orders.
- Payment state remains independent.

### Management
- Add/edit product.
- Change product availability.
- Add/edit category.
- Modifier changes affect future orders.
- Customer history updates.
- Shift cash calculation.
- Dashboard filters and metrics.

### Persistence
- Refresh preserves demo state.
- Reset restores seed state.
- Invalid stored data recovers safely.

### Responsive
- Desktop POS.
- Tablet POS.
- Management screen at narrower width.
- Modal fits viewport.
- No clipped checkout actions.

## 5. Final report from Cursor

At the end of each milestone, report:
- Files created/changed.
- Screens completed.
- Interactions completed.
- Tests run and results.
- Known limitations.
- Any deviation from the specification.

Do not mark a milestone complete if key acceptance criteria fail.
