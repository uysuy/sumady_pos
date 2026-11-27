import {
	allocateOrderLines,
	filterSaleOrders,
	modifierLabelEn,
	modifierSignature,
	orderMoney,
	paidStamp,
	rangeBounds,
	sumMoney,
	type MoneyBreakdown,
	type ReportFilters
} from './report-core.ts';
import type { LocaleText, Order, PaymentMethod } from './types.ts';
import { orderPayments } from './order-payments.ts';

export type SalesDetailRow = {
	orderId: string;
	orderNumber: string;
	paidAt: string;
	branchId: string;
	cashierId: string;
	itemCount: number;
	gross: number;
	discounts: number;
	tax: number;
	ticketTotal: number;
	refunds: number;
	collected: number;
	paymentStatus: Order['paymentStatus'];
	methods: PaymentMethod[];
};

export type ProductSalesRow = {
	key: string;
	productId: string;
	name: LocaleText;
	qty: number;
	gross: number;
	discounts: number;
	refunds: number;
	net: number;
	orderIds: string[];
};

export type CategorySalesRow = {
	categoryId: string;
	qty: number;
	gross: number;
	discounts: number;
	refunds: number;
	net: number;
};

export type VariantSalesRow = ProductSalesRow & {
	variantKey: string;
	modifiers: string;
};

export type ModifierSalesRow = {
	groupId: string;
	optionId: string;
	groupName: LocaleText;
	optionName: LocaleText;
	qty: number;
	deltaRevenue: number;
};

export type HourSalesRow = {
	hour: number;
	label: string;
	orderCount: number;
	gross: number;
	collected: number;
};

export type CashierSalesRow = {
	cashierId: string;
	orderCount: number;
	gross: number;
	discounts: number;
	refunds: number;
	collected: number;
};

export type BranchSalesRow = {
	branchId: string;
	orderCount: number;
	gross: number;
	discounts: number;
	refunds: number;
	collected: number;
};

export type SalesReportBundle = {
	orders: Order[];
	totals: MoneyBreakdown;
	detail: SalesDetailRow[];
	byProduct: ProductSalesRow[];
	byCategory: CategorySalesRow[];
	byVariant: VariantSalesRow[];
	byModifier: ModifierSalesRow[];
	byHour: HourSalesRow[];
	byCashier: CashierSalesRow[];
	byBranch: BranchSalesRow[];
	byPayment: { method: PaymentMethod; total: number; count: number }[];
	series: { label: string; total: number }[];
};

function detailRows(orders: Order[]): SalesDetailRow[] {
	return orders
		.map((order) => {
			const money = orderMoney(order);
			return {
				orderId: order.id,
				orderNumber: order.orderNumber,
				paidAt: order.paidAt ?? order.createdAt,
				branchId: order.branchId,
				cashierId: order.cashierId,
				itemCount: order.lines.reduce((s, l) => s + l.quantity, 0),
				gross: money.gross,
				discounts: money.discounts,
				tax: money.tax,
				ticketTotal: money.ticketTotal,
				refunds: money.refunds,
				collected: money.collected,
				paymentStatus: order.paymentStatus,
				methods: [...new Set(orderPayments(order).map((p) => p.method))]
			};
		})
		.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

function productAndVariant(orders: Order[]): { byProduct: ProductSalesRow[]; byVariant: VariantSalesRow[] } {
	const productMap = new Map<string, ProductSalesRow>();
	const variantMap = new Map<string, VariantSalesRow>();

	for (const order of orders) {
		for (const allocated of allocateOrderLines(order)) {
			const { line, gross, discount, refund, net } = allocated;
			const product = productMap.get(line.productId) ?? {
				key: line.productId,
				productId: line.productId,
				name: line.productName,
				qty: 0,
				gross: 0,
				discounts: 0,
				refunds: 0,
				net: 0,
				orderIds: []
			};
			product.qty += line.quantity;
			product.gross += gross;
			product.discounts += discount;
			product.refunds += refund;
			product.net += net;
			if (!product.orderIds.includes(order.id)) product.orderIds.push(order.id);
			productMap.set(line.productId, product);

			const sig = modifierSignature(line);
			const variantKey = `${line.productId}::${sig || 'base'}`;
			const variant = variantMap.get(variantKey) ?? {
				key: variantKey,
				productId: line.productId,
				name: line.productName,
				variantKey,
				modifiers: modifierLabelEn(line) || 'Base',
				qty: 0,
				gross: 0,
				discounts: 0,
				refunds: 0,
				net: 0,
				orderIds: []
			};
			variant.qty += line.quantity;
			variant.gross += gross;
			variant.discounts += discount;
			variant.refunds += refund;
			variant.net += net;
			if (!variant.orderIds.includes(order.id)) variant.orderIds.push(order.id);
			variantMap.set(variantKey, variant);
		}
	}

	const byProduct = [...productMap.values()].sort((a, b) => b.net - a.net || b.qty - a.qty);
	const byVariant = [...variantMap.values()].sort((a, b) => b.net - a.net || b.qty - a.qty);
	return { byProduct, byVariant };
}

function categoryRows(orders: Order[]): CategorySalesRow[] {
	const map = new Map<string, CategorySalesRow>();
	for (const order of orders) {
		for (const allocated of allocateOrderLines(order)) {
			const { line, gross, discount, refund, net } = allocated;
			const row = map.get(line.categoryId) ?? {
				categoryId: line.categoryId,
				qty: 0,
				gross: 0,
				discounts: 0,
				refunds: 0,
				net: 0
			};
			row.qty += line.quantity;
			row.gross += gross;
			row.discounts += discount;
			row.refunds += refund;
			row.net += net;
			map.set(line.categoryId, row);
		}
	}
	return [...map.values()].sort((a, b) => b.net - a.net);
}

function modifierRows(orders: Order[]): ModifierSalesRow[] {
	const map = new Map<string, ModifierSalesRow>();
	for (const order of orders) {
		for (const line of order.lines) {
			for (const mod of line.selectedModifiers) {
				const key = `${mod.groupId}:${mod.optionId}`;
				const row = map.get(key) ?? {
					groupId: mod.groupId,
					optionId: mod.optionId,
					groupName: mod.groupName,
					optionName: mod.optionName,
					qty: 0,
					deltaRevenue: 0
				};
				row.qty += line.quantity;
				row.deltaRevenue += mod.priceDelta * line.quantity;
				map.set(key, row);
			}
		}
	}
	return [...map.values()].sort((a, b) => b.deltaRevenue - a.deltaRevenue || b.qty - a.qty);
}

function hourRows(orders: Order[]): HourSalesRow[] {
	const map = new Map<number, HourSalesRow>();
	for (let hour = 0; hour < 24; hour += 1) {
		map.set(hour, {
			hour,
			label: `${String(hour).padStart(2, '0')}:00`,
			orderCount: 0,
			gross: 0,
			collected: 0
		});
	}
	for (const order of orders) {
		const hour = new Date(order.paidAt ?? order.createdAt).getHours();
		const row = map.get(hour)!;
		const money = orderMoney(order);
		row.orderCount += 1;
		row.gross += money.gross;
		row.collected += money.collected;
	}
	return [...map.values()].filter((row) => row.orderCount > 0 || (row.hour >= 6 && row.hour <= 22));
}

function cashierRows(orders: Order[]): CashierSalesRow[] {
	const map = new Map<string, CashierSalesRow>();
	for (const order of orders) {
		const money = orderMoney(order);
		const row = map.get(order.cashierId) ?? {
			cashierId: order.cashierId,
			orderCount: 0,
			gross: 0,
			discounts: 0,
			refunds: 0,
			collected: 0
		};
		row.orderCount += 1;
		row.gross += money.gross;
		row.discounts += money.discounts;
		row.refunds += money.refunds;
		row.collected += money.collected;
		map.set(order.cashierId, row);
	}
	return [...map.values()].sort((a, b) => b.collected - a.collected);
}

function branchRows(orders: Order[]): BranchSalesRow[] {
	const map = new Map<string, BranchSalesRow>();
	for (const order of orders) {
		const money = orderMoney(order);
		const row = map.get(order.branchId) ?? {
			branchId: order.branchId,
			orderCount: 0,
			gross: 0,
			discounts: 0,
			refunds: 0,
			collected: 0
		};
		row.orderCount += 1;
		row.gross += money.gross;
		row.discounts += money.discounts;
		row.refunds += money.refunds;
		row.collected += money.collected;
		map.set(order.branchId, row);
	}
	return [...map.values()].sort((a, b) => b.collected - a.collected);
}

function paymentRows(orders: Order[]): { method: PaymentMethod; total: number; count: number }[] {
	const map = new Map<PaymentMethod, { total: number; count: number }>();
	for (const order of orders) {
		for (const tender of orderPayments(order)) {
			const row = map.get(tender.method) ?? { total: 0, count: 0 };
			row.total += tender.amount;
			row.count += 1;
			map.set(tender.method, row);
		}
	}
	return [...map.entries()].map(([method, row]) => ({ method, ...row }));
}

function seriesFromOrders(orders: Order[], start: number, end: number): { label: string; total: number }[] {
	const span = end - start;
	if (span <= 36 * 60 * 60 * 1000) {
		return hourRows(orders)
			.filter((row) => row.orderCount > 0 || (row.hour >= 7 && row.hour <= 21))
			.map((row) => ({ label: row.label, total: row.collected }));
	}
	const byDay = new Map<string, number>();
	for (const order of orders) {
		const d = new Date(paidStamp(order));
		const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
		const label = `${d.getMonth() + 1}/${d.getDate()}`;
		byDay.set(key, (byDay.get(key) ?? 0) + orderMoney(order).collected);
		void label;
	}
	const series: { label: string; total: number }[] = [];
	const cursor = new Date(start);
	cursor.setHours(0, 0, 0, 0);
	while (cursor.getTime() <= end) {
		const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
		series.push({
			label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
			total: byDay.get(key) ?? 0
		});
		cursor.setDate(cursor.getDate() + 1);
	}
	return series;
}

export function buildSalesReports(orders: Order[], filters: ReportFilters, now = new Date()): SalesReportBundle {
	const saleOrders = filterSaleOrders(orders, filters, now);
	const totals = sumMoney(saleOrders.map(orderMoney));
	const { byProduct, byVariant } = productAndVariant(saleOrders);
	const { start, end } = rangeBounds(filters.range, filters.from, filters.to, now);

	return {
		orders: saleOrders,
		totals,
		detail: detailRows(saleOrders),
		byProduct,
		byCategory: categoryRows(saleOrders),
		byVariant,
		byModifier: modifierRows(saleOrders),
		byHour: hourRows(saleOrders),
		byCashier: cashierRows(saleOrders),
		byBranch: branchRows(saleOrders),
		byPayment: paymentRows(saleOrders),
		series: seriesFromOrders(saleOrders, start, end)
	};
}
