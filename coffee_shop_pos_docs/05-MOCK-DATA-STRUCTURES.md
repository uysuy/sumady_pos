# 05 — Mock Data Structures

## 1. Purpose

Define consistent frontend-only data contracts for the Coffee Plus POS demo.

Use TypeScript types/interfaces if the project uses TypeScript. Adapt naming to the existing codebase. These are frontend models, not database schema instructions.

Use stable IDs. Avoid relying on array indexes as identifiers.

## 2. Shared conventions

- IDs: strings such as `prd_latte`, `cat_coffee`, `ord_10001`.
- Timestamps: ISO 8601 strings.
- Money: integer minor units (cents) preferred.
- Currency: explicit ISO-like code, e.g. `USD`.
- Status: string union / enum.
- Keep snapshots on completed orders so later menu edits do not rewrite historical receipts.

## 3. Suggested TypeScript models

```ts
type ID = string;
type CurrencyCode = "USD" | "KHR" | "THB" | string;
type Money = number; // integer minor units, e.g. 350 = $3.50

type ProductType = "DRINK" | "FOOD" | "BAKERY" | "OTHER";
type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
type PaymentMethod = "CASH" | "CARD" | "QR" | "GRABPAY";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";
type KitchenStatus = "NEW" | "PREPARING" | "READY" | "COMPLETED";
type OrderStatus = "HELD" | "OPEN" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface Branch {
  id: ID;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
}

interface Category {
  id: ID;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
}

interface ModifierOption {
  id: ID;
  name: string;
  priceDelta: Money;
  active: boolean;
  isDefault?: boolean;
  sortOrder: number;
}

interface ModifierGroup {
  id: ID;
  name: string;
  selectionMode: "SINGLE" | "MULTIPLE";
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
  appliesToProductIds: ID[];
  active: boolean;
  sortOrder: number;
}

interface Product {
  id: ID;
  sku?: string;
  name: string;
  description?: string;
  type: ProductType;
  categoryId: ID;
  imageUrl?: string;
  basePrice: Money;
  currency: CurrencyCode;
  modifierGroupIds: ID[];
  active: boolean;
  available: boolean;
  taxCategoryId?: ID;
}

interface Customer {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

interface StaffMember {
  id: ID;
  name: string;
  roleId: ID;
  branchId: ID;
  phone?: string;
  active: boolean;
  avatarUrl?: string;
}

interface Role {
  id: ID;
  name: string;
  permissions: string[];
}

interface SelectedModifier {
  groupId: ID;
  groupName: string;
  optionId: ID;
  optionName: string;
  priceDelta: Money;
}

interface CartLine {
  id: ID;
  productId: ID;
  productName: string;
  productImageUrl?: string;
  baseUnitPrice: Money;
  selectedModifiers: SelectedModifier[];
  specialInstructions?: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

interface OrderTotals {
  subtotal: Money;
  discount: Money;
  taxableAmount: Money;
  tax: Money;
  total: Money;
  currency: CurrencyCode;
}

interface Payment {
  id: ID;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  amountReceived?: Money;
  changeDue?: Money;
  createdAt: string;
  demoReference: string;
}

interface Order {
  id: ID;
  orderNumber: string;
  branchId: ID;
  cashierId: ID;
  customerId?: ID;
  orderType: OrderType;
  tableId?: ID;
  deliveryDetails?: {
    recipientName?: string;
    phone?: string;
    address?: string;
    note?: string;
  };
  lines: CartLine[];
  totals: OrderTotals;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  kitchenStatus?: KitchenStatus;
  payment?: Payment;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  note?: string;
  source: "POS" | "DEMO_SEED";
}

interface HeldOrder {
  id: ID;
  reference?: string;
  lines: CartLine[];
  orderType: OrderType;
  tableId?: ID;
  customerId?: ID;
  discount: Money;
  note?: string;
  createdAt: string;
  cashierId: ID;
}

interface Table {
  id: ID;
  name: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
  active: boolean;
}

interface TaxSetting {
  id: ID;
  name: string;
  rateBasisPoints: number; // 1000 = 10%
  calculationMode: "EXCLUSIVE" | "INCLUSIVE";
  active: boolean;
}

interface ShiftMovement {
  id: ID;
  type: "CASH_IN" | "CASH_OUT";
  amount: Money;
  reason: string;
  note?: string;
  createdAt: string;
  staffId: ID;
}

interface CashShift {
  id: ID;
  staffId: ID;
  branchId: ID;
  openingCash: Money;
  openedAt: string;
  closedAt?: string;
  countedCash?: Money;
  expectedCash?: Money;
  status: "OPEN" | "CLOSED";
  movements: ShiftMovement[];
}
```

## 4. Seed categories

Suggested categories:
- All Items (UI filter only; not necessarily a persisted category).
- Coffee.
- Tea.
- Non-Coffee.
- Cold Drinks.
- Bakery.
- Pastries.
- Food.

## 5. Seed products

Sample USD prices; configurable demo data only.

| Product | Category | Base price |
|---|---|---:|
| Americano | Coffee | $3.00 |
| Latte | Coffee | $3.50 |
| Cappuccino | Coffee | $3.50 |
| Mocha | Coffee | $4.00 |
| Caramel Macchiato | Coffee | $4.50 |
| Green Tea Latte | Tea | $4.00 |
| Thai Tea | Tea | $3.50 |
| Iced Coffee | Cold Drinks | $3.00 |
| Matcha Latte | Tea | $4.00 |
| Iced Chocolate | Non-Coffee | $3.50 |
| Croissant | Bakery | $2.50 |
| Blueberry Muffin | Bakery | $3.00 |
| Cheesecake | Pastries | $4.00 |
| Donut | Pastries | $2.50 |
| Cookie | Pastries | $2.00 |

Use product IDs such as `prd_americano`, `prd_latte`, `prd_cappuccino`. Use local bundled images or stable assets. Do not depend on randomly generated external image URLs.

## 6. Suggested modifier groups

### Size
- Small: +$0.00
- Medium: +$0.50
- Large: +$1.00

### Temperature
- Hot: +$0.00
- Iced: +$0.00

### Milk
- Regular: +$0.00
- Oat: +$0.50
- Soy: +$0.50
- Almond: +$0.75

### Sugar
- 100%: +$0.00
- 70%: +$0.00
- 50%: +$0.00
- 0%: +$0.00

### Ice
- Extra: +$0.00
- Regular: +$0.00
- Less: +$0.00
- No Ice: +$0.00

### Extras
- Extra Shot: +$0.50
- Caramel Syrup: +$0.50
- Vanilla Syrup: +$0.50
- Whipped Cream: +$0.50

Not every product should use every group. Configure applicability per product.

## 7. Seed shop settings

```ts
const demoShopSettings = {
  shopName: "Coffee Plus",
  tagline: "Good Coffee, Good Mood",
  currency: "USD",
  currencyMinorUnit: 2,
  tax: {
    name: "Demo Tax",
    rateBasisPoints: 1000,
    calculationMode: "EXCLUSIVE"
  },
  defaultOrderType: "TAKEAWAY",
  demoMode: true
};
```

Clearly label tax and payment behavior as configurable demo settings.

## 8. Seed staff and customer examples

Staff:
- John Smith — Cashier.
- Sarah Lee — Barista.
- Alex Morgan — Manager.

Customers:
- Emily Carter.
- Daniel Kim.
- Guest Customer (special non-persisted option if preferred).

Use fictional data only. Do not use real personal contact details.

## 9. Seed order data

Provide a small variety:
- Several completed paid orders for dashboard charts.
- At least one new kitchen order.
- At least one preparing order.
- At least one ready order.
- At least one takeaway order.
- At least one dine-in order with a table.
- At least one order with custom drink modifiers.

Seed orders must be internally consistent: totals, payment amount, payment status, timestamps, order type and kitchen status must agree.

## 10. State container

Suggested top-level state:

```ts
interface DemoAppState {
  settings: typeof demoShopSettings;
  activeBranchId: ID;
  activeStaffId: ID;
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  customers: Customer[];
  staff: StaffMember[];
  roles: Role[];
  tables: Table[];
  orders: Order[];
  heldOrders: HeldOrder[];
  activeCart: {
    lines: CartLine[];
    orderType: OrderType;
    tableId?: ID;
    customerId?: ID;
    discount: Money;
    note?: string;
  };
  shifts: CashShift[];
}
```

Adapt this to the project's state-management approach.

## 11. Mock service operations

Provide frontend functions/actions for:
- `searchProducts`
- `addCartLine`
- `updateCartLineQuantity`
- `removeCartLine`
- `updateCartLineModifiers`
- `calculateOrderTotals`
- `holdCurrentOrder`
- `resumeHeldOrder`
- `createDemoPayment`
- `completePaidOrder`
- `updateKitchenStatus`
- `addCustomer`
- `saveProduct`
- `saveCategory`
- `openShift`
- `addShiftMovement`
- `closeShift`
- `getSalesSummary`
- `resetDemoData`

These are client-side operations only. Keep the interface easy to replace with API calls later.

## Future integration fields — hybrid POS and Sumady

These are design contracts for a future implementation, not a requirement to add a backend during the demo phase.

```ts
type SyncState = "LOCAL_ONLY" | "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";

type ERPReference = {
  erpId: string;             // Stable ID issued by Sumady
  lastSyncedAt?: string;
  syncVersion?: number;
};

type POSMenuItem = {
  id: string;                // POS menu configuration ID
  erpItem: ERPReference;     // Link to Sumady item; do not duplicate identity
  displayName: string;
  categoryId: string;
  imageUrl?: string;
  modifierGroupIds: string[];
  isAvailable: boolean;
};

type POSOrigin = {
  posTransactionId: string;  // UUID and idempotency key
  businessId: string;
  branchId: string;
  warehouseId: string;
  terminalId: string;
  cashierId: string;
  createdAt: string;
};

type POSOutboxRecord = {
  id: string;
  eventType: "SALE_FINALIZED" | "SALE_VOID_REQUESTED" | "REFUND_REQUESTED";
  posTransactionId: string;
  payload: unknown;          // Versioned, validated payload
  state: SyncState;
  attemptCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  erpTransactionId?: string;
};
```

Keep `orderStatus`, `paymentStatus` and `syncStatus` independent. A paid sale may still be pending ERP synchronization. A kitchen order may be preparing while its sync is pending.

When finalizing a sale, preserve a historical snapshot of item names/SKUs, modifiers, quantities, prices, discounts, tax, currency, receipt details, branch, cashier and terminal. Later menu edits must not rewrite historical receipts.

Use integer minor units or a decimal-safe money utility, include currency codes, use timezone-aware ISO timestamps, include payload schema versions, never use display names as foreign keys, and never store card PAN/CVV/PIN or payment secrets.
