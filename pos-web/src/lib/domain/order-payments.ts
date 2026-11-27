import type { Order, Payment, PaymentMethod, RefundRecord } from './types';

/** Normalize legacy single `payment` into `payments[]`. */
export function orderPayments(order: Order): Payment[] {
	if (order.payments?.length) return order.payments;
	if (order.payment) return [order.payment];
	return [];
}

export function orderRefunds(order: Order): RefundRecord[] {
	return order.refunds ?? [];
}

export function refundedTotal(order: Order): number {
	if (typeof order.refundedTotal === 'number') return order.refundedTotal;
	if (order.paymentStatus === 'REFUNDED') return order.totals.total;
	return orderRefunds(order).reduce((sum, row) => sum + row.amount, 0);
}

export function refundableRemaining(order: Order): number {
	if (order.paymentStatus === 'CANCELLED' || order.orderStatus === 'CANCELLED') return 0;
	if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL_REFUND') return 0;
	return Math.max(0, order.totals.total - refundedTotal(order));
}

export function orderHasMethod(order: Order, method: PaymentMethod): boolean {
	return orderPayments(order).some((row) => row.method === method);
}

/** Cash applied toward the sale (not including change overage). */
export function orderCashApplied(order: Order): number {
	return orderPayments(order)
		.filter((row) => row.method === 'CASH' && (row.status === 'PAID' || row.status === 'REFUNDED' || row.status === 'PARTIAL_REFUND'))
		.reduce((sum, row) => sum + row.amount, 0);
}

export function orderNonCashApplied(order: Order): number {
	return orderPayments(order)
		.filter((row) => row.method !== 'CASH' && (row.status === 'PAID' || row.status === 'REFUNDED' || row.status === 'PARTIAL_REFUND'))
		.reduce((sum, row) => sum + row.amount, 0);
}

export function cashRefunded(order: Order): number {
	return orderRefunds(order)
		.filter((row) => row.method === 'CASH')
		.reduce((sum, row) => sum + row.amount, 0);
}

export function nonCashRefunded(order: Order): number {
	return orderRefunds(order)
		.filter((row) => row.method !== 'CASH')
		.reduce((sum, row) => sum + row.amount, 0);
}

/** Allocate a refund amount across tenders (cash first, then others by remaining share). */
export function allocateRefundAcrossTenders(order: Order, amount: number): { method: PaymentMethod; amount: number }[] {
	const remaining = refundableRemaining(order);
	const target = Math.min(amount, remaining);
	if (target <= 0) return [];

	const payments = orderPayments(order).filter((row) => row.status === 'PAID' || row.status === 'PARTIAL_REFUND' || row.status === 'REFUNDED');
	const already = new Map<PaymentMethod, number>();
	for (const row of orderRefunds(order)) {
		already.set(row.method, (already.get(row.method) ?? 0) + row.amount);
	}

	const available = payments.map((row) => ({
		method: row.method,
		left: Math.max(0, row.amount - (already.get(row.method) ?? 0))
	}));

	// Prefer cash first for drawer accuracy, then other methods in order.
	available.sort((a, b) => {
		if (a.method === 'CASH' && b.method !== 'CASH') return -1;
		if (b.method === 'CASH' && a.method !== 'CASH') return 1;
		return 0;
	});

	let left = target;
	const out: { method: PaymentMethod; amount: number }[] = [];
	for (const row of available) {
		if (left <= 0) break;
		const take = Math.min(row.left, left);
		if (take > 0) {
			out.push({ method: row.method, amount: take });
			left -= take;
		}
	}
	return out;
}
