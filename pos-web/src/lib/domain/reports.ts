import {
	cashRefunded,
	nonCashRefunded,
	orderCashApplied,
	orderNonCashApplied,
	orderPayments
} from './order-payments.ts';
import {
	isSaleOrder,
	orderMoney,
	paidStamp,
	sumMoney,
	type ReportFilters
} from './report-core.ts';
import { buildSalesReports } from './sales-reports.ts';
import type { CashShift, Order, SalesSummary } from './types.ts';

export type { RangeKey, ReportFilters } from './report-core.ts';
export { rangeBounds, filterSaleOrders, emptyFilters } from './report-core.ts';
export { buildSalesReports } from './sales-reports.ts';

/** Summary shape used by the dashboard tab. Prefer `buildSalesReports` for new screens. */
export function summarize(
	orders: Order[],
	branchId: string,
	start: number,
	end: number
): SalesSummary {
	const saleOrders = orders.filter((order) => {
		if (branchId && order.branchId !== branchId) return false;
		if (!isSaleOrder(order)) return false;
		const stamp = paidStamp(order);
		return stamp >= start && stamp <= end;
	});

	const totals = sumMoney(saleOrders.map(orderMoney));
	const allWindow = buildSalesReports(saleOrders, {
		range: 'custom',
		from: '',
		to: '',
		branchId: '',
		cashierId: ''
	} satisfies ReportFilters);

	const span = end - start;
	const series: { label: string; total: number }[] = [];
	if (span <= 36 * 60 * 60 * 1000) {
		for (let hour = 0; hour < 24; hour += 1) {
			const total = saleOrders
				.filter((order) => new Date(order.paidAt ?? order.createdAt).getHours() === hour)
				.reduce((sum, order) => sum + orderMoney(order).collected, 0);
			if (total > 0 || (hour >= 7 && hour <= 21)) {
				series.push({ label: `${String(hour).padStart(2, '0')}:00`, total });
			}
		}
	} else {
		const byDay = new Map<string, { label: string; total: number }>();
		for (const order of saleOrders) {
			const d = new Date(order.paidAt ?? order.createdAt);
			const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
			const label = `${d.getMonth() + 1}/${d.getDate()}`;
			const prev = byDay.get(key) ?? { label, total: 0 };
			prev.total += orderMoney(order).collected;
			byDay.set(key, prev);
		}
		const cursor = new Date(start);
		cursor.setHours(0, 0, 0, 0);
		while (cursor.getTime() <= end) {
			const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
			series.push({
				label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
				total: byDay.get(key)?.total ?? 0
			});
			cursor.setDate(cursor.getDate() + 1);
		}
	}

	const best = allWindow.byProduct[0]
		? { name: allWindow.byProduct[0].name, qty: allWindow.byProduct[0].qty }
		: null;

	return {
		gross: totals.gross,
		discounts: totals.discounts,
		tax: totals.tax,
		net: totals.ticketTotal,
		refunds: totals.refunds,
		collected: totals.collected,
		orderCount: totals.orderCount,
		average: totals.average,
		best,
		byCategory: allWindow.byCategory.map((row) => ({
			categoryId: row.categoryId,
			total: row.net,
			qty: row.qty
		})),
		byPayment: allWindow.byPayment,
		topProducts: allWindow.byProduct.slice(0, 5).map((row) => ({
			productId: row.productId,
			name: row.name,
			qty: row.qty,
			total: row.net
		})),
		byCashier: allWindow.byCashier.map((row) => ({
			cashierId: row.cashierId,
			total: row.collected,
			count: row.orderCount
		})),
		series
	};
}

export function shiftFigures(shift: CashShift, orders: Order[]) {
	if (shift.status === 'CLOSED' && shift.expectedCash != null) {
		const cashIn = shift.movements.filter((row) => row.type === 'CASH_IN').reduce((sum, row) => sum + row.amount, 0);
		const cashOut = shift.movements.filter((row) => row.type === 'CASH_OUT').reduce((sum, row) => sum + row.amount, 0);
		return {
			cashSales: shift.cashSales ?? 0,
			nonCashSales: shift.nonCashSales ?? 0,
			cashIn,
			cashOut,
			expected: shift.expectedCash,
			difference: shift.countedCash != null ? shift.countedCash - shift.expectedCash : 0
		};
	}
	const mine = orders.filter(
		(order) =>
			order.shiftId === shift.id &&
			orderPayments(order).length > 0 &&
			order.orderStatus !== 'HELD'
	);
	const cashSales = mine
		.filter(
			(order) =>
				order.paymentStatus === 'PAID' ||
				order.paymentStatus === 'PARTIAL_REFUND' ||
				order.paymentStatus === 'REFUNDED'
		)
		.reduce((sum, order) => sum + orderCashApplied(order), 0);
	const cashRefunds = mine.reduce((sum, order) => sum + cashRefunded(order), 0);
	const nonCashSales = mine
		.filter(
			(order) =>
				order.paymentStatus === 'PAID' ||
				order.paymentStatus === 'PARTIAL_REFUND' ||
				order.paymentStatus === 'REFUNDED'
		)
		.reduce((sum, order) => sum + orderNonCashApplied(order) - nonCashRefunded(order), 0);
	const cashIn = shift.movements.filter((row) => row.type === 'CASH_IN').reduce((sum, row) => sum + row.amount, 0);
	const cashOut = shift.movements.filter((row) => row.type === 'CASH_OUT').reduce((sum, row) => sum + row.amount, 0);
	const netCash = cashSales - cashRefunds;
	const expected = shift.openingCash + netCash + cashIn - cashOut;
	return {
		cashSales: netCash,
		nonCashSales,
		cashIn,
		cashOut,
		expected,
		difference: shift.countedCash != null ? shift.countedCash - expected : 0
	};
}

/** Active dining checks that keep a table occupied (payment-independent). */
const OCCUPYING_ORDER_STATUSES = new Set([
	'OPEN',
	'SENT',
	'IN_PROGRESS',
	/** Legacy paid+kitchen still dining until COMPLETED. */
	'CONFIRMED'
]);

/**
 * Table occupancy is a seating/service state — never derived from paymentStatus alone.
 * HELD does not occupy (U1 default). COMPLETED / CANCELLED free the table.
 */
export function tableOccupancy(tableId: string, orders: Order[]): boolean {
	return orders.some(
		(order) => order.tableId === tableId && OCCUPYING_ORDER_STATUSES.has(order.orderStatus)
	);
}
