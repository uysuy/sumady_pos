# 08 — Sumady ERP Integration Architecture

## 1. Executive recommendation

Use a **hybrid, offline-first POS connected to Sumady ERP**. Coffee Shop POS is the café operations application. Sumady ERP remains the authoritative system for shared business master data, inventory rules, official sales transactions, tax treatment, accounting postings and the general ledger.

The POS may capture permitted operations locally during an internet outage, queue them safely, and synchronize them when connectivity returns. **Do not build a second accounting system or duplicate the ERP's core master-data modules inside POS.**

## 2. Recommended deployment shape

```text
                 ONLINE / CLOUD
┌─────────────────────┐       API       ┌────────────────────────┐
│ Coffee Shop POS     │ ──────────────> │ Sumady ERP             │
│ Cashier / Manager   │                 │ Master data            │
└──────────┬──────────┘                 │ Sales transaction      │
           │ local persistence/outbox  │ Tax / posting engine   │
           ▼                            │ Inventory / GL         │
┌─────────────────────┐                 └────────────────────────┘
│ POS local store     │
│ Orders / sync queue │
└─────────────────────┘

Optional later for multiple terminals during an internet outage:
Cashier POS ──LAN──> Branch Edge Service <──LAN── KDS / other terminals
                              │
                         Internet returns
                              ▼
                          Sumady ERP
```

### Rollout recommendation

**Phase 1 — prototype:** frontend-only, mock data, mock ERP adapter, simulated offline indicator and sync queue. No real API or accounting integration.

**Phase 2 — first connected deployment:** POS frontend calls a POS application API/integration service. That service communicates with Sumady through existing APIs or internal services. Use durable per-terminal local queue where supported. Start with one terminal per shop or require connectivity for shared multi-terminal workflows.

**Phase 3 — branch-level offline operation:** if multiple cashiers and KDS terminals must work together during an internet outage, deploy a small branch edge service on the shop LAN. Terminals communicate with the edge service; it persists branch orders and synchronizes to Sumady later. Add monitoring, backup, health checks and controlled updates.

This staged path avoids operating a branch server before the business needs one.

## 3. System responsibility boundaries

| Capability | Owner | Notes |
|---|---|---|
| Business, branch, warehouse | Sumady ERP | POS references ERP IDs |
| Core item/SKU and UOM | Sumady ERP | No duplicate inventory item master |
| Customer/vendor master | Sumady ERP | POS may cache permitted lookup data |
| Chart of accounts and tax rules | Sumady ERP | Never maintained independently in POS |
| Payment accounts/mapping | Sumady ERP | POS tender maps to ERP account |
| Menu layout, photos, display categories | POS | Café presentation layer |
| Modifiers and options | POS | Size, milk, sugar, ice, extras |
| Tables and order types | POS | Dine-in, takeaway, delivery |
| Kitchen/barista workflow | POS | Operational status only |
| Cashier shifts and drawer | POS | Operational cash control |
| Official sales transaction | Sumady ERP | Created after validated submission |
| Journals and general ledger | Sumady ERP | Existing posting engine only |
| Inventory valuation | Sumady ERP | Recipe integration is a later milestone |
| Offline queue | POS integration layer | Durable, retryable and auditable |

### ERP item versus POS menu item

An **ERP item** is the official stock/accounting item with stable Sumady ID, SKU and UOM. A **POS menu item** is the café-facing configuration: display name, photo, category, modifiers and menu price. The POS menu record references the ERP item ID; it must not create an unrelated duplicate item.

Example: Sumady item `DRK-001` (Latte, Cup) is presented in POS with a photo and options for size, milk, sugar and add-ons.

### Recipe and ingredient consumption

Do not force ingredient-level inventory consumption into the first POS milestone. Later, a recipe may define Latte as 18 g coffee beans, 200 ml milk, one cup and one lid. Agree recipe ownership, yield, waste, substitutions, issue timing and costing with Sumady's inventory model. Sumady or an approved inventory service should calculate and post stock movements. Avoid duplicate stock deduction and duplicate COGS.

## 4. Integration components

### POS frontend
- Cashier and manager screens.
- Local cart/order state and supported local persistence.
- Connection and sync status.
- Calls application services, never ERP endpoints directly.

### POS application API / integration service
- Authenticates terminal and user.
- Checks business, branch and warehouse permissions.
- Exposes POS-friendly operations.
- Validates payload shape/version.
- Maps POS tender methods and menu references to ERP identifiers.
- Calls Sumady APIs/internal services.
- Stores sync state and ERP response references.
- Enforces idempotency and retry rules.

### Local persistence and outbox
- Persists finalized operations before upload.
- Stores stable event ID, payload version, attempt count and state.
- Retries transient failures.
- Preserves failed events for review; never silently drops them.

### Sumady ERP adapter
Conceptual methods: `getBusinessContext()`, `getBranches()`, `getWarehouses(branchId)`, `getItems(filters)`, `getCustomers(filters)`, `getTaxConfiguration(branchId)`, `getPaymentMappings(branchId)`, `submitFinalizedSale(payload, idempotencyKey)`, `submitRefundOrReversal(payload, idempotencyKey)`, `getTransactionStatus(posTransactionId)`.

These are conceptual contracts, not claims about existing endpoint names. Inspect Sumady's current backend and reuse existing services where possible.

## 5. Master-data synchronization

Sumady is the source of truth for business, branch, warehouse, item/SKU/UOM, customer, tax, payment-account mapping and centrally managed permissions. POS owns menu layout, images, modifier groups, tables, kitchen stations, receipt presentation and terminal/shift configuration.

Cache only data required to operate. Keep `erpId`, `lastSyncedAt` and an ERP version if available. Show last refresh time. If required tax or payment mapping is missing/stale, block finalization rather than guessing. Do not let POS overwrite ERP-owned SKU, UOM, tax or accounting fields.

**Pricing ownership must be decided:** Sumady, POS, or a controlled shared pricing service. Do not allow two systems to edit the same authoritative price without a precedence rule.

## 6. Sale lifecycle and accounting boundary

A cart, held order or kitchen draft is operational data and creates no GL journal.

At finalization, POS creates an immutable sale snapshot and stable `posTransactionId`, including business/branch/warehouse/terminal/cashier, ERP item references, quantities/UOM, modifier effects, discounts, tax breakdown, currency, tender/payment references and receipt snapshot.

POS submits the sale immediately or through its offline outbox. Sumady validates it and creates the official sales transaction through its existing transaction and posting engine. POS must never independently create GL journals.

Illustrative example only: customer pays USD 5.50, consisting of USD 5.00 net sale and USD 0.50 tax:
- Dr Cash / mapped payment account 5.50
- Cr Sales Revenue 5.00
- Cr Tax Payable 0.50

For QR provider settlement later, the debit may be a clearing account rather than cash/bank, according to Sumady's mapping. Actual tax calculation, rounding, discounts, branch dimensions and posting profiles must follow Sumady configuration. Add COGS/inventory posting only after recipe and inventory valuation flow is agreed.

Only mark the event `SYNCED` after Sumady confirms acceptance and returns the official transaction reference. A local receipt may exist while ERP sync is pending, but must be labeled accurately.

## 7. Offline behavior

### Possible offline capabilities (subject to business policy)
- Browse cached menu and modifiers.
- Build/edit carts and hold orders.
- Continue kitchen workflow within the available local network topology.
- Accept cash sales within configured limits if explicitly authorized.
- Save finalized sales locally and queue later ERP submission.

### Online-dependent capabilities
- Refresh authoritative master data.
- Confirm bank QR/card payment unless the provider supports verified offline authorization.
- Resolve uncached customer/item records.
- Receive official ERP transaction IDs.
- Perform ERP-controlled refunds/voids unless a specific offline process is designed.

Never mark an offline card/QR attempt PAID without provider authorization. Never say a sale has posted to Sumady while it is only queued locally.

### Single terminal versus multiple terminals

Browser IndexedDB/local storage is local to that browser/device. It does not automatically share orders with another cashier or KDS terminal. For one terminal, a local PWA/browser queue may be enough. For multiple terminals online, use a shared POS service. For multiple terminals during an internet outage, use a shared branch edge service or explicitly restrict offline operation to each terminal independently.

## 8. Idempotency, retries and conflict handling

Generate `posTransactionId` once before the first submission and reuse it for every retry. The integration service/Sumady must enforce uniqueness in the agreed business scope. If a request times out after processing, retry must return the original result, not create another invoice. Store the returned `erpTransactionId`.

Retry network timeouts and temporary service errors with backoff. Do not blindly retry permanent validation failures. Preserve payload and error details. Provide a manager-facing queue with pending, failed and conflict states.

- Master-data conflict: refresh from Sumady and require authorized resolution.
- Finalized sale: immutable; never merge/overwrite silently.
- Duplicate submission: return the existing ERP result using idempotency.
- Refund/void after posting: use ERP reversal/refund flow linked to original sale.
- Price/tax mismatch: reject or route for review; never silently rewrite a historical sale.

## 9. Security and operational controls

- Authenticate terminals and users; scope every operation to business, branch and permitted warehouse.
- Apply role permissions to discounts, voids, refunds, shift closing and offline limits.
- Encrypt network traffic and protect local data at rest where supported.
- Never store card PAN, CVV, PIN or payment secrets.
- Audit offline actions, sync attempts, overrides and manager approvals.
- Monitor last successful sync, queue age, failed events and edge-service health.
- Back up branch edge data if deployed; define recovery and retention procedures.

## 10. Suggested event flow

```text
Cashier finalizes sale
        |
        v
POS validates order and payment result
        |
        v
Persist immutable sale + outbox event
        |
        v
Integration service reachable?
       / \\
     No   Yes
     |     |
 Queue   Submit with posTransactionId
 locally          |
     |            v
     |       Sumady validates references,
     |       tax, payment and permissions
     |            |
     |            v
     |       Sumady creates official sale
     |       and posts through existing engine
     |            |
     |            v
     |       Return ERP transaction ID
     |            |
     +------> Mark SYNCED after confirmation
```

## 11. Implementation roadmap

**Stage A — UI prototype:** existing green design, mock data, adapter interfaces, simulated online/offline status and sync queue. No real API or DB migration.

**Stage B — integration discovery:** inspect Sumady authentication/tenant context, branch/warehouse/item/customer/tax/payment data, existing sales creation/posting, refund/void, permissions, audit and idempotency support.

**Stage C — online integration:** implement API adapter using existing Sumady conventions; pull/cache master data; submit sales; map tender methods; store ERP references; add sync monitoring.

**Stage D — single-terminal offline queue:** durable local storage, transactional outbox, retry/backoff, idempotency, approved offline cash limits; test browser/device restart and intermittent connectivity.

**Stage E — multi-terminal resilience:** only if needed, deploy branch edge service and local KDS/cashier communication; test power, router and internet failures.

**Stage F — recipe/inventory integration:** agree BOM ownership, ingredients, stock issue timing, waste/yield, costing and COGS; ensure no duplicate deduction.

## 12. Decisions to confirm before production

1. Are cash sales allowed during outages? What maximum value and duration?
2. Is each shop one cashier terminal, or multiple cashiers plus separate KDS?
3. Which real payment methods/providers are required, and which provider confirms payment?
4. Are menu selling prices maintained in POS, Sumady, or a controlled shared pricing service?
5. When should recipes deduct ingredients: at sale, order completion, or batch process?
6. Is the POS web/PWA, desktop, or both?

These decisions do not block the frontend demo, but must be confirmed before production integration.

## 13. Architecture acceptance criteria

- POS has no independent chart of accounts or GL posting engine.
- ERP master records are referenced by stable IDs, not duplicated.
- POS menu presentation and ERP item identity are separate.
- Each finalized sale has one stable POS transaction ID.
- Retrying cannot create a duplicate ERP sale.
- Payment, order, kitchen and sync statuses are independent.
- Offline cash behavior is explicitly configured and auditable.
- Offline card/QR is never falsely marked successful.
- A sale is not called ERP-posted until Sumady confirms it.
- Posted sales are corrected through supported reversal/refund flows.
- Multi-terminal offline capability is not claimed without shared branch infrastructure.
