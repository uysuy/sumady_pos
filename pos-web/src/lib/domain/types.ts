export type ID = string;
export type Money = number;

export interface LocaleText {
	en: string;
	kh: string;
}

export type ProductType = 'DRINK' | 'FOOD' | 'BAKERY' | 'OTHER';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'GRABPAY';
export type PaymentAttemptStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type DeliveryChannel = 'OWN' | 'GRAB' | 'FOODPANDA' | 'NHAM24' | 'OTHER';
export type PaymentStatus =
	| 'UNPAID'
	| 'PENDING'
	| 'PARTIALLY_PAID'
	| 'PAID'
	| 'FAILED'
	| 'CANCELLED'
	| 'REFUNDED'
	| 'PARTIAL_REFUND';
/** Line/order kitchen prep. UNSENT = not sent yet; VOIDED = void after send (Step 2). */
export type KitchenStatus = 'UNSENT' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'VOIDED';
/**
 * Service lifecycle (independent of payment).
 * CONFIRMED retained for legacy paid+kitchen orders (treat like in-service for occupancy).
 */
export type OrderStatus =
	| 'HELD'
	| 'OPEN'
	| 'SENT'
	| 'IN_PROGRESS'
	| 'CONFIRMED'
	| 'COMPLETED'
	| 'CANCELLED';
export type RefundKind = 'FULL' | 'PARTIAL' | 'CANCEL';
export type SyncState = 'LOCAL_ONLY' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
export type DiscountMode = 'NONE' | 'PERCENT' | 'FIXED';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
export type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE';

export interface Branch {
	id: ID;
	name: LocaleText;
	address: LocaleText;
	phone: string;
	warehouseId: string;
	active: boolean;
}

export interface Category {
	id: ID;
	name: LocaleText;
	description: LocaleText;
	sortOrder: number;
	active: boolean;
}

export interface ModifierOption {
	id: ID;
	name: LocaleText;
	priceDelta: Money;
	active: boolean;
	isDefault?: boolean;
	sortOrder: number;
}

export interface ModifierGroup {
	id: ID;
	name: LocaleText;
	selectionMode: 'SINGLE' | 'MULTIPLE';
	required: boolean;
	minSelections: number;
	maxSelections: number;
	options: ModifierOption[];
	active: boolean;
	sortOrder: number;
}

/** Per-branch menu overrides. Undefined fields inherit the product defaults. */
export interface ProductBranchOverride {
	branchId: ID;
	available?: boolean;
	basePrice?: Money;
}

export interface Product {
	id: ID;
	sku: string;
	erpItemId: string;
	name: LocaleText;
	description: LocaleText;
	type: ProductType;
	categoryId: ID;
	imageUrl: string;
	basePrice: Money;
	modifierGroupIds: ID[];
	active: boolean;
	available: boolean;
	preparesInKitchen: boolean;
	taxCategoryId: ID;
	/** Lower sorts first on POS within a category. */
	sortOrder: number;
	branchOverrides: ProductBranchOverride[];
}

export interface Customer {
	id: ID;
	name: LocaleText;
	phone?: string;
	email?: string;
	notes?: string;
	active: boolean;
	createdAt: string;
}

export interface Role {
	id: ID;
	name: LocaleText;
	permissions: string[];
}

export interface StaffMember {
	id: ID;
	name: LocaleText;
	roleId: ID;
	/** Branches this user may work at (one or more). */
	branchIds: ID[];
	phone?: string;
	/**
	 * Demo clock-in PIN for the login screen (4 digits, not a real password store).
	 * Default seed value is `1234`.
	 */
	loginPin?: string;
	active: boolean;
}

export interface SelectedModifier {
	groupId: ID;
	groupName: LocaleText;
	optionId: ID;
	optionName: LocaleText;
	priceDelta: Money;
}

export interface CartLine {
	id: ID;
	productId: ID;
	sku: string;
	erpItemId: string;
	/** Frozen at line add — catalog renames do not rewrite this. */
	productName: LocaleText;
	productImageUrl?: string;
	categoryId: ID;
	preparesInKitchen: boolean;
	/**
	 * Frozen prep station hint until configurable stations (Step 3).
	 * Catalog station changes must not rewrite existing OPEN lines.
	 */
	stationId?: ID;
	stationName?: LocaleText;
	/** Item-level prep status; UNSENT until kitchen send (Step 2). Omitted for serve-only. */
	kitchenStatus?: KitchenStatus;
	/** Frozen catalog base at line add. */
	baseUnitPrice: Money;
	/** Frozen modifier snapshots (names + priceDelta). */
	selectedModifiers: SelectedModifier[];
	specialInstructions?: string;
	quantity: number;
	/** Frozen unit price (base + mods); qty changes recompute lineTotal only. */
	unitPrice: Money;
	lineTotal: Money;
}

/** One tender applied at checkout (amount is applied to the order total). */
export interface TenderAllocation {
	method: PaymentMethod;
	amount: Money;
	/** Cash only: USD cents tendered; may exceed `amount` for change. */
	amountReceived?: Money;
	/** Cash only: KHR riel tendered alongside USD. */
	amountReceivedKhr?: number;
	/** When true, treated as delivery-app settlement (non-drawer). */
	paidByApp?: boolean;
}

/** Provider/cashier payment try — never flips order to FAILED on its own. */
export interface PaymentAttempt {
	id: ID;
	method: PaymentMethod;
	amount: Money;
	status: PaymentAttemptStatus;
	createdAt: string;
	updatedAt: string;
	demoReference: string;
	/** demo = manual Confirm/Fail; payway = ABA sandbox KHQR */
	provider?: 'demo' | 'payway';
	tranId?: string;
	qrImage?: string;
	qrString?: string;
}

export interface RefundRecord {
	id: ID;
	amount: Money;
	method: PaymentMethod;
	kind: RefundKind;
	reason: string;
	staffId: ID;
	createdAt: string;
}

export interface OrderTotals {
	subtotal: Money;
	discount: Money;
	taxableAmount: Money;
	tax: Money;
	total: Money;
	currency: 'USD';
	taxName: LocaleText;
	taxRateBasisPoints: number;
	taxMode: TaxMode;
	usdToKhr: number;
	totalKhr: number;
}

export interface Payment {
	id: ID;
	method: PaymentMethod;
	status: PaymentStatus;
	amount: Money;
	amountReceived?: Money;
	amountReceivedKhr?: number;
	changeDue?: Money;
	changeDueKhr?: number;
	usdToKhr?: number;
	paidByApp?: boolean;
	createdAt: string;
	demoReference: string;
}

export interface DeliveryDetails {
	recipientName: string;
	phone: string;
	address: string;
	note: string;
	channel?: DeliveryChannel;
	appRef?: string;
}

export type ReceiptDocType = 'CAFE' | 'RETAIL' | 'COMMERCIAL' | 'VAT_TAX';
export type ReceiptLangMode = 'en' | 'kh' | 'both';
export type ReceiptPaper = '58' | '80' | 'A4';

export interface ReceiptShowFlags {
	logo: boolean;
	businessInfo: boolean;
	cashier: boolean;
	branch: boolean;
	table: boolean;
	orderType: boolean;
	customer: boolean;
	sku: boolean;
	modifiers: boolean;
	discount: boolean;
	tax: boolean;
	serviceCharge: boolean;
	payment: boolean;
	received: boolean;
	change: boolean;
	qr: boolean;
	footer: boolean;
}

export interface ReceiptTemplateSettings {
	docType: ReceiptDocType;
	language: ReceiptLangMode;
	paper: ReceiptPaper;
	logoUrl: string;
	qrUrl: string;
	/** User-declared VAT registration — never inferred. */
	vatRegistered: boolean;
	/** User-entered VATTIN / TIN — never fabricated. */
	vattin: string;
	show: ReceiptShowFlags;
}

export interface ReceiptSnapshot {
	shopName: LocaleText;
	tagline: LocaleText;
	address: LocaleText;
	phone: string;
	/** Cambodia VAT / tax identification number shown on the receipt header. */
	taxId?: string;
	footer: LocaleText;
	branchName: LocaleText;
	cashierName: LocaleText;
	paper: ReceiptPaper;
	docType?: ReceiptDocType;
	language?: ReceiptLangMode;
	logoUrl?: string;
	qrUrl?: string;
	vatRegistered?: boolean;
	vattin?: string;
	show?: ReceiptShowFlags;
}

export type TimelineCode =
	| 'held'
	| 'opened'
	| 'paid'
	| 'kitchen_new'
	| 'kitchen_preparing'
	| 'kitchen_ready'
	| 'kitchen_completed'
	| 'completed'
	| 'cancelled'
	| 'refunded'
	| 'partial_refund'
	| 'voided';

export interface TimelineEvent {
	at: string;
	code: TimelineCode;
	detail?: string;
}

export interface Order {
	id: ID;
	orderNumber: string;
	/** Short daily pickup / waiting token for CDS + receipt (e.g. "07"). */
	waitingNumber?: string;
	posTransactionId: string;
	branchId: ID;
	warehouseId: string;
	terminalId: string;
	cashierId: ID;
	shiftId?: ID;
	customerId?: ID;
	orderType: OrderType;
	tableId?: ID;
	delivery?: DeliveryDetails;
	lines: CartLine[];
	totals: OrderTotals;
	discountMode: DiscountMode;
	discountValue: number;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	kitchenStatus?: KitchenStatus;
	syncStatus: SyncState;
	erpTransactionId?: string;
	/** Legacy single tender — prefer `payments`. Kept for seed/backward compatibility. */
	payment?: Payment;
	payments?: Payment[];
	createdAt: string;
	paidAt?: string;
	completedAt?: string;
	note?: string;
	holdReference?: string;
	refundReason?: string;
	cancelReason?: string;
	refunds?: RefundRecord[];
	refundedTotal?: Money;
	receipt?: ReceiptSnapshot;
	timeline: TimelineEvent[];
	source: 'POS' | 'DEMO_SEED';
}

export interface Cart {
	lines: CartLine[];
	orderType: OrderType;
	tableId?: ID;
	customerId?: ID;
	discountMode: DiscountMode;
	discountValue: number;
	note: string;
	delivery: DeliveryDetails;
	/** When set, cart edits sync into this persisted OPEN order. */
	openOrderId?: ID;
}

export interface Table {
	id: ID;
	branchId: ID;
	name: string;
	capacity: number;
	status: TableStatus;
	active: boolean;
}

export interface TaxSetting {
	id: ID;
	name: LocaleText;
	rateBasisPoints: number;
	calculationMode: TaxMode;
	active: boolean;
}

export interface PaymentMethodSetting {
	method: PaymentMethod;
	enabled: boolean;
	label: LocaleText;
}

export interface ShopSettings {
	shopName: LocaleText;
	tagline: LocaleText;
	address: LocaleText;
	phone: string;
	/** Demo TIN / VAT registration for Cambodia-shaped receipts. */
	taxId: string;
	receiptFooter: LocaleText;
	currency: 'USD';
	usdToKhr: number;
	tax: TaxSetting;
	defaultOrderType: OrderType;
	paper: ReceiptPaper;
	receiptTemplate: ReceiptTemplateSettings;
	offlineCashLimitCents: Money;
	paymentMethods: PaymentMethodSetting[];
	/** Optional KDS beep for new tickets (browser AudioContext). */
	kitchenSoundEnabled: boolean;
	/**
	 * When true: POS can persist unpaid OPEN checks (Step 1).
	 * When false: café regression — pay-from-cart only (Hold still works).
	 */
	persistOpenOrdersEnabled: boolean;
	/** Require manager PIN for refund / cancel paid. */
	managerPinEnabled: boolean;
	/** Demo PIN — default 1234. */
	managerPin: string;
	businessId: string;
	terminalId: string;
	demoMode: true;
}

export interface ShiftClosingReport {
	closedAt: string;
	staffId: ID;
	branchId: ID;
	openingCash: Money;
	countedCash: Money;
	expectedCash: Money;
	overShort: Money;
	cashSales: Money;
	nonCashSales: Money;
	cashReceived: Money;
	cashChange: Money;
	cashRefunds: Money;
	byMethod: { method: PaymentMethod; applied: Money; count: number }[];
	movements: ShiftMovement[];
	orderCount: number;
}

export interface ShiftMovement {
	id: ID;
	type: 'CASH_IN' | 'CASH_OUT';
	amount: Money;
	reason: string;
	note?: string;
	createdAt: string;
	staffId: ID;
}

export interface CashShift {
	id: ID;
	staffId: ID;
	branchId: ID;
	openingCash: Money;
	openedAt: string;
	closedAt?: string;
	countedCash?: Money;
	expectedCash?: Money;
	cashSales?: Money;
	nonCashSales?: Money;
	status: 'OPEN' | 'CLOSED';
	note?: string;
	movements: ShiftMovement[];
	/** Frozen at close — immutable thereafter. */
	closingReport?: ShiftClosingReport;
}

export interface SplitPartDraft {
	id: string;
	label: string;
	lineIds: ID[];
	amount: Money;
}

export type OutboxEventType = 'SALE_FINALIZED' | 'REFUND_REQUESTED';

export interface OutboxRecord {
	id: ID;
	eventType: OutboxEventType;
	posTransactionId: string;
	orderId: ID;
	orderNumber: string;
	state: SyncState;
	attemptCount: number;
	createdAt: string;
	erpTransactionId?: string;
	lastErrorMessage?: string;
}

export interface DemoAppState {
	settings: ShopSettings;
	/** Selectable tax categories for products; `settings.tax` remains the shop default. */
	taxCategories: TaxSetting[];
	activeBranchId: ID;
	activeStaffId: ID;
	demoLink: 'online' | 'offline';
	branches: Branch[];
	categories: Category[];
	modifierGroups: ModifierGroup[];
	products: Product[];
	customers: Customer[];
	staff: StaffMember[];
	roles: Role[];
	tables: Table[];
	orders: Order[];
	cart: Cart;
	shifts: CashShift[];
	outbox: OutboxRecord[];
}

export interface SalesSummary {
	gross: Money;
	discounts: Money;
	tax: Money;
	net: Money;
	refunds: Money;
	collected: Money;
	orderCount: number;
	average: Money;
	best: { name: LocaleText; qty: number } | null;
	byCategory: { categoryId: ID; total: Money; qty: number }[];
	byPayment: { method: PaymentMethod; total: Money; count: number }[];
	topProducts: { productId: ID; name: LocaleText; qty: number; total: Money }[];
	byCashier: { cashierId: ID; total: Money; count: number }[];
	series: { label: string; total: Money }[];
}
