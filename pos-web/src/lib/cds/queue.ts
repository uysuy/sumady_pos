import type { Order } from '$lib/domain/types';
import type { CdsQueueItem } from './channel';

/** Orders that belong on the KDS board (and CDS queue), for one branch. */
export function isKitchenBoardOrder(order: Order, branchId: string): boolean {
	if (order.branchId !== branchId) return false;
	if (order.orderStatus === 'CANCELLED') return false;
	if (!order.kitchenStatus || order.kitchenStatus === 'UNSENT') return false;
	return (
		order.paymentStatus === 'PAID' ||
		order.paymentStatus === 'PARTIAL_REFUND' ||
		order.orderStatus === 'OPEN' ||
		order.orderStatus === 'SENT' ||
		order.orderStatus === 'IN_PROGRESS' ||
		order.orderStatus === 'CONFIRMED'
	);
}

/** Active tickets for CDS queue (excludes completed). */
export function kitchenQueueOrders(orders: Order[], branchId: string): Order[] {
	return orders.filter(
		(order) => isKitchenBoardOrder(order, branchId) && order.kitchenStatus !== 'COMPLETED'
	);
}

export function queueToken(order: Order): string {
	const waiting = order.waitingNumber?.trim();
	if (waiting) return waiting;
	const digits = String(order.orderNumber ?? '').replace(/\D/g, '').slice(-2);
	return digits ? digits.padStart(2, '0') : order.orderNumber;
}

/** Split KDS tickets into Preparing vs Ready for the customer queue board. */
export function buildCdsQueueBoard(
	orders: Order[],
	branchId: string
): { preparing: CdsQueueItem[]; ready: CdsQueueItem[] } {
	const preparing: CdsQueueItem[] = [];
	const ready: CdsQueueItem[] = [];
	for (const order of kitchenQueueOrders(orders, branchId)) {
		const item: CdsQueueItem = {
			id: order.id,
			waitingNumber: queueToken(order),
			orderNumber: order.orderNumber,
			status: order.kitchenStatus === 'READY' ? 'ready' : 'preparing'
		};
		if (item.status === 'ready') ready.push(item);
		else preparing.push(item);
	}
	preparing.sort((a, b) => a.waitingNumber.localeCompare(b.waitingNumber, undefined, { numeric: true }));
	ready.sort((a, b) => a.waitingNumber.localeCompare(b.waitingNumber, undefined, { numeric: true }));
	return { preparing, ready };
}
