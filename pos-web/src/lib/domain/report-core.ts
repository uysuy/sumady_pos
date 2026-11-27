/**
 * Shared reporting policy for Coffee Plus POS.
 *
 * Definitions (locked for all report screens):
 * - Sale order: paymentStatus PAID | PARTIAL_REFUND | REFUNDED; not HELD/CANCELLED;
 *   dated by paidAt (fallback createdAt) inside the filter range.
 * - Gross: sum of order.totals.subtotal (merchandise before order discount).
 * - Discount: sum of order.totals.discount (order-level only).
 * - Tax: sum of order.totals.tax.
 * - Ticket total: sum of order.totals.total.
 * - Refunds: sum of refundedTotal(order) on sale orders in range.
 * - Collected / net sales: ticket total − refunds.
 * - Cash drawer: CASH tenders only. CARD / QR (KHQR) / GRABPAY are never cash received.
 * - Line allocation: order discount (and proportional refund share) split by lineTotal / subtotal.
 * - Profitability / COGS: unavailable — no recipe cost in POS.
 */

import { refundedTotal } from './order-payments.ts';
import type { CartLine, Order, PaymentMethod } from './types.ts';

export type RangeKey = 'today' | 'yesterday' | 'last7' | 'custom';

export type ReportFilters = {
	range: RangeKey;
	from: string;
	to: string;
	/** Empty string = all branches the viewer can see (caller may still restrict). */
	branchId: string;
	/** Empty string = all cashiers. */
	cashierId: string;
};

function startOfDay(date: Date): number {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy.getTime();
}

function endOfDay(date: Date): number {
	const copy = new Date(date);
	copy.setHours(23, 59, 59, 999);
	return copy.getTime();
}

export function rangeBounds(
	key: RangeKey,
	from: string,
	to: string,
	now = new Date()
): { start: number; end: number } {
	if (key === 'today') return { start: startOfDay(now), end: endOfDay(now) };
	if (key === 'yesterday') {
		const day = new Date(now);
		day.setDate(day.getDate() - 1);
		return { start: startOfDay(day), end: endOfDay(day) };
	}
	if (key === 'last7') {
		const day = new Date(now);
		day.setDate(day.getDate() - 6);
		return { start: startOfDay(day), end: endOfDay(now) };
	}
	const start = from ? startOfDay(new Date(from)) : 0;
	const end = to ? endOfDay(new Date(to)) : endOfDay(now);
	return { start, end: Math.max(start, end) };
}

export type MoneyBreakdown = {
	gross: number;
	discounts: number;
	tax: number;
	ticketTotal: number;
	refunds: number;
	collected: number;
	orderCount: number;
	average: number;
};

export function paidStamp(order: Order): number {
	return new Date(order.paidAt ?? order.createdAt).getTime();
}

export function isSaleOrder(order: Order): boolean {
	if (order.orderStatus === 'HELD' || order.orderStatus === 'CANCELLED') return false;
	return (
		order.paymentStatus === 'PAID' ||
		order.paymentStatus === 'PARTIAL_REFUND' ||
		order.paymentStatus === 'REFUNDED'
	);
}

export function filterSaleOrders(orders: Order[], filters: ReportFilters, now = new Date()): Order[] {
	const { start, end } = rangeBounds(filters.range, filters.from, filters.to, now);
	return orders.filter((order) => {
		if (!isSaleOrder(order)) return false;
		if (filters.branchId && order.branchId !== filters.branchId) return false;
		if (filters.cashierId && order.cashierId !== filters.cashierId) return false;
		const stamp = paidStamp(order);
		return stamp >= start && stamp <= end;
	});
}

export function orderMoney(order: Order): MoneyBreakdown {
	const refunds = refundedTotal(order);
	const ticketTotal = order.totals.total;
	return {
		gross: order.totals.subtotal,
		discounts: order.totals.discount,
		tax: order.totals.tax,
		ticketTotal,
		refunds,
		collected: ticketTotal - refunds,
		orderCount: 1,
		average: ticketTotal - refunds
	};
}

export function sumMoney(rows: MoneyBreakdown[]): MoneyBreakdown {
	const gross = rows.reduce((s, r) => s + r.gross, 0);
	const discounts = rows.reduce((s, r) => s + r.discounts, 0);
	const tax = rows.reduce((s, r) => s + r.tax, 0);
	const ticketTotal = rows.reduce((s, r) => s + r.ticketTotal, 0);
	const refunds = rows.reduce((s, r) => s + r.refunds, 0);
	const collected = ticketTotal - refunds;
	const orderCount = rows.reduce((s, r) => s + r.orderCount, 0);
	return {
		gross,
		discounts,
		tax,
		ticketTotal,
		refunds,
		collected,
		orderCount,
		average: orderCount ? Math.round(collected / orderCount) : 0
	};
}

/** Share of order subtotal for a line; equal split if subtotal is 0. */
export function lineShare(order: Order, line: CartLine): number {
	const sub = order.totals.subtotal;
	if (sub <= 0) {
		const n = order.lines.length || 1;
		return 1 / n;
	}
	return line.lineTotal / sub;
}

export type AllocatedLine = {
	line: CartLine;
	gross: number;
	discount: number;
	refund: number;
	net: number;
	share: number;
};

export function allocateOrderLines(order: Order): AllocatedLine[] {
	const refunds = refundedTotal(order);
	return order.lines.map((line) => {
		const share = lineShare(order, line);
		const discount = Math.round(order.totals.discount * share);
		const refund = Math.round(refunds * share);
		const gross = line.lineTotal;
		return {
			line,
			gross,
			discount,
			refund,
			net: gross - discount - refund,
			share
		};
	});
}

export function modifierSignature(line: CartLine): string {
	if (!line.selectedModifiers.length) return '';
	return [...line.selectedModifiers]
		.map((m) => `${m.groupId}:${m.optionId}`)
		.sort()
		.join('|');
}

export function modifierLabelEn(line: CartLine): string {
	if (!line.selectedModifiers.length) return '';
	return line.selectedModifiers.map((m) => m.optionName.en || m.optionName.kh).join(', ');
}

export function isCashMethod(method: PaymentMethod): boolean {
	return method === 'CASH';
}

export function emptyFilters(branchId = ''): ReportFilters {
	return { range: 'today', from: '', to: '', branchId, cashierId: '' };
}
