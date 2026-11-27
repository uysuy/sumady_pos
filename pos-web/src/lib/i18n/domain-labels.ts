import { label } from '$lib/i18n/label';
import { demo } from '$lib/state/demo.svelte';
import type { DeliveryChannel, KitchenStatus, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '$lib/domain/types';
import * as m from '$paraglide/messages';

export function payMethodLabel(method: PaymentMethod): string {
	const fromSettings = demo.state.settings.paymentMethods.find((item) => item.method === method)?.label;
	if (fromSettings) return label(fromSettings);
	if (method === 'CASH') return m.pay_cash();
	if (method === 'CARD') return m.pay_card();
	if (method === 'QR') return m.pay_qr();
	return m.pay_grabpay();
}

export function paymentStatusLabel(status: PaymentStatus): string {
	if (status === 'PAID') return m.status_paid();
	if (status === 'UNPAID') return m.status_unpaid();
	if (status === 'PARTIALLY_PAID') return m.status_partially_paid();
	if (status === 'PENDING') return m.status_pending();
	if (status === 'REFUNDED') return m.status_refunded();
	if (status === 'PARTIAL_REFUND') return m.status_partial_refund();
	if (status === 'CANCELLED') return m.status_cancelled();
	if (status === 'FAILED') return m.status_failed();
	return status;
}

export function orderStatusLabel(status: OrderStatus): string {
	if (status === 'OPEN') return m.order_status_open();
	if (status === 'SENT') return m.order_status_sent();
	if (status === 'IN_PROGRESS') return m.order_status_in_progress();
	if (status === 'CONFIRMED') return m.order_status_confirmed();
	if (status === 'COMPLETED') return m.completed();
	if (status === 'HELD') return m.held();
	if (status === 'CANCELLED') return m.cancelled();
	return status;
}

export function orderTypeLabel(type: OrderType): string {
	if (type === 'DINE_IN') return m.type_dine_in();
	if (type === 'TAKEAWAY') return m.type_takeaway();
	return m.type_delivery();
}

export function deliveryChannelLabel(channel: DeliveryChannel | undefined): string {
	if (channel === 'GRAB') return m.channel_grab();
	if (channel === 'FOODPANDA') return m.channel_foodpanda();
	if (channel === 'NHAM24') return m.channel_nham24();
	if (channel === 'OTHER') return m.channel_other();
	return m.channel_own();
}

export function kitchenStatusLabel(status: KitchenStatus | undefined): string {
	if (!status) return '—';
	if (status === 'UNSENT') return m.kitchen_unsent();
	if (status === 'VOIDED') return m.kitchen_voided();
	if (status === 'NEW') return m.kitchen_new();
	if (status === 'PREPARING') return m.kitchen_preparing();
	if (status === 'READY') return m.kitchen_ready();
	if (status === 'COMPLETED') return m.kitchen_completed();
	return status;
}
