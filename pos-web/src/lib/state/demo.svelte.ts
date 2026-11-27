import {
	clearCds,
	openCustomerDisplayWindow,
	publishCds,
	publishCdsQueueBoard,
	type CdsPhase
} from '$lib/cds/channel';
import { buildCdsQueueBoard } from '$lib/cds/queue';
import { defaultOptionIds, lineIdentity, makeLine, modifierSummaryText, selectionError, selectionFrom } from '$lib/domain/catalog';
import { priceCart, settleMixedCash } from '$lib/domain/money';
import {
	allocateRefundAcrossTenders,
	orderPayments,
	cashRefunded,
	refundableRemaining,
	refundedTotal
} from '$lib/domain/order-payments';
import { resolveProduct, resolveTaxForProducts } from '$lib/domain/product-resolve';
import { normalizeReceiptTemplate } from '$lib/domain/receipt-template';
import { shiftFigures } from '$lib/domain/reports';
import type {
	CartLine,
	CashShift,
	Category,
	Customer,
	DeliveryDetails,
	DemoAppState,
	DiscountMode,
	KitchenStatus,
	ModifierGroup,
	Order,
	OrderTotals,
	OrderType,
	OutboxRecord,
	Payment,
	PaymentAttempt,
	PaymentMethod,
	Product,
	ReceiptTemplateSettings,
	Role,
	ShiftClosingReport,
	StaffMember,
	TaxSetting,
	TenderAllocation,
	TimelineCode
} from '$lib/domain/types';
import {
	categories as seedCategories,
	createSeedState,
	emptyCart,
	modifierGroups as seedModifierGroups,
	products as seedProducts
} from '$lib/data/seed';
import { resetMockErp, submitToMockErp } from '$lib/erp/mock-adapter';

const STORAGE_KEY = 'coffee-plus-pos.v1';
const STATE_CHANNEL = 'coffee-plus-state';
const AUTH_KEY = 'coffee-plus-auth.v1';
const DEFAULT_LOGIN_PIN = '1234';

export interface ConfirmRequest {
	title: string;
	body: string;
	confirmLabel: string;
	danger?: boolean;
	onYes: () => void;
}

export type PayCode =
	| 'ok'
	| 'busy'
	| 'empty'
	| 'permission'
	| 'method_disabled'
	| 'table'
	| 'delivery'
	| 'insufficient'
	| 'offline_tender'
	| 'offline_limit'
	| 'simulated_fail'
	| 'no_shift'
	| 'allocation';

export type RefundCode = 'ok' | 'permission' | 'reason' | 'invalid' | 'amount';

function uid(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function kitchenRank(status: KitchenStatus): number {
	if (status === 'UNSENT') return -1;
	if (status === 'NEW') return 0;
	if (status === 'PREPARING') return 1;
	if (status === 'READY') return 2;
	if (status === 'COMPLETED') return 3;
	return 4; // VOIDED — ignored by aggregate filter
}

function aggregateKitchen(lines: CartLine[]): KitchenStatus | undefined {
	const kitchenLines = lines.filter(
		(line) =>
			line.preparesInKitchen &&
			line.kitchenStatus !== 'UNSENT' &&
			line.kitchenStatus !== 'VOIDED'
	);
	if (!kitchenLines.length) return undefined;
	let min = kitchenLines[0].kitchenStatus ?? 'NEW';
	for (const line of kitchenLines) {
		const status = line.kitchenStatus ?? 'NEW';
		if (kitchenRank(status) < kitchenRank(min)) min = status;
	}
	return min;
}

function cloneLine(line: CartLine): CartLine {
	return {
		...line,
		productName: { ...line.productName },
		stationName: line.stationName ? { ...line.stationName } : undefined,
		selectedModifiers: line.selectedModifiers.map((item) => ({
			...item,
			groupName: { ...item.groupName },
			optionName: { ...item.optionName }
		}))
	};
}

function snapshotLinesForOpen(lines: CartLine[], categories: { id: string; name: { en: string; kh: string } }[]): CartLine[] {
	return lines.map((line) => {
		const cloned = cloneLine(line);
		if (cloned.preparesInKitchen) {
			cloned.kitchenStatus = 'UNSENT';
			const stationId = cloned.stationId ?? cloned.categoryId;
			cloned.stationId = stationId;
			const category = categories.find((item) => item.id === stationId);
			if (category && !cloned.stationName) cloned.stationName = { ...category.name };
		} else {
			cloned.kitchenStatus = undefined;
		}
		return cloned;
	});
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Pull new demo catalog / venues into persisted state without wiping orders. */
function mergeDemoCatalog(state: DemoAppState) {
	const seed = createSeedState();

	const catById = new Map(state.categories.map((item) => [item.id, item]));
	for (const category of seedCategories) {
		const existing = catById.get(category.id);
		if (!existing) {
			state.categories.push(cloneJson(category));
			continue;
		}
		existing.name = cloneJson(category.name);
		existing.description = cloneJson(category.description);
		existing.sortOrder = category.sortOrder;
		existing.active = category.active;
	}

	const groupById = new Map(state.modifierGroups.map((item) => [item.id, item]));
	for (const group of seedModifierGroups) {
		const existing = groupById.get(group.id);
		if (!existing) {
			state.modifierGroups.push(cloneJson(group));
			continue;
		}
		const optionIds = new Set(existing.options.map((option) => option.id));
		for (const option of group.options) {
			if (!optionIds.has(option.id)) existing.options.push(cloneJson(option));
		}
	}

	const productById = new Map(state.products.map((item) => [item.id, item]));
	for (const product of seedProducts) {
		const existing = productById.get(product.id);
		if (!existing) {
			state.products.push(cloneJson(product));
			continue;
		}
		existing.categoryId = product.categoryId;
		existing.modifierGroupIds = [...product.modifierGroupIds];
		existing.basePrice = product.basePrice;
		existing.preparesInKitchen = product.preparesInKitchen;
		existing.available = product.available;
		existing.active = product.active;
		existing.imageUrl = product.imageUrl;
		existing.branchOverrides = cloneJson(product.branchOverrides);
		existing.sortOrder = product.sortOrder;
		existing.taxCategoryId = product.taxCategoryId || existing.taxCategoryId;
	}

	const branchById = new Map(state.branches.map((item) => [item.id, item]));
	for (const branch of seed.branches) {
		if (!branchById.has(branch.id)) state.branches.push(cloneJson(branch));
		else {
			const cur = branchById.get(branch.id)!;
			cur.name = branch.name;
			cur.address = branch.address;
			cur.phone = branch.phone;
			cur.warehouseId = branch.warehouseId;
			cur.active = branch.active;
		}
	}

	const tableById = new Map(state.tables.map((item) => [item.id, item]));
	for (const table of seed.tables) {
		if (!tableById.has(table.id)) state.tables.push(cloneJson(table));
	}
	/** Intentionally does not merge seed orders/outbox — Reset must stay clear of sample sales. */
}

function staffBranchIds(person: StaffMember & { branchId?: string }): string[] {
	if (Array.isArray(person.branchIds) && person.branchIds.length) {
		return [...new Set(person.branchIds.map((id) => String(id).trim()).filter(Boolean))];
	}
	const legacy = typeof person.branchId === 'string' ? person.branchId.trim() : '';
	return legacy ? [legacy] : [];
}

function ensureOpenShift(state: DemoAppState, staffId: string, branchId: string, id: string) {
	const open = state.shifts.some(
		(shift) => shift.status === 'OPEN' && shift.staffId === staffId && shift.branchId === branchId
	);
	if (open) return;
	if (!state.staff.some((person) => person.id === staffId)) return;
	if (!state.branches.some((branch) => branch.id === branchId)) return;
	state.shifts.push({
		id,
		staffId,
		branchId,
		openingCash: 20000,
		openedAt: new Date().toISOString(),
		status: 'OPEN',
		note: 'Morning float',
		movements: []
	});
}

function normalizeState(state: DemoAppState): DemoAppState {
	if (state.settings.kitchenSoundEnabled == null) state.settings.kitchenSoundEnabled = true;
	if (state.settings.persistOpenOrdersEnabled == null) state.settings.persistOpenOrdersEnabled = true;
	if (state.settings.managerPinEnabled == null) state.settings.managerPinEnabled = true;
	if (!state.settings.managerPin) state.settings.managerPin = '1234';
	if (!state.settings.taxId) state.settings.taxId = 'K001-234567890';
	if (state.cart?.delivery && state.cart.delivery.channel == null) {
		state.cart.delivery.channel = 'OWN';
		state.cart.delivery.appRef = state.cart.delivery.appRef ?? '';
	}
	state.settings.receiptTemplate = normalizeReceiptTemplate(state.settings.receiptTemplate, state.settings);
	if (state.settings.paper !== '58' && state.settings.paper !== '80' && state.settings.paper !== 'A4') {
		state.settings.paper = state.settings.receiptTemplate.paper;
	}
	/** Old seed used $50 offline cap — raise so a normal café ticket can demo Offline. */
	if (!Number.isFinite(state.settings.offlineCashLimitCents) || state.settings.offlineCashLimitCents <= 5000) {
		state.settings.offlineCashLimitCents = 50000;
	}
	state.staff = state.staff.map((person) => {
		const branchIds = staffBranchIds(person as StaffMember & { branchId?: string });
		const { branchId: _legacy, ...rest } = person as StaffMember & { branchId?: string };
		const pin = String(rest.loginPin ?? '').replace(/\D/g, '').slice(0, 4);
		return {
			...rest,
			branchIds: branchIds.length ? branchIds : [state.activeBranchId].filter(Boolean),
			loginPin: pin.length === 4 ? pin : DEFAULT_LOGIN_PIN
		};
	});
	/** Cashier can complete sell → kitchen in one staff for demos. */
	for (const role of state.roles) {
		if (role.id === 'role_cashier' && !role.permissions.includes('kitchen')) {
			role.permissions = [...role.permissions, 'kitchen'];
		}
	}
	if (!state.taxCategories?.length) {
		state.taxCategories = [{ ...state.settings.tax }];
		if (!state.taxCategories.some((tax) => tax.id === 'tax_exempt')) {
			state.taxCategories.push({
				id: 'tax_exempt',
				name: { en: 'No tax', kh: 'គ្មានអាករ' },
				rateBasisPoints: 0,
				calculationMode: 'EXCLUSIVE',
				active: true
			});
		}
	}
	if (!Array.isArray(state.shifts)) state.shifts = [];
	ensureOpenShift(state, 'stf_john', 'br_main', 'sh_open_john');
	ensureOpenShift(state, 'stf_alex', 'br_main', 'sh_open_alex');
	mergeDemoCatalog(state);
	state.products = state.products.map((product, index) => ({
		...product,
		taxCategoryId: product.taxCategoryId || state.settings.tax.id || 'tax_vat',
		sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : index + 1,
		branchOverrides: Array.isArray(product.branchOverrides) ? product.branchOverrides : []
	}));
	for (const order of state.orders) {
		if (!order.payments?.length && order.payment) order.payments = [order.payment];
		if (!order.payments) order.payments = [];
		if (!order.refunds) order.refunds = [];
		if (!order.waitingNumber) {
			const digits = String(order.orderNumber ?? '').replace(/\D/g, '').slice(-2);
			if (digits) order.waitingNumber = digits.padStart(2, '0');
		}
		if (order.refundedTotal == null) {
			order.refundedTotal = order.paymentStatus === 'REFUNDED' ? order.totals.total : 0;
		}
		/** Legacy unpaid open-like: never leave FAILED on unpaid checks from attempt confusion. */
		if (order.orderStatus === 'OPEN' && order.paymentStatus === 'FAILED') {
			order.paymentStatus = 'UNPAID';
		}
		if (order.orderStatus === 'OPEN' && order.paymentStatus === 'PENDING') {
			order.paymentStatus = 'UNPAID';
		}
		for (const line of order.lines) {
			if (line.preparesInKitchen && !line.kitchenStatus && order.kitchenStatus) {
				line.kitchenStatus = order.kitchenStatus;
			}
			if (order.orderStatus === 'OPEN' && line.preparesInKitchen && !line.kitchenStatus) {
				line.kitchenStatus = 'UNSENT';
			}
			if (line.preparesInKitchen && !line.stationId) {
				line.stationId = line.categoryId;
			}
		}
	}
	return state;
}

type PersistedBlob = {
	schemaVersion: number;
	state: DemoAppState;
	writtenAt?: number;
};

function parsePersisted(raw: string): PersistedBlob | null {
	try {
		const parsed = JSON.parse(raw) as PersistedBlob;
		if (parsed.schemaVersion !== 1 || !parsed.state?.products || !parsed.state.orders || !parsed.state.cart) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

function loadState(): { state: DemoAppState; restored: boolean; writtenAt: number } {
	if (typeof localStorage === 'undefined') {
		return { state: createSeedState(), restored: false, writtenAt: 0 };
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { state: createSeedState(), restored: false, writtenAt: 0 };
		const parsed = parsePersisted(raw);
		if (!parsed) return { state: createSeedState(), restored: true, writtenAt: 0 };
		return {
			state: normalizeState(parsed.state),
			restored: false,
			writtenAt: parsed.writtenAt ?? 0
		};
	} catch {
		return { state: createSeedState(), restored: true, writtenAt: 0 };
	}
}

class DemoApp {
	state = $state<DemoAppState>(createSeedState());
	restoredNotice = $state(false);
	flashMsg = $state<string | null>(null);
	/** Bumps on every flash so the toast remounts and animates per event. */
	flashId = $state(0);
	confirm = $state<ConfirmRequest | null>(null);
	posQuery = $state('');
	posCategory = $state('all');
	cartOpen = $state(false);
	customizeProductId = $state<string | null>(null);
	editingLineId = $state<string | null>(null);
	/** Bumps each customize open so the dialog remounts with a fresh qty/defaults. */
	customizeSession = $state(0);
	checkoutOpen = $state(false);
	checkoutPhase = $state<'review' | 'success' | 'failed'>('review');
	checkoutOrderId = $state<string | null>(null);
	/** Transient KHQR/card attempt during checkout — not persisted. */
	paymentAttempt = $state<PaymentAttempt | null>(null);
	heldOpen = $state(false);
	composeHold = $state(false);
	openOrdersOpen = $state(false);
	paying = $state(false);
	kitchenSoundEnabled = $state(true);
	/** Staff session for the login gate (separate from demo catalog persistence). */
	loggedIn = $state(false);
	private flashTimer = 0;
	private persistTimer = 0;
	private persistDirty = false;
	private cdsThanksTimer = 0;
	/** Monotonic stamp so kitchen/POS windows can take the newest shared state. */
	private writtenAt = 0;
	private applyingRemote = false;
	private stateChannel: BroadcastChannel | null = null;

	constructor() {
		const loaded = loadState();
		this.state = loaded.state;
		this.writtenAt = loaded.writtenAt;
		this.restoredNotice = loaded.restored;
		this.kitchenSoundEnabled = this.state.settings.kitchenSoundEnabled !== false;
		this.loggedIn = this.readAuthSession();
		if (typeof window !== 'undefined') {
			window.addEventListener('pagehide', () => this.flushPersist());
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') this.flushPersist();
				else this.pullSharedState();
			});
			window.addEventListener('storage', (event) => {
				if (event.key !== STORAGE_KEY || !event.newValue) return;
				this.applySharedBlob(event.newValue);
			});
			window.addEventListener('focus', () => this.pullSharedState());
			try {
				this.stateChannel = new BroadcastChannel(STATE_CHANNEL);
				this.stateChannel.onmessage = (event) => {
					const data = event.data as { type?: string; blob?: PersistedBlob } | null;
					if (data?.type !== 'state' || !data.blob) return;
					this.applySharedParsed(data.blob);
				};
			} catch {
				this.stateChannel = null;
			}
		}
	}

	/** Re-read POS/KDS shared state (second screen catch-up). */
	pullSharedState() {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) this.applySharedBlob(raw);
	}

	private applySharedBlob(raw: string) {
		const parsed = parsePersisted(raw);
		if (parsed) this.applySharedParsed(parsed);
	}

	private applySharedParsed(parsed: PersistedBlob) {
		const at = parsed.writtenAt ?? 0;
		if (at && at <= this.writtenAt) return;
		this.applyingRemote = true;
		try {
			this.state = normalizeState(parsed.state);
			this.writtenAt = at || Date.now();
			this.kitchenSoundEnabled = this.state.settings.kitchenSoundEnabled !== false;
			this.persistDirty = false;
			if (this.persistTimer) {
				clearTimeout(this.persistTimer);
				this.persistTimer = 0;
			}
			/** Success/checkout UI is window-local — drop it if the paid order was wiped (other tab reset). */
			this.dropStaleCheckoutUi();
		} finally {
			this.applyingRemote = false;
		}
	}

	/** Close payment-success / checkout chrome when its order no longer exists in state. */
	private dropStaleCheckoutUi() {
		const orderId = this.checkoutOrderId;
		const orderGone = !!orderId && !this.state.orders.some((item) => item.id === orderId);
		const successOrphan = this.checkoutPhase === 'success' && (!orderId || orderGone);
		if (!orderGone && !successOrphan) return;
		this.checkoutOpen = false;
		this.checkoutPhase = 'review';
		this.checkoutOrderId = null;
		this.paymentAttempt = null;
		clearTimeout(this.cdsThanksTimer);
		this.cdsThanksTimer = 0;
	}

	toggleKitchenSound() {
		this.kitchenSoundEnabled = !this.kitchenSoundEnabled;
		this.state.settings.kitchenSoundEnabled = this.kitchenSoundEnabled;
		this.persist();
	}

	flash(message: string) {
		const text = message.trim();
		if (!text) return;
		this.flashId += 1;
		this.flashMsg = text;
		clearTimeout(this.flashTimer);
		// Visible ~2.8s, then shell plays ~240ms outro while text is still buffered.
		this.flashTimer = window.setTimeout(() => {
			this.flashMsg = null;
		}, 2800);
	}

	ask(request: ConfirmRequest) {
		this.confirm = request;
	}

	dismissConfirm() {
		this.confirm = null;
	}

	acceptConfirm() {
		const action = this.confirm?.onYes;
		this.confirm = null;
		action?.();
	}

	/** Debounce writes so kitchen taps paint before localStorage stringify. */
	private persist() {
		if (typeof localStorage === 'undefined') return;
		this.persistDirty = true;
		if (this.persistTimer) return;
		this.persistTimer = window.setTimeout(() => this.flushPersist(), 150);
	}

	private flushPersist() {
		if (this.persistTimer) {
			clearTimeout(this.persistTimer);
			this.persistTimer = 0;
		}
		if (!this.persistDirty || typeof localStorage === 'undefined' || this.applyingRemote) return;
		try {
			const diskRaw = localStorage.getItem(STORAGE_KEY);
			const disk = diskRaw ? parsePersisted(diskRaw) : null;
			/** Another window already wrote newer state (e.g. Reset demo) — don't clobber it. */
			if (disk && (disk.writtenAt ?? 0) > this.writtenAt) {
				this.persistDirty = false;
				this.applySharedParsed(disk);
				return;
			}
			this.persistDirty = false;
			/**
			 * Do not merge a fuller disk cart over local state.
			 * That revived items after Clear (local 0 lines < disk) whenever the cart drawer was closed.
			 * Cross-window safety is the writtenAt check above — newer disk wins entirely.
			 */
			this.writtenAt = Date.now();
			const blob: PersistedBlob = {
				schemaVersion: 1,
				state: this.state,
				writtenAt: this.writtenAt
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
			try {
				this.stateChannel?.postMessage({ type: 'state', blob });
			} catch {
				/* ignore */
			}
		} catch {
			this.flash('storage_full');
		}
	}

	reset() {
		resetMockErp();
		clearTimeout(this.cdsThanksTimer);
		this.cdsThanksTimer = 0;
		clearTimeout(this.flashTimer);
		this.flashTimer = 0;
		this.flashMsg = null;
		this.confirm = null;
		this.restoredNotice = false;
		this.paymentAttempt = null;
		this.paying = false;
		this.logout();
		/** Clean demo start: menu/settings kept, sales + kitchen + sync queue cleared. */
		this.state = createSeedState(Date.now(), { sampleSales: false });
		this.posQuery = '';
		this.posCategory = 'all';
		this.cartOpen = false;
		this.heldOpen = false;
		this.openOrdersOpen = false;
		this.composeHold = false;
		this.checkoutOpen = false;
		this.checkoutPhase = 'review';
		this.checkoutOrderId = null;
		this.customizeProductId = null;
		this.editingLineId = null;
		this.persistDirty = true;
		this.flushPersist();
		clearCds({
			shopEn: this.state.settings.shopName.en,
			shopKh: this.state.settings.shopName.kh,
			taglineEn: this.state.settings.tagline.en,
			taglineKh: this.state.settings.tagline.kh,
			logoUrl: this.state.settings.receiptTemplate?.logoUrl || undefined
		});
		if (typeof location !== 'undefined') location.reload();
	}

	get staff() {
		return this.state.staff.find((person) => person.id === this.state.activeStaffId) ?? this.state.staff[0];
	}

	get role(): Role | undefined {
		return this.state.roles.find((item) => item.id === this.staff?.roleId);
	}

	can(permission: string): boolean {
		return !!this.role?.permissions.includes(permission);
	}

	get branch() {
		return this.state.branches.find((item) => item.id === this.state.activeBranchId) ?? this.state.branches[0];
	}

	get currentShift(): CashShift | undefined {
		return this.state.shifts.find(
			(shift) =>
				shift.status === 'OPEN' &&
				shift.staffId === this.state.activeStaffId &&
				shift.branchId === this.state.activeBranchId
		);
	}

	resolvedProduct(productId: string): Product | undefined {
		const product = this.state.products.find((item) => item.id === productId);
		if (!product) return undefined;
		return resolveProduct(product, this.state.activeBranchId);
	}

	cartTotals(): OrderTotals {
		const subtotal = this.state.cart.lines.reduce((sum, line) => sum + line.lineTotal, 0);
		const openId = this.state.cart.openOrderId;
		const openOrder = openId
			? this.state.orders.find((order) => order.id === openId && order.orderStatus === 'OPEN')
			: undefined;
		if (openOrder) {
			const frozenTax: TaxSetting = {
				id: 'frozen_open_tax',
				name: { ...openOrder.totals.taxName },
				rateBasisPoints: openOrder.totals.taxRateBasisPoints,
				calculationMode: openOrder.totals.taxMode,
				active: true
			};
			return priceCart(
				subtotal,
				this.state.cart.discountMode,
				this.state.cart.discountValue,
				frozenTax,
				openOrder.totals.usdToKhr
			);
		}
		const cartProducts = this.state.cart.lines
			.map((line) => this.state.products.find((product) => product.id === line.productId))
			.filter((product): product is Product => Boolean(product));
		const tax = resolveTaxForProducts(cartProducts, this.state.taxCategories, this.state.settings.tax);
		return priceCart(
			subtotal,
			this.state.cart.discountMode,
			this.state.cart.discountValue,
			tax,
			this.state.settings.usdToKhr
		);
	}

	get persistOpenOrdersEnabled() {
		return this.state.settings.persistOpenOrdersEnabled !== false;
	}

	/** Sync cart into the bound OPEN order (line snapshots + frozen tax/fx). */
	private syncOpenOrderFromCart() {
		const openId = this.state.cart.openOrderId;
		if (!openId) return;
		const order = this.state.orders.find((item) => item.id === openId && item.orderStatus === 'OPEN');
		if (!order) {
			this.state.cart.openOrderId = undefined;
			return;
		}
		order.lines = snapshotLinesForOpen(this.state.cart.lines, this.state.categories);
		order.totals = this.cartTotals();
		order.discountMode = this.state.cart.discountMode;
		order.discountValue = this.state.cart.discountValue;
		order.orderType = this.state.cart.orderType;
		order.tableId = this.state.cart.orderType === 'DINE_IN' ? this.state.cart.tableId : undefined;
		order.customerId = this.state.cart.customerId;
		order.note = this.state.cart.note || undefined;
		order.delivery =
			this.state.cart.orderType === 'DELIVERY' ? { ...this.state.cart.delivery } : undefined;
		order.paymentStatus = 'UNPAID';
	}

	setStaff(id: string) {
		const person = this.state.staff.find((item) => item.id === id && item.active);
		if (!person) return;
		this.state.activeStaffId = id;
		const allowed = staffBranchIds(person);
		if (allowed.length && !allowed.includes(this.state.activeBranchId)) {
			const nextBranch = this.state.branches.find((branch) => branch.active && allowed.includes(branch.id));
			if (nextBranch) this.state.activeBranchId = nextBranch.id;
		}
		const branchId = this.state.activeBranchId;
		if (
			this.state.cart.tableId &&
			!this.state.tables.some((table) => table.id === this.state.cart.tableId && table.branchId === branchId)
		) {
			this.state.cart.tableId = undefined;
		}
		this.persist();
	}

	private readAuthSession(): boolean {
		if (typeof localStorage === 'undefined') return false;
		try {
			const raw = localStorage.getItem(AUTH_KEY);
			if (!raw) return false;
			const parsed = JSON.parse(raw) as { staffId?: string };
			const staffId = parsed.staffId;
			if (!staffId) return false;
			const person = this.state.staff.find((item) => item.id === staffId && item.active);
			if (!person) {
				localStorage.removeItem(AUTH_KEY);
				return false;
			}
			if (this.state.activeStaffId !== staffId) this.setStaff(staffId);
			return true;
		} catch {
			return false;
		}
	}

	private writeAuthSession(staffId: string | null) {
		if (typeof localStorage === 'undefined') return;
		try {
			if (!staffId) {
				localStorage.removeItem(AUTH_KEY);
				return;
			}
			localStorage.setItem(AUTH_KEY, JSON.stringify({ staffId, at: Date.now() }));
		} catch {
			/* ignore */
		}
	}

	/** Clock-in: staff tile + PIN (demo). */
	login(staffId: string, pin: string): { ok: true } | { ok: false; code: 'staff' | 'pin' } {
		const person = this.state.staff.find((item) => item.id === staffId && item.active);
		if (!person) return { ok: false, code: 'staff' };
		const expected = String(person.loginPin || DEFAULT_LOGIN_PIN).replace(/\D/g, '');
		const given = String(pin).replace(/\D/g, '');
		if (!given || given !== expected) return { ok: false, code: 'pin' };
		this.setStaff(staffId);
		this.writeAuthSession(staffId);
		this.loggedIn = true;
		return { ok: true };
	}

	logout() {
		this.writeAuthSession(null);
		this.loggedIn = false;
		this.cartOpen = false;
		this.checkoutOpen = false;
		this.heldOpen = false;
		this.openOrdersOpen = false;
		this.customizeProductId = null;
		this.paymentAttempt = null;
	}

	setBranch(id: string) {
		const branch = this.state.branches.find((item) => item.id === id && item.active);
		if (!branch) return;
		const allowed = staffBranchIds(this.staff);
		if (allowed.length && !allowed.includes(id)) return;
		this.state.activeBranchId = id;
		if (this.state.cart.tableId && !this.state.tables.some((table) => table.id === this.state.cart.tableId && table.branchId === id)) {
			this.state.cart.tableId = undefined;
		}
		this.persist();
	}

	/** Active branches the current staff member may select. */
	staffBranches() {
		const allowed = new Set(staffBranchIds(this.staff));
		const active = this.state.branches.filter((branch) => branch.active);
		if (!allowed.size) return active;
		const matched = active.filter((branch) => allowed.has(branch.id));
		return matched.length ? matched : active;
	}

	setLink(link: 'online' | 'offline') {
		this.state.demoLink = link;
		this.persist();
	}

	setOrderType(orderType: OrderType) {
		this.state.cart.orderType = orderType;
		if (orderType !== 'DINE_IN') this.state.cart.tableId = undefined;
		this.syncOpenOrderFromCart();
		this.persist();
	}

	setTable(tableId: string) {
		this.state.cart.tableId = tableId;
		this.state.cart.orderType = 'DINE_IN';
		this.syncOpenOrderFromCart();
		this.persist();
	}

	setCustomer(customerId?: string) {
		this.state.cart.customerId = customerId;
		this.syncOpenOrderFromCart();
		this.persist();
	}

	setNote(note: string) {
		this.state.cart.note = note;
		this.syncOpenOrderFromCart();
		this.persist();
	}

	setDelivery(patch: Partial<DeliveryDetails>) {
		this.state.cart.delivery = { ...this.state.cart.delivery, ...patch };
		this.syncOpenOrderFromCart();
		this.persist();
	}

	setDiscount(mode: DiscountMode, value: number) {
		this.state.cart.discountMode = mode;
		this.state.cart.discountValue = value;
		this.syncOpenOrderFromCart();
		this.persist();
	}

	/**
	 * Cart line rules:
	 * - Product list / quick add (no replaceLineId): same product + modifiers + note → increase qty;
	 *   different modifiers → new line.
	 * - Cart/checkout Edit (replaceLineId): override that line in place (do not append a duplicate).
	 */
	private upsertLine(line: CartLine, replaceLineId?: string) {
		if (replaceLineId) {
			const idx = this.state.cart.lines.findIndex((row) => row.id === replaceLineId);
			if (idx >= 0) {
				const replaced: CartLine = { ...line, id: replaceLineId };
				const key = lineIdentity(replaced);
				let qty = replaced.quantity;
				const next: CartLine[] = [];
				for (let i = 0; i < this.state.cart.lines.length; i++) {
					const row = this.state.cart.lines[i];
					if (i === idx) {
						next.push(replaced);
						continue;
					}
					if (lineIdentity(row) === key) {
						qty += row.quantity;
						continue;
					}
					next.push(row);
				}
				const edited = next.find((row) => row.id === replaceLineId);
				if (edited) {
					edited.quantity = qty;
					edited.lineTotal = edited.unitPrice * edited.quantity;
				}
				this.state.cart.lines = next;
				this.syncOpenOrderFromCart();
				this.persist();
				this.publishCustomerDisplay('cart');
				return;
			}
		}

		const key = lineIdentity(line);
		const existing = this.state.cart.lines.find((row) => lineIdentity(row) === key);
		if (existing) {
			existing.quantity += line.quantity;
			existing.lineTotal = existing.unitPrice * existing.quantity;
		} else {
			this.state.cart.lines = [...this.state.cart.lines, line];
		}
		this.syncOpenOrderFromCart();
		this.persist();
		this.publishCustomerDisplay('cart');
	}

	addQuick(productId: string): 'ok' | 'unavailable' | 'needs_modifiers' | 'permission' {
		if (!this.can('pos')) return 'permission';
		const product = this.resolvedProduct(productId);
		if (!product || !product.active) return 'unavailable';
		if (!product.available) return 'unavailable';
		if (product.modifierGroupIds.length > 0) return 'needs_modifiers';
		this.upsertLine(makeLine(product, 1, []));
		return 'ok';
	}

	addConfigured(productId: string, optionIds: string[], note: string, quantity: number, replaceLineId?: string) {
		if (!this.can('pos')) return 'permission' as const;
		const product = this.resolvedProduct(productId);
		if (!product || !product.active || !product.available) return 'unavailable' as const;
		const visibleIds = optionIds.filter((id) => {
			if (id.startsWith('ice_') && product.modifierGroupIds.includes('mod_temp') && !optionIds.includes('temp_iced')) {
				return false;
			}
			return true;
		});
		const error = selectionError(product, this.state.modifierGroups, visibleIds);
		if (error) return error;
		const selected = selectionFrom(this.state.modifierGroups, visibleIds);
		this.upsertLine(makeLine(product, quantity, selected, note), replaceLineId);
		/** Caller closes the customize dialog (keeps close animation smooth). */
		return 'ok' as const;
	}

	openCustomize(productId: string, lineId?: string) {
		this.customizeProductId = productId;
		this.editingLineId = lineId ?? null;
		this.customizeSession += 1;
	}

	closeCustomize() {
		this.customizeProductId = null;
		this.editingLineId = null;
	}

	setQty(lineId: string, quantity: number) {
		if (quantity < 1) {
			this.removeLine(lineId);
			return;
		}
		const line = this.state.cart.lines.find((row) => row.id === lineId);
		if (!line) return;
		line.quantity = quantity;
		line.lineTotal = line.unitPrice * quantity;
		this.syncOpenOrderFromCart();
		this.persist();
		this.publishCustomerDisplay('cart');
	}

	removeLine(lineId: string) {
		this.state.cart.lines = this.state.cart.lines.filter((row) => row.id !== lineId);
		this.syncOpenOrderFromCart();
		this.persist();
		this.publishCustomerDisplay(this.state.cart.lines.length ? 'cart' : 'idle');
	}

	clearCart() {
		this.state.cart = emptyCart(this.state.settings.defaultOrderType);
		this.cartOpen = false;
		this.persist();
		this.publishCustomerDisplay('idle');
	}

	/** Opens the checkout right sheet; closes the cart drawer so only one panel shows. */
	openCheckout() {
		if (this.state.cart.lines.length === 0) return;
		this.cartOpen = false;
		this.checkoutPhase = 'review';
		this.checkoutOpen = true;
		this.paymentAttempt = null;
		this.publishCustomerDisplay('pay');
	}

	hold(reference: string) {
		if (!this.can('pos') || this.state.cart.lines.length === 0) return false;
		/** Holding abandons a bound OPEN check (cart becomes a new held draft). */
		const abandonOpenId = this.state.cart.openOrderId;
		const totals = this.cartTotals();
		const now = new Date().toISOString();
		const number = this.nextOrderNumber();
		const waitingNumber = this.nextWaitingNumber();
		const order: Order = {
			id: uid('ord'),
			orderNumber: number,
			waitingNumber,
			posTransactionId: crypto.randomUUID(),
			branchId: this.state.activeBranchId,
			warehouseId: this.branch.warehouseId,
			terminalId: this.state.settings.terminalId,
			cashierId: this.state.activeStaffId,
			customerId: this.state.cart.customerId,
			orderType: this.state.cart.orderType,
			tableId: this.state.cart.tableId,
			delivery: this.state.cart.orderType === 'DELIVERY' ? { ...this.state.cart.delivery } : undefined,
			lines: this.state.cart.lines.map((line) => cloneLine(line)),
			totals,
			discountMode: this.state.cart.discountMode,
			discountValue: this.state.cart.discountValue,
			orderStatus: 'HELD',
			paymentStatus: 'PENDING',
			syncStatus: 'LOCAL_ONLY',
			createdAt: now,
			note: this.state.cart.note,
			holdReference: reference.trim() || undefined,
			timeline: [{ at: now, code: 'held' }],
			source: 'POS'
		};
		if (abandonOpenId) {
			const open = this.state.orders.find((item) => item.id === abandonOpenId && item.orderStatus === 'OPEN');
			if (open) {
				open.orderStatus = 'CANCELLED';
				open.paymentStatus = 'CANCELLED';
				open.timeline = [...open.timeline, { at: now, code: 'cancelled', detail: 'held' }];
			}
		}
		this.state.orders = [order, ...this.state.orders];
		this.clearCart();
		return true;
	}

	resume(orderId: string) {
		const order = this.state.orders.find((item) => item.id === orderId && item.orderStatus === 'HELD');
		if (!order) return;
		this.state.cart = {
			lines: order.lines.map((line) => ({ ...cloneLine(line), id: crypto.randomUUID() })),
			orderType: order.orderType,
			tableId: order.tableId,
			customerId: order.customerId,
			discountMode: order.discountMode,
			discountValue: order.discountValue,
			note: order.note ?? '',
			delivery: order.delivery ?? { recipientName: '', phone: '', address: '', note: '' }
		};
		this.state.orders = this.state.orders.filter((item) => item.id !== orderId);
		this.heldOpen = false;
		this.persist();
	}

	cancelHeld(orderId: string) {
		const order = this.state.orders.find((item) => item.id === orderId && item.orderStatus === 'HELD');
		if (!order) return;
		order.orderStatus = 'CANCELLED';
		order.paymentStatus = 'CANCELLED';
		order.timeline = [...order.timeline, { at: new Date().toISOString(), code: 'cancelled' }];
		this.persist();
	}

	/**
	 * Persist cart as an unpaid OPEN check (or update the bound OPEN order).
	 * Does not set paymentStatus=FAILED. Feature-flagged for café regression.
	 */
	createOpenOrder(): { ok: true; orderId: string } | { ok: false; code: 'permission' | 'disabled' | 'empty' | 'table' | 'delivery' } {
		if (!this.can('pos')) return { ok: false, code: 'permission' };
		if (!this.persistOpenOrdersEnabled) return { ok: false, code: 'disabled' };
		if (this.state.cart.lines.length === 0) return { ok: false, code: 'empty' };
		if (this.state.cart.orderType === 'DINE_IN' && !this.state.cart.tableId) return { ok: false, code: 'table' };
		if (this.state.cart.orderType === 'DELIVERY') {
			const delivery = this.state.cart.delivery;
			if (!delivery.recipientName.trim() || !delivery.phone.trim()) return { ok: false, code: 'delivery' };
		}

		const now = new Date().toISOString();
		const existingId = this.state.cart.openOrderId;
		const existing = existingId
			? this.state.orders.find((item) => item.id === existingId && item.orderStatus === 'OPEN')
			: undefined;

		if (existing) {
			this.syncOpenOrderFromCart();
			this.clearCart();
			this.openOrdersOpen = false;
			return { ok: true, orderId: existing.id };
		}

		const totals = this.cartTotals();
		const number = this.nextOrderNumber();
		const waitingNumber = this.nextWaitingNumber();
		const lines = snapshotLinesForOpen(this.state.cart.lines, this.state.categories);
		const order: Order = {
			id: uid('ord'),
			orderNumber: number,
			waitingNumber,
			posTransactionId: crypto.randomUUID(),
			branchId: this.state.activeBranchId,
			warehouseId: this.branch.warehouseId,
			terminalId: this.state.settings.terminalId,
			cashierId: this.state.activeStaffId,
			customerId: this.state.cart.customerId,
			orderType: this.state.cart.orderType,
			tableId: this.state.cart.orderType === 'DINE_IN' ? this.state.cart.tableId : undefined,
			delivery: this.state.cart.orderType === 'DELIVERY' ? { ...this.state.cart.delivery } : undefined,
			lines,
			totals,
			discountMode: this.state.cart.discountMode,
			discountValue: this.state.cart.discountValue,
			orderStatus: 'OPEN',
			paymentStatus: 'UNPAID',
			syncStatus: 'LOCAL_ONLY',
			payments: [],
			refunds: [],
			refundedTotal: 0,
			createdAt: now,
			note: this.state.cart.note || undefined,
			timeline: [{ at: now, code: 'opened' }],
			source: 'POS'
		};
		this.state.orders = [order, ...this.state.orders];
		this.clearCart();
		this.openOrdersOpen = false;
		this.persist();
		return { ok: true, orderId: order.id };
	}

	loadOpenOrder(orderId: string): boolean {
		if (!this.persistOpenOrdersEnabled) return false;
		const order = this.state.orders.find((item) => item.id === orderId && item.orderStatus === 'OPEN');
		if (!order) return false;
		this.state.cart = {
			lines: order.lines.map((line) => cloneLine(line)),
			orderType: order.orderType,
			tableId: order.tableId,
			customerId: order.customerId,
			discountMode: order.discountMode,
			discountValue: order.discountValue,
			note: order.note ?? '',
			delivery: order.delivery ?? { recipientName: '', phone: '', address: '', note: '' },
			openOrderId: order.id
		};
		this.openOrdersOpen = false;
		this.cartOpen = true;
		this.persist();
		return true;
	}

	cancelOpenOrder(orderId: string) {
		const order = this.state.orders.find((item) => item.id === orderId && item.orderStatus === 'OPEN');
		if (!order) return;
		order.orderStatus = 'CANCELLED';
		order.paymentStatus = 'CANCELLED';
		order.timeline = [...order.timeline, { at: new Date().toISOString(), code: 'cancelled' }];
		if (this.state.cart.openOrderId === orderId) {
			this.state.cart = emptyCart(this.state.settings.defaultOrderType);
		}
		this.persist();
	}

	private nextOrderNumber(): string {
		let max = 1000;
		for (const order of this.state.orders) {
			const value = Number(order.orderNumber.replace(/\D/g, ''));
			if (Number.isFinite(value) && value > max) max = value;
		}
		return `CP-${max + 1}`;
	}

	/** Local calendar day key for daily waiting-token reset. */
	private localDayKey(iso = new Date().toISOString()): string {
		const d = new Date(iso);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	/** Short café pickup token — resets each local day (01, 02, …). */
	private nextWaitingNumber(): string {
		const today = this.localDayKey();
		let max = 0;
		for (const order of this.state.orders) {
			if (!order.waitingNumber) continue;
			if (this.localDayKey(order.createdAt) !== today) continue;
			const value = Number(String(order.waitingNumber).replace(/\D/g, ''));
			if (Number.isFinite(value) && value > max) max = value;
		}
		return String(max + 1).padStart(2, '0');
	}

	openCart() {
		this.cartOpen = true;
	}

	closeCart() {
		this.cartOpen = false;
	}

	pay(allocations: TenderAllocation[], simulate: 'success' | 'fail'): { ok: boolean; code: PayCode; orderId?: string } {
		if (this.paying) return { ok: false, code: 'busy' };
		if (!this.can('pos')) return { ok: false, code: 'permission' };
		if (this.state.cart.lines.length === 0) return { ok: false, code: 'empty' };
		const shift = this.currentShift;
		if (!shift) return { ok: false, code: 'no_shift' };
		if (this.state.cart.orderType === 'DINE_IN' && !this.state.cart.tableId) return { ok: false, code: 'table' };
		if (this.state.cart.orderType === 'DELIVERY') {
			const delivery = this.state.cart.delivery;
			if (!delivery.recipientName.trim() || !delivery.phone.trim()) return { ok: false, code: 'delivery' };
		}
		const totals = this.cartTotals();
		if (!allocations.length) return { ok: false, code: 'allocation' };
		const cleaned = allocations.filter((row) => row.amount > 0);
		if (!cleaned.length) return { ok: false, code: 'allocation' };
		const sum = cleaned.reduce((acc, row) => acc + row.amount, 0);
		if (sum !== totals.total) return { ok: false, code: 'allocation' };
		for (const row of cleaned) {
			const enabled = this.state.settings.paymentMethods.find((item) => item.method === row.method && item.enabled);
			if (!enabled) return { ok: false, code: 'method_disabled' };
			if (this.state.demoLink === 'offline' && row.method !== 'CASH') return { ok: false, code: 'offline_tender' };
			if (row.method === 'CASH') {
				const settled = settleMixedCash({
					appliedUsdCents: row.amount,
					receivedUsdCents: row.amountReceived ?? row.amount,
					receivedKhr: row.amountReceivedKhr ?? 0,
					usdToKhr: totals.usdToKhr
				});
				if (!settled.ok) return { ok: false, code: 'insufficient' };
			}
		}
		if (this.state.demoLink === 'offline' && totals.total > this.state.settings.offlineCashLimitCents) {
			return { ok: false, code: 'offline_limit' };
		}
		if (simulate === 'fail') {
			this.checkoutPhase = 'failed';
			return { ok: false, code: 'simulated_fail' };
		}

		this.paying = true;
		try {
			const now = new Date().toISOString();
			const openId = this.state.cart.openOrderId;
			const existingOpen =
				openId && this.persistOpenOrdersEnabled
					? this.state.orders.find((item) => item.id === openId && item.orderStatus === 'OPEN')
					: undefined;
			const number = existingOpen?.orderNumber ?? this.nextOrderNumber();
			const needsKitchen = this.state.cart.lines.some((line) => line.preparesInKitchen);
			const posTransactionId = existingOpen?.posTransactionId ?? crypto.randomUUID();
			const payments: Payment[] = cleaned.map((row) => {
				if (row.method === 'CASH') {
					const settled = settleMixedCash({
						appliedUsdCents: row.amount,
						receivedUsdCents: row.amountReceived ?? row.amount,
						receivedKhr: row.amountReceivedKhr ?? 0,
						usdToKhr: totals.usdToKhr
					});
					return {
						id: uid('pay'),
						method: row.method,
						status: 'PAID' as const,
						amount: row.amount,
						amountReceived: row.amountReceived ?? row.amount,
						amountReceivedKhr: row.amountReceivedKhr ?? 0,
						changeDue: settled.changeDueUsd,
						changeDueKhr: settled.changeDueKhr,
						usdToKhr: totals.usdToKhr,
						createdAt: now,
						demoReference: `TXN-${row.method}-${number}`
					};
				}
				return {
					id: uid('pay'),
					method: row.method,
					status: 'PAID' as const,
					amount: row.amount,
					amountReceived: row.amount,
					changeDue: 0,
					paidByApp: !!row.paidByApp,
					createdAt: now,
					demoReference: row.paidByApp
						? `APP-${this.state.cart.delivery.channel ?? 'OTHER'}-${number}`
						: `TXN-${row.method}-${number}`
				};
			});
			const paidLines = this.state.cart.lines.map((line) => {
				const cloned = cloneLine(line);
				if (!line.preparesInKitchen) {
					cloned.kitchenStatus = undefined;
				} else if (line.kitchenStatus && line.kitchenStatus !== 'UNSENT') {
					cloned.kitchenStatus = line.kitchenStatus;
				} else {
					cloned.kitchenStatus = 'NEW';
				}
				return cloned;
			});
			const hadPriorKitchen = this.state.cart.lines.some(
				(line) => line.preparesInKitchen && line.kitchenStatus && line.kitchenStatus !== 'UNSENT'
			);
			const kitchen: KitchenStatus | undefined = needsKitchen
				? paidLines.find((line) => line.preparesInKitchen)?.kitchenStatus ?? 'NEW'
				: undefined;
			const timeline: { at: string; code: TimelineCode }[] = [
				...(existingOpen?.timeline ?? []),
				{ at: now, code: 'paid' }
			];
			if (needsKitchen && !hadPriorKitchen) timeline.push({ at: now, code: 'kitchen_new' });
			else if (!needsKitchen) timeline.push({ at: now, code: 'completed' });
			const orderId = existingOpen?.id ?? uid('ord');
			const waitingNumber = existingOpen?.waitingNumber || this.nextWaitingNumber();
			const order: Order = {
				id: orderId,
				orderNumber: number,
				waitingNumber,
				posTransactionId,
				branchId: this.state.activeBranchId,
				warehouseId: this.branch.warehouseId,
				terminalId: this.state.settings.terminalId,
				cashierId: this.state.activeStaffId,
				shiftId: shift.id,
				customerId: this.state.cart.customerId,
				orderType: this.state.cart.orderType,
				tableId: this.state.cart.orderType === 'DINE_IN' ? this.state.cart.tableId : undefined,
				delivery: this.state.cart.orderType === 'DELIVERY' ? { ...this.state.cart.delivery } : undefined,
				lines: paidLines,
				totals,
				discountMode: this.state.cart.discountMode,
				discountValue: this.state.cart.discountValue,
				orderStatus: needsKitchen ? 'CONFIRMED' : 'COMPLETED',
				paymentStatus: 'PAID',
				kitchenStatus: kitchen,
				syncStatus: 'PENDING',
				payment: payments[0],
				payments,
				refunds: existingOpen?.refunds ?? [],
				refundedTotal: existingOpen?.refundedTotal ?? 0,
				createdAt: existingOpen?.createdAt ?? now,
				paidAt: now,
				completedAt: needsKitchen ? undefined : now,
				note: this.state.cart.note || undefined,
				receipt: this.buildReceiptSnapshot(),
				timeline,
				source: 'POS'
			};
			const outbox: OutboxRecord = {
				id: uid('ob'),
				eventType: 'SALE_FINALIZED',
				posTransactionId,
				orderId: order.id,
				orderNumber: number,
				state: 'PENDING',
				attemptCount: 0,
				createdAt: now
			};
			if (existingOpen) {
				this.state.orders = this.state.orders.map((item) => (item.id === order.id ? order : item));
			} else {
				this.state.orders = [order, ...this.state.orders];
			}
			this.state.outbox = [outbox, ...this.state.outbox];
			this.state.cart = emptyCart(this.state.settings.defaultOrderType);
			this.cartOpen = false;
			this.checkoutPhase = 'success';
			this.checkoutOrderId = order.id;
			this.paymentAttempt = null;
			this.publishCustomerDisplay('thanks');
			clearTimeout(this.cdsThanksTimer);
			this.cdsThanksTimer = window.setTimeout(() => this.publishCustomerDisplay('idle'), 8000);
			this.persist();
			return { ok: true, code: 'ok', orderId: order.id };
		} finally {
			this.paying = false;
		}
	}

	closeCheckout() {
		this.checkoutOpen = false;
		this.checkoutPhase = 'review';
		this.checkoutOrderId = null;
		this.paymentAttempt = null;
		this.publishCustomerDisplay(this.state.cart.lines.length ? 'cart' : 'idle');
		this.persist();
	}

	openCustomerScreen() {
		this.publishCustomerDisplay(this.checkoutOpen ? (this.checkoutPhase === 'success' ? 'thanks' : 'pay') : 'cart');
		openCustomerDisplayWindow();
	}

	publishCustomerDisplay(phase?: CdsPhase) {
		let nextPhase: CdsPhase = phase ?? 'cart';
		if (this.checkoutPhase === 'success') nextPhase = 'thanks';
		else if (this.checkoutOpen && this.checkoutPhase === 'review') nextPhase = 'pay';
		else if (!this.state.cart.lines.length && nextPhase !== 'thanks') nextPhase = 'idle';
		else if (!phase) nextPhase = 'cart';

		const openId = this.state.cart.openOrderId;
		const settled =
			this.checkoutOrderId != null
				? this.state.orders.find((item) => item.id === this.checkoutOrderId)
				: undefined;
		const openOrder = openId
			? this.state.orders.find((item) => item.id === openId)
			: settled;
		const useSettled = nextPhase === 'thanks' && settled;
		const sourceLines = useSettled ? settled.lines : this.state.cart.lines;
		const totals = useSettled
			? {
					subtotal: settled.totals.subtotal,
					discount: settled.totals.discount,
					tax: settled.totals.tax,
					total: settled.totals.total,
					totalKhr: settled.totals.totalKhr,
					usdToKhr: settled.totals.usdToKhr
				}
			: this.cartTotals();

		const featured = [...this.state.products]
			.filter((item) => item.active && item.available && item.imageUrl)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.slice(0, 8);
		const ads = featured.map((item) => ({
			id: item.id,
			imageUrl: item.imageUrl,
			titleEn: item.name.en,
			titleKh: item.name.kh,
			subtitleEn: this.state.settings.tagline.en,
			subtitleKh: this.state.settings.tagline.kh
		}));
		const logoUrl = this.state.settings.receiptTemplate?.logoUrl || undefined;
		const queue = buildCdsQueueBoard(this.state.orders, this.state.activeBranchId);
		publishCds({
			v: 1,
			at: Date.now(),
			phase: nextPhase,
			shopEn: this.state.settings.shopName.en,
			shopKh: this.state.settings.shopName.kh,
			taglineEn: this.state.settings.tagline.en,
			taglineKh: this.state.settings.tagline.kh,
			logoUrl,
			orderNumber: openOrder?.orderNumber ?? settled?.orderNumber,
			waitingNumber: openOrder?.waitingNumber ?? settled?.waitingNumber,
			lines: sourceLines.map((line) => ({
				id: line.id,
				nameEn: line.productName.en,
				nameKh: line.productName.kh,
				qty: line.quantity,
				unitPrice: line.unitPrice,
				lineTotal: line.lineTotal,
				modifiers: modifierSummaryText(line.selectedModifiers, (t) => t.en),
				modifiersKh: modifierSummaryText(line.selectedModifiers, (t) => t.kh || t.en),
				note: line.specialInstructions,
				imageUrl:
					line.productImageUrl ||
					this.state.products.find((product) => product.id === line.productId)?.imageUrl
			})),
			subtotal: totals.subtotal,
			discount: totals.discount,
			tax: totals.tax,
			total: totals.total,
			totalKhr: totals.totalKhr,
			usdToKhr: totals.usdToKhr,
			attemptLabel: this.paymentAttempt?.method,
			attemptStatus: this.paymentAttempt?.status === 'PENDING' || this.paymentAttempt?.status === 'FAILED' || this.paymentAttempt?.status === 'CONFIRMED'
				? this.paymentAttempt.status
				: '',
			qrImage:
				nextPhase === 'pay' &&
				this.paymentAttempt?.status === 'PENDING' &&
				this.paymentAttempt.qrImage
					? this.paymentAttempt.qrImage
					: '',
			qrString:
				nextPhase === 'pay' &&
				this.paymentAttempt?.status === 'PENDING' &&
				this.paymentAttempt.qrString
					? this.paymentAttempt.qrString
					: '',
			ads,
			queuePreparing: queue.preparing,
			queueReady: queue.ready
		});
	}

	/** Push KDS preparing/ready lists to CDS without clearing the active cart ticket. */
	publishKitchenQueueBoard() {
		const featured = [...this.state.products]
			.filter((item) => item.active && item.available && item.imageUrl)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.slice(0, 8);
		const ads = featured.map((item) => ({
			id: item.id,
			imageUrl: item.imageUrl,
			titleEn: item.name.en,
			titleKh: item.name.kh,
			subtitleEn: this.state.settings.tagline.en,
			subtitleKh: this.state.settings.tagline.kh
		}));
		const queue = buildCdsQueueBoard(this.state.orders, this.state.activeBranchId);
		publishCdsQueueBoard({
			preparing: queue.preparing,
			ready: queue.ready,
			shopEn: this.state.settings.shopName.en,
			shopKh: this.state.settings.shopName.kh,
			taglineEn: this.state.settings.tagline.en,
			taglineKh: this.state.settings.tagline.kh,
			logoUrl: this.state.settings.receiptTemplate?.logoUrl || undefined,
			ads
		});
	}

	startPaymentAttempt(
		method: PaymentMethod,
		amount: number,
		extras?: Partial<Pick<PaymentAttempt, 'provider' | 'tranId' | 'qrImage' | 'qrString'>>
	): PaymentAttempt | null {
		if (method === 'CASH') return null;
		if (this.state.demoLink === 'offline') return null;
		const now = new Date().toISOString();
		this.paymentAttempt = {
			id: uid('att'),
			method,
			amount: Math.round(amount),
			status: 'PENDING',
			createdAt: now,
			updatedAt: now,
			demoReference: `ATT-${method}-${Date.now().toString(36).toUpperCase()}`,
			provider: extras?.provider ?? 'demo',
			tranId: extras?.tranId,
			qrImage: extras?.qrImage,
			qrString: extras?.qrString
		};
		this.publishCustomerDisplay('pay');
		return this.paymentAttempt;
	}

	/** Attach ABA PayWay KHQR fields onto the current pending attempt. */
	attachPaywayToAttempt(fields: { tranId: string; qrImage?: string; qrString?: string }): boolean {
		if (!this.paymentAttempt || this.paymentAttempt.status !== 'PENDING') return false;
		this.paymentAttempt = {
			...this.paymentAttempt,
			provider: 'payway',
			tranId: fields.tranId,
			qrImage: fields.qrImage,
			qrString: fields.qrString,
			updatedAt: new Date().toISOString()
		};
		this.publishCustomerDisplay('pay');
		return true;
	}

	resolvePaymentAttempt(status: 'CONFIRMED' | 'FAILED'): boolean {
		if (!this.paymentAttempt || this.paymentAttempt.status !== 'PENDING') return false;
		this.paymentAttempt = {
			...this.paymentAttempt,
			status,
			updatedAt: new Date().toISOString()
		};
		this.publishCustomerDisplay('pay');
		return true;
	}

	verifyManagerPin(pin: string): boolean {
		if (!this.state.settings.managerPinEnabled) return true;
		return pin.trim() === String(this.state.settings.managerPin ?? '');
	}

	/** Ensure cart is bound to an OPEN check without clearing lines. */
	ensureOpenOrderBound(): { ok: true; orderId: string } | { ok: false; code: string } {
		if (!this.can('pos')) return { ok: false, code: 'permission' };
		if (!this.persistOpenOrdersEnabled) return { ok: false, code: 'disabled' };
		if (this.state.cart.lines.length === 0) return { ok: false, code: 'empty' };
		if (this.state.cart.orderType === 'DINE_IN' && !this.state.cart.tableId) return { ok: false, code: 'table' };
		if (this.state.cart.orderType === 'DELIVERY') {
			const delivery = this.state.cart.delivery;
			if (!delivery.recipientName.trim() || !delivery.phone.trim()) return { ok: false, code: 'delivery' };
		}
		const existingId = this.state.cart.openOrderId;
		const existing = existingId
			? this.state.orders.find((item) => item.id === existingId && item.orderStatus === 'OPEN')
			: undefined;
		if (existing) {
			this.syncOpenOrderFromCart();
			return { ok: true, orderId: existing.id };
		}
		const now = new Date().toISOString();
		const totals = this.cartTotals();
		const number = this.nextOrderNumber();
		const waitingNumber = this.nextWaitingNumber();
		const lines = snapshotLinesForOpen(this.state.cart.lines, this.state.categories);
		const order: Order = {
			id: uid('ord'),
			orderNumber: number,
			waitingNumber,
			posTransactionId: crypto.randomUUID(),
			branchId: this.state.activeBranchId,
			warehouseId: this.branch.warehouseId,
			terminalId: this.state.settings.terminalId,
			cashierId: this.state.activeStaffId,
			customerId: this.state.cart.customerId,
			orderType: this.state.cart.orderType,
			tableId: this.state.cart.orderType === 'DINE_IN' ? this.state.cart.tableId : undefined,
			delivery: this.state.cart.orderType === 'DELIVERY' ? { ...this.state.cart.delivery } : undefined,
			lines,
			totals,
			discountMode: this.state.cart.discountMode,
			discountValue: this.state.cart.discountValue,
			orderStatus: 'OPEN',
			paymentStatus: 'UNPAID',
			syncStatus: 'LOCAL_ONLY',
			payments: [],
			refunds: [],
			refundedTotal: 0,
			createdAt: now,
			note: this.state.cart.note || undefined,
			timeline: [{ at: now, code: 'opened' }],
			source: 'POS'
		};
		this.state.orders = [order, ...this.state.orders];
		this.state.cart.openOrderId = order.id;
		this.state.cart.lines = order.lines.map((line) => cloneLine(line));
		this.persist();
		this.publishCustomerDisplay('cart');
		return { ok: true, orderId: order.id };
	}

	/** Send UNSENT kitchen lines on the bound OPEN order (or create OPEN then send). */
	sendToKitchen(): { ok: boolean; code: string; orderId?: string } {
		if (!this.can('pos') && !this.can('kitchen')) return { ok: false, code: 'permission' };
		if (!this.state.cart.lines.some((line) => line.preparesInKitchen)) return { ok: false, code: 'empty' };
		const bound = this.ensureOpenOrderBound();
		if (!bound.ok) return { ok: false, code: bound.code };
		return this.sendOpenOrderKitchen(bound.orderId);
	}

	sendOpenOrderKitchen(orderId: string): { ok: boolean; code: string; orderId?: string } {
		const order = this.state.orders.find((item) => item.id === orderId && (item.orderStatus === 'OPEN' || item.orderStatus === 'SENT' || item.orderStatus === 'IN_PROGRESS'));
		if (!order) return { ok: false, code: 'empty' };
		const now = new Date().toISOString();
		let sent = 0;
		order.lines = order.lines.map((line) => {
			if (!line.preparesInKitchen) return line;
			if (line.kitchenStatus && line.kitchenStatus !== 'UNSENT') return line;
			sent += 1;
			return { ...line, kitchenStatus: 'NEW' as KitchenStatus };
		});
		if (!sent) return { ok: false, code: 'empty' };
		if (!order.waitingNumber) order.waitingNumber = this.nextWaitingNumber();
		order.kitchenStatus = 'NEW';
		if (order.orderStatus === 'OPEN') order.orderStatus = 'SENT';
		order.timeline = [...order.timeline, { at: now, code: 'kitchen_new' }];
		/** Mirror into cart if bound */
		if (this.state.cart.openOrderId === order.id) {
			this.state.cart.lines = order.lines.map((line) => cloneLine(line));
		}
		this.persist();
		this.publishCustomerDisplay('cart');
		return { ok: true, code: 'ok', orderId: order.id };
	}

	/** Pay only selected cart line ids; remaining lines stay in cart (split by lines). */
	paySelectedLines(
		lineIds: string[],
		allocations: TenderAllocation[],
		simulate: 'success' | 'fail' = 'success'
	): { ok: boolean; code: PayCode; orderId?: string } {
		if (!lineIds.length) return { ok: false, code: 'empty' };
		const keep = this.state.cart.lines.filter((line) => !lineIds.includes(line.id));
		const take = this.state.cart.lines.filter((line) => lineIds.includes(line.id));
		if (!take.length) return { ok: false, code: 'empty' };
		const saved = { ...this.state.cart, lines: this.state.cart.lines.map((l) => cloneLine(l)) };
		this.state.cart = { ...this.state.cart, lines: take, openOrderId: undefined };
		const result = this.pay(allocations, simulate);
		if (!result.ok) {
			this.state.cart = saved;
			return result;
		}
		this.state.cart = {
			...emptyCart(saved.orderType),
			lines: keep,
			tableId: saved.tableId,
			customerId: saved.customerId,
			discountMode: saved.discountMode,
			discountValue: saved.discountValue,
			note: saved.note,
			delivery: { ...saved.delivery },
			openOrderId: saved.openOrderId
		};
		this.syncOpenOrderFromCart();
		this.persist();
		return result;
	}

	private applyKitchenTimeline(order: Order, next: KitchenStatus) {
		const code: TimelineCode =
			next === 'NEW'
				? 'kitchen_new'
				: next === 'PREPARING'
					? 'kitchen_preparing'
					: next === 'READY'
						? 'kitchen_ready'
						: 'kitchen_completed';
		order.timeline = [...order.timeline, { at: new Date().toISOString(), code }];
		if (next === 'COMPLETED') {
			order.orderStatus = 'COMPLETED';
			order.completedAt = new Date().toISOString();
			order.timeline = [...order.timeline, { at: order.completedAt, code: 'completed' }];
		} else if (order.orderStatus === 'COMPLETED') {
			order.orderStatus = 'CONFIRMED';
			order.completedAt = undefined;
		}
	}

	kitchen(orderId: string, next: KitchenStatus) {
		if (!this.can('kitchen')) return false;
		const order = this.state.orders.find((item) => item.id === orderId);
		if (!order || !order.kitchenStatus) return false;
		const allowed: Record<KitchenStatus, KitchenStatus[]> = {
			UNSENT: [],
			NEW: ['PREPARING'],
			PREPARING: ['READY', 'NEW'],
			READY: ['COMPLETED', 'PREPARING'],
			COMPLETED: ['READY', 'PREPARING'],
			VOIDED: []
		};
		if (!allowed[order.kitchenStatus].includes(next)) return false;
		order.kitchenStatus = next;
		for (const line of order.lines) {
			if (line.preparesInKitchen && line.kitchenStatus !== 'VOIDED' && line.kitchenStatus !== 'UNSENT') {
				line.kitchenStatus = next;
			}
		}
		this.applyKitchenTimeline(order, next);
		this.persist();
		this.publishKitchenQueueBoard();
		return true;
	}

	kitchenLine(orderId: string, lineId: string, next: KitchenStatus) {
		if (!this.can('kitchen')) return false;
		const order = this.state.orders.find((item) => item.id === orderId);
		if (!order) return false;
		const line = order.lines.find((item) => item.id === lineId);
		if (!line?.preparesInKitchen) return false;
		if (line.kitchenStatus === 'UNSENT' || line.kitchenStatus === 'VOIDED') return false;
		const current = line.kitchenStatus ?? order.kitchenStatus ?? 'NEW';
		const allowed: Record<KitchenStatus, KitchenStatus[]> = {
			UNSENT: [],
			NEW: ['PREPARING', 'READY'],
			PREPARING: ['READY', 'NEW'],
			READY: ['COMPLETED', 'PREPARING'],
			COMPLETED: ['READY', 'PREPARING'],
			VOIDED: []
		};
		if (!allowed[current].includes(next)) return false;
		line.kitchenStatus = next;
		const aggregated = aggregateKitchen(order.lines);
		if (!aggregated) return false;
		const previous = order.kitchenStatus;
		order.kitchenStatus = aggregated;
		if (previous !== aggregated) this.applyKitchenTimeline(order, aggregated);
		this.persist();
		this.publishKitchenQueueBoard();
		return true;
	}

	refund(orderId: string, reason: string, amountCents?: number): RefundCode {
		if (!this.can('refund')) return 'permission';
		const order = this.state.orders.find((item) => item.id === orderId);
		if (!order) return 'invalid';
		if (!reason.trim()) return 'reason';
		const remaining = refundableRemaining(order);
		if (remaining <= 0) return 'invalid';
		const amount = amountCents == null ? remaining : Math.round(amountCents);
		if (!Number.isFinite(amount) || amount <= 0) return 'amount';
		if (amount > remaining) return 'amount';
		const slices = allocateRefundAcrossTenders(order, amount);
		if (!slices.length) return 'invalid';
		const now = new Date().toISOString();
		const kind = amount >= remaining ? 'FULL' : 'PARTIAL';
		const priorRefunded = typeof order.refundedTotal === 'number' ? order.refundedTotal : refundedTotal(order);
		order.refunds = [
			...(order.refunds ?? []),
			...slices.map((slice) => ({
				id: uid('rf'),
				amount: slice.amount,
				method: slice.method,
				kind: kind as 'FULL' | 'PARTIAL',
				reason: reason.trim(),
				staffId: this.state.activeStaffId,
				createdAt: now
			}))
		];
		order.refundedTotal = priorRefunded + amount;
		order.refundReason = reason.trim();
		if (order.refundedTotal >= order.totals.total) {
			order.paymentStatus = 'REFUNDED';
			for (const payment of orderPayments(order)) payment.status = 'REFUNDED';
			if (order.payment) order.payment.status = 'REFUNDED';
			order.timeline = [...order.timeline, { at: now, code: 'refunded', detail: reason.trim() }];
		} else {
			order.paymentStatus = 'PARTIAL_REFUND';
			order.timeline = [
				...order.timeline,
				{ at: now, code: 'partial_refund', detail: `${reason.trim()} (${amount})` }
			];
		}
		this.state.outbox = [
			{
				id: uid('ob'),
				eventType: 'REFUND_REQUESTED',
				posTransactionId: `${order.posTransactionId}:refund:${now}`,
				orderId: order.id,
				orderNumber: order.orderNumber,
				state: 'PENDING',
				attemptCount: 0,
				createdAt: now
			},
			...this.state.outbox
		];
		this.persist();
		return 'ok';
	}

	cancelPaid(orderId: string, reason: string): RefundCode {
		if (!this.can('refund') && !this.can('orders')) return 'permission';
		const order = this.state.orders.find((item) => item.id === orderId);
		if (!order) return 'invalid';
		if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL_REFUND') return 'invalid';
		if (order.orderStatus === 'CANCELLED') return 'invalid';
		if (!reason.trim()) return 'reason';
		const remaining = refundableRemaining(order);
		if (remaining > 0) {
			const refunded = this.refund(orderId, reason.trim(), remaining);
			if (refunded !== 'ok') return refunded;
		}
		const fresh = this.state.orders.find((item) => item.id === orderId);
		if (!fresh) return 'invalid';
		fresh.orderStatus = 'CANCELLED';
		fresh.cancelReason = reason.trim();
		if (fresh.paymentStatus !== 'REFUNDED') fresh.paymentStatus = 'CANCELLED';
		fresh.timeline = [...fresh.timeline, { at: new Date().toISOString(), code: 'cancelled', detail: reason.trim() }];
		this.persist();
		return 'ok';
	}

	syncOne(orderId: string, eventType: OutboxRecord['eventType'] = 'SALE_FINALIZED') {
		const order = this.state.orders.find((item) => item.id === orderId);
		const record = this.state.outbox.find((item) => item.orderId === orderId && item.eventType === eventType);
		if (!order || !record) return { ok: false as const, code: 'missing' };
		record.attemptCount += 1;
		const result = submitToMockErp({
			posTransactionId: record.posTransactionId,
			orderNumber: order.orderNumber,
			eventType,
			offline: this.state.demoLink === 'offline',
			existingErpId: record.erpTransactionId
		});
		if (!result.ok || !result.erpTransactionId) {
			record.lastErrorMessage = 'offline';
			this.persist();
			return { ok: false as const, code: 'offline' };
		}
		record.state = 'SYNCED';
		record.erpTransactionId = result.erpTransactionId;
		record.lastErrorMessage = undefined;
		if (eventType === 'SALE_FINALIZED') {
			order.syncStatus = 'SYNCED';
			order.erpTransactionId = result.erpTransactionId;
		}
		this.persist();
		return { ok: true as const, code: result.code === 'duplicate' ? 'duplicate' : 'synced', erpTransactionId: result.erpTransactionId };
	}

	syncAll() {
		const pending = this.state.outbox.filter((item) => item.state === 'PENDING' || item.state === 'FAILED');
		return pending.map((item) => this.syncOne(item.orderId, item.eventType));
	}

	saveProduct(input: Product & { id?: string }): 'ok' | 'name' | 'price' | 'category' | 'sku' | 'tax' | 'permission' {
		if (!this.can('products')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		if (!input.categoryId) return 'category';
		if (!Number.isFinite(input.basePrice) || input.basePrice < 0) return 'price';
		const taxCategoryId = input.taxCategoryId || this.state.settings.tax.id;
		if (!this.state.taxCategories.some((tax) => tax.id === taxCategoryId && tax.active)) return 'tax';
		let sku = input.sku.trim();
		if (!sku) {
			const base = input.name.en
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]+/g, '-')
				.replace(/^-|-$/g, '')
				.slice(0, 12);
			sku = base ? `CP-${base}` : `CP-${uid('SKU').slice(-6).toUpperCase()}`;
			let n = 2;
			while (this.state.products.some((item) => item.id !== input.id && item.sku.toLowerCase() === sku.toLowerCase())) {
				sku = `${base ? `CP-${base}` : 'CP-ITEM'}-${n}`;
				n += 1;
			}
		} else if (this.state.products.some((item) => item.id !== input.id && item.sku.toLowerCase() === sku.toLowerCase())) {
			return 'sku';
		}
		const erpItemId = (input.erpItemId || sku).trim();
		const imageUrl = input.imageUrl.trim();
		const sortOrder = Number.isFinite(input.sortOrder) ? Math.max(0, Math.round(input.sortOrder)) : this.state.products.length + 1;
		const branchOverrides = Array.isArray(input.branchOverrides) ? input.branchOverrides : [];
		const next: Product = {
			...input,
			id: input.id || uid('prd'),
			sku,
			erpItemId,
			imageUrl,
			taxCategoryId,
			sortOrder,
			branchOverrides,
			name: { en: input.name.en.trim(), kh: input.name.kh.trim() },
			description: { en: input.description.en.trim(), kh: input.description.kh.trim() }
		};
		if (input.id) {
			const index = this.state.products.findIndex((item) => item.id === input.id);
			if (index < 0) return 'name';
			this.state.products[index] = next;
		} else {
			this.state.products = [next, ...this.state.products];
		}
		this.persist();
		return 'ok';
	}

	setProductAvailability(productId: string, available: boolean): boolean {
		if (!this.can('products')) return false;
		const product = this.state.products.find((item) => item.id === productId);
		if (!product) return false;
		product.available = available;
		this.persist();
		return true;
	}

	setProductArchived(productId: string, archived: boolean): boolean {
		if (!this.can('products')) return false;
		const product = this.state.products.find((item) => item.id === productId);
		if (!product) return false;
		product.active = !archived;
		this.persist();
		return true;
	}

	saveTaxCategory(input: TaxSetting): 'ok' | 'name' | 'permission' {
		if (!this.can('settings')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		const next: TaxSetting = {
			...input,
			name: { en: input.name.en.trim(), kh: input.name.kh.trim() },
			rateBasisPoints: Math.max(0, Math.round(input.rateBasisPoints) || 0)
		};
		const index = this.state.taxCategories.findIndex((tax) => tax.id === input.id);
		if (index >= 0) this.state.taxCategories[index] = next;
		else this.state.taxCategories = [...this.state.taxCategories, next];
		if (this.state.settings.tax.id === next.id) this.state.settings.tax = { ...next };
		this.persist();
		return 'ok';
	}

	setDefaultTaxCategory(taxId: string): 'ok' | 'permission' | 'invalid' {
		if (!this.can('settings')) return 'permission';
		const tax = this.state.taxCategories.find((item) => item.id === taxId);
		if (!tax || !tax.active) return 'invalid';
		this.state.settings.tax = { ...tax, name: { ...tax.name } };
		this.persist();
		return 'ok';
	}

	saveCategory(input: Category): 'ok' | 'name' | 'permission' {
		if (!this.can('products')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		const sortOrder = Number.isFinite(input.sortOrder) ? Math.max(0, Math.round(input.sortOrder)) : this.state.categories.length + 1;
		const next = { ...input, name: { en: input.name.en.trim(), kh: input.name.kh.trim() }, sortOrder };
		const index = this.state.categories.findIndex((item) => item.id === input.id);
		if (index >= 0) this.state.categories[index] = next;
		else this.state.categories = [...this.state.categories, { ...next, id: input.id || uid('cat') }];
		this.state.categories = [...this.state.categories].sort((a, b) => a.sortOrder - b.sortOrder);
		this.persist();
		return 'ok';
	}

	saveModifierGroup(input: ModifierGroup): 'ok' | 'name' | 'options' | 'limits' | 'permission' {
		if (!this.can('products')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		const options = input.options.map((option, index) => ({
			...option,
			name: { en: option.name.en.trim(), kh: option.name.kh.trim() },
			priceDelta: Math.round(option.priceDelta) || 0,
			sortOrder: Number.isFinite(option.sortOrder) ? option.sortOrder : index + 1
		}));
		if (options.some((option) => !option.name.en || !option.name.kh)) return 'options';
		const activeOptions = options.filter((option) => option.active);
		if (input.active && activeOptions.length === 0) return 'options';
		let minSelections = Math.max(0, Math.round(Number(input.minSelections) || 0));
		let maxSelections = Math.max(0, Math.round(Number(input.maxSelections) || 0));
		if (input.selectionMode === 'SINGLE') {
			maxSelections = 1;
			if (input.required) minSelections = Math.max(minSelections, 1);
			else minSelections = Math.min(minSelections, 1);
		} else {
			if (maxSelections < 1) maxSelections = Math.max(activeOptions.length, 1);
			if (input.required) minSelections = Math.max(minSelections, 1);
			if (minSelections > maxSelections) return 'limits';
			if (maxSelections > activeOptions.length && activeOptions.length > 0) maxSelections = activeOptions.length;
		}
		if (minSelections > maxSelections) return 'limits';
		const next: ModifierGroup = {
			...input,
			name: { en: input.name.en.trim(), kh: input.name.kh.trim() },
			minSelections,
			maxSelections,
			options,
			sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : this.state.modifierGroups.length + 1
		};
		const index = this.state.modifierGroups.findIndex((item) => item.id === input.id);
		if (index >= 0) this.state.modifierGroups[index] = next;
		else this.state.modifierGroups = [...this.state.modifierGroups, { ...next, id: input.id || uid('mod') }];
		this.state.modifierGroups = [...this.state.modifierGroups].sort((a, b) => a.sortOrder - b.sortOrder);
		this.persist();
		return 'ok';
	}

	saveCustomer(input: Customer): 'ok' | 'name' | 'phone' | 'email' | 'permission' {
		if (!this.can('customers') && !this.can('pos')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		const phone = input.phone?.trim() || undefined;
		const email = input.email?.trim() || undefined;
		if (phone && phone.replace(/\D/g, '').length < 6) return 'phone';
		if (email && !email.includes('@')) return 'email';
		const next: Customer = {
			...input,
			name: { en: input.name.en.trim(), kh: input.name.kh.trim() },
			phone,
			email,
			notes: input.notes?.trim() || undefined,
			active: Boolean(input.active)
		};
		const index = this.state.customers.findIndex((item) => item.id === input.id);
		if (index >= 0) this.state.customers[index] = next;
		else {
			this.state.customers = [
				{ ...next, id: input.id || uid('cus'), createdAt: input.createdAt || new Date().toISOString() },
				...this.state.customers
			];
		}
		if (!next.active && this.state.cart.customerId === next.id) this.state.cart.customerId = undefined;
		this.persist();
		return 'ok';
	}

	saveStaff(input: StaffMember): 'ok' | 'name' | 'permission' | 'branch' {
		if (!this.can('staff')) return 'permission';
		if (!input.name.en.trim() || !input.name.kh.trim()) return 'name';
		const branchIds = [...new Set((input.branchIds ?? []).map((id) => id.trim()).filter(Boolean))];
		if (!branchIds.length) return 'branch';
		const pin = String(input.loginPin ?? '').replace(/\D/g, '').slice(0, 4);
		const next: StaffMember = {
			...input,
			id: input.id || uid('stf'),
			name: { en: input.name.en.trim(), kh: input.name.kh.trim() },
			branchIds,
			phone: input.phone?.trim() || undefined,
			loginPin: pin.length === 4 ? pin : DEFAULT_LOGIN_PIN
		};
		const index = this.state.staff.findIndex((item) => item.id === next.id);
		if (index >= 0) {
			this.state.staff = this.state.staff.map((item, i) => (i === index ? next : item));
		} else {
			this.state.staff = [...this.state.staff, next];
		}
		this.persist();
		return 'ok';
	}

	saveRole(role: Role): 'ok' | 'name' | 'permission' {
		if (!this.can('staff')) return 'permission';
		if (!role.name.en.trim() || !role.name.kh.trim()) return 'name';
		const next: Role = {
			...role,
			id: role.id || uid('role'),
			name: { en: role.name.en.trim(), kh: role.name.kh.trim() },
			permissions: [...new Set(role.permissions)]
		};
		const index = this.state.roles.findIndex((item) => item.id === next.id);
		if (index >= 0) {
			this.state.roles = this.state.roles.map((item, i) => (i === index ? next : item));
		} else {
			this.state.roles = [...this.state.roles, next];
		}
		this.persist();
		return 'ok';
	}

	openShift(openingCash: number, note: string): 'ok' | 'duplicate' | 'amount' | 'permission' {
		if (!this.can('shifts')) return 'permission';
		if (this.currentShift) return 'duplicate';
		if (!Number.isFinite(openingCash) || openingCash < 0) return 'amount';
		const shift: CashShift = {
			id: uid('sh'),
			staffId: this.state.activeStaffId,
			branchId: this.state.activeBranchId,
			openingCash: Math.round(openingCash),
			openedAt: new Date().toISOString(),
			status: 'OPEN',
			note: note.trim() || undefined,
			movements: []
		};
		this.state.shifts = [shift, ...this.state.shifts];
		this.persist();
		return 'ok';
	}

	cashMove(type: 'CASH_IN' | 'CASH_OUT', amount: number, reason: string): 'ok' | 'closed' | 'amount' | 'reason' | 'permission' {
		if (!this.can('shifts')) return 'permission';
		const shift = this.currentShift;
		if (!shift) return 'closed';
		if (!Number.isFinite(amount) || amount <= 0) return 'amount';
		if (!reason.trim()) return 'reason';
		shift.movements = [
			...shift.movements,
			{
				id: uid('mv'),
				type,
				amount: Math.round(amount),
				reason: reason.trim(),
				createdAt: new Date().toISOString(),
				staffId: this.state.activeStaffId
			}
		];
		this.persist();
		return 'ok';
	}

	closeShift(countedCash: number): 'ok' | 'closed' | 'amount' | 'permission' {
		if (!this.can('shifts')) return 'permission';
		const shift = this.currentShift;
		if (!shift) return 'closed';
		if (!Number.isFinite(countedCash) || countedCash < 0) return 'amount';
		const figures = shiftFigures(shift, this.state.orders);
		const counted = Math.round(countedCash);
		const closedAt = new Date().toISOString();
		const mine = this.state.orders.filter(
			(order) => order.shiftId === shift.id && orderPayments(order).length > 0 && order.orderStatus !== 'HELD'
		);
		const byMethodMap = new Map<PaymentMethod, { applied: number; count: number }>();
		let cashReceived = 0;
		let cashChange = 0;
		for (const order of mine) {
			if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL_REFUND' && order.paymentStatus !== 'REFUNDED') {
				continue;
			}
			for (const pay of orderPayments(order)) {
				const cur = byMethodMap.get(pay.method) ?? { applied: 0, count: 0 };
				cur.applied += pay.amount;
				cur.count += 1;
				byMethodMap.set(pay.method, cur);
				if (pay.method === 'CASH') {
					cashReceived += pay.amountReceived ?? pay.amount;
					cashChange += pay.changeDue ?? 0;
				}
			}
		}
		const cashRefunds = mine.reduce((sum, order) => sum + cashRefunded(order), 0);
		const report: ShiftClosingReport = {
			closedAt,
			staffId: shift.staffId,
			branchId: shift.branchId,
			openingCash: shift.openingCash,
			countedCash: counted,
			expectedCash: figures.expected,
			overShort: counted - figures.expected,
			cashSales: figures.cashSales,
			nonCashSales: figures.nonCashSales,
			cashReceived,
			cashChange,
			cashRefunds,
			byMethod: [...byMethodMap.entries()].map(([method, row]) => ({ method, ...row })),
			movements: shift.movements.map((row) => ({ ...row })),
			orderCount: mine.length
		};
		shift.countedCash = counted;
		shift.expectedCash = figures.expected;
		shift.cashSales = figures.cashSales;
		shift.nonCashSales = figures.nonCashSales;
		shift.closedAt = closedAt;
		shift.status = 'CLOSED';
		shift.closingReport = report;
		this.persist();
		return 'ok';
	}

	private buildReceiptSnapshot() {
		const tpl = normalizeReceiptTemplate(this.state.settings.receiptTemplate, this.state.settings);
		return {
			shopName: { ...this.state.settings.shopName },
			tagline: { ...this.state.settings.tagline },
			address: { ...this.branch.address },
			phone: this.branch.phone,
			taxId: this.state.settings.taxId || tpl.vattin,
			footer: { ...this.state.settings.receiptFooter },
			branchName: { ...this.branch.name },
			cashierName: { ...this.staff.name },
			paper: tpl.paper,
			docType: tpl.docType,
			language: tpl.language,
			logoUrl: tpl.logoUrl || undefined,
			qrUrl: tpl.qrUrl || undefined,
			vatRegistered: tpl.vatRegistered,
			vattin: tpl.vattin || undefined,
			show: { ...tpl.show }
		};
	}

	updateReceiptTemplate(template: ReceiptTemplateSettings) {
		if (!this.can('settings')) return false;
		const next = normalizeReceiptTemplate(template, this.state.settings);
		this.state.settings.receiptTemplate = next;
		this.state.settings.paper = next.paper;
		if (next.vattin) this.state.settings.taxId = next.vattin;
		this.persist();
		return true;
	}

	updateSettings(patch: Partial<DemoAppState['settings']>) {
		if (!this.can('settings')) return false;
		const next = { ...this.state.settings, ...patch };
		if (next.usdToKhr <= 0) return false;
		if (next.tax.rateBasisPoints < 0 || next.tax.rateBasisPoints > 10000) return false;
		const enabled = next.paymentMethods.filter((item) => item.enabled).length;
		if (enabled === 0) return false;
		if (patch.receiptTemplate || !next.receiptTemplate) {
			next.receiptTemplate = normalizeReceiptTemplate(next.receiptTemplate, next);
			next.paper = next.receiptTemplate.paper;
		}
		this.state.settings = next;
		if (patch.tax) {
			const index = this.state.taxCategories.findIndex((tax) => tax.id === next.tax.id);
			if (index >= 0) this.state.taxCategories[index] = { ...next.tax };
			else this.state.taxCategories = [...this.state.taxCategories, { ...next.tax }];
		}
		this.persist();
		return true;
	}

	saveBranch(branch: DemoAppState['branches'][number]): boolean {
		if (!this.can('settings')) return false;
		const next = {
			...branch,
			name: { en: branch.name.en.trim(), kh: branch.name.kh.trim() },
			address: { en: branch.address.en.trim(), kh: branch.address.kh.trim() },
			phone: branch.phone.trim(),
			warehouseId: branch.warehouseId.trim()
		};
		if (!next.name.en || !next.name.kh) return false;
		const index = this.state.branches.findIndex((item) => item.id === next.id);
		if (index >= 0) {
			// Keep at least the active header branch usable.
			if (!next.active && next.id === this.state.activeBranchId) return false;
			this.state.branches[index] = next;
		} else {
			this.state.branches = [...this.state.branches, next];
		}
		this.persist();
		return true;
	}

	saveTable(table: DemoAppState['tables'][number]) {
		if (!this.can('settings')) return;
		const index = this.state.tables.findIndex((item) => item.id === table.id);
		if (index >= 0) this.state.tables[index] = table;
		else this.state.tables = [...this.state.tables, { ...table, id: table.id || uid('tbl') }];
		this.persist();
	}

	editingDefaults(product: Product): string[] {
		if (!this.editingLineId) return defaultOptionIds(product, this.state.modifierGroups);
		const line = this.state.cart.lines.find((item) => item.id === this.editingLineId);
		return line ? line.selectedModifiers.map((item) => item.optionId) : defaultOptionIds(product, this.state.modifierGroups);
	}
}

export const demo = new DemoApp();

export function pendingSyncCount(): number {
	return demo.state.outbox.filter((item) => item.state === 'PENDING' || item.state === 'FAILED').length;
}
