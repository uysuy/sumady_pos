<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import OrderDetailDialog from '$lib/components/order-detail-dialog.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import { formatUsd } from '$lib/domain/money';
	import { orderHasMethod } from '$lib/domain/order-payments';
	import type { Order, OrderStatus, OrderType, PaymentMethod } from '$lib/domain/types';
	import { formatWhen, label } from '$lib/i18n/label';
	import {
		kitchenStatusLabel,
		orderStatusLabel,
		orderTypeLabel,
		paymentStatusLabel,
		payMethodLabel
	} from '$lib/i18n/domain-labels';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	let query = $state('');
	let tab = $state<'ALL' | OrderStatus>('ALL');
	let orderType = $state<'ALL' | OrderType>('ALL');
	let pay = $state<'ALL' | PaymentMethod>('ALL');
	let when = $state<'ALL' | 'today' | 'yesterday' | 'last7'>('ALL');
	let selected = $state<Order | null>(null);

	const rows = $derived.by(() => {
		const now = new Date();
		const startToday = new Date(now);
		startToday.setHours(0, 0, 0, 0);
		return demo.state.orders.filter((order) => {
			if (order.branchId !== demo.state.activeBranchId) return false;
			if (tab !== 'ALL' && order.orderStatus !== tab) return false;
			if (orderType !== 'ALL' && order.orderType !== orderType) return false;
			if (pay !== 'ALL' && !orderHasMethod(order, pay)) return false;
			const stamp = new Date(order.paidAt ?? order.createdAt).getTime();
			if (when === 'today' && stamp < startToday.getTime()) return false;
			if (when === 'yesterday') {
				const y = new Date(startToday);
				y.setDate(y.getDate() - 1);
				if (stamp < y.getTime() || stamp >= startToday.getTime()) return false;
			}
			if (when === 'last7') {
				const s = new Date(startToday);
				s.setDate(s.getDate() - 6);
				if (stamp < s.getTime()) return false;
			}
			if (!query.trim()) return true;
			const customer = demo.state.customers.find((item) => item.id === order.customerId);
			const hay = `${order.orderNumber} ${label(customer?.name)} ${order.holdReference ?? ''}`.toLowerCase();
			return hay.includes(query.trim().toLowerCase());
		});
	});

	/** Deep link: /orders?order=ord_xxx opens the dialog. */
	$effect(() => {
		const id = page.url.searchParams.get('order');
		if (!id) return;
		const match = demo.state.orders.find((item) => item.id === id);
		if (match) selected = match;
	});

	function openOrder(order: Order) {
		selected = order;
		const url = new URL(page.url);
		url.searchParams.set('order', order.id);
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function closeOrder() {
		selected = null;
		const url = new URL(page.url);
		url.searchParams.delete('order');
		void goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function payBadge(status: string) {
		if (status === 'PAID') return 'badge-ok';
		if (status === 'PARTIAL_REFUND' || status === 'PARTIALLY_PAID') return 'badge-warn';
		if (status === 'REFUNDED' || status === 'FAILED' || status === 'CANCELLED') return 'badge-danger';
		if (status === 'PENDING' || status === 'UNPAID') return 'badge-warn';
		return 'badge-neutral';
	}

	function statusChipLabel(item: string) {
		if (item === 'ALL') return m.filter_all();
		if (item === 'OPEN') return m.order_status_open();
		if (item === 'CONFIRMED') return m.order_status_confirmed();
		if (item === 'COMPLETED') return m.completed();
		if (item === 'HELD') return m.held();
		if (item === 'CANCELLED') return m.cancelled();
		return item;
	}
</script>

<div class="page-list">
	<div class="page-list-head">
		<h1 class="text-2xl font-semibold">{m.orders_title()}</h1>
		<div class="mt-4 flex flex-wrap gap-2">
			{#each ['ALL', 'OPEN', 'CONFIRMED', 'COMPLETED', 'HELD', 'CANCELLED'] as item (item)}
				<button class="chip" type="button" aria-pressed={tab === item} onclick={() => (tab = item as typeof tab)}>
					{statusChipLabel(item)}
				</button>
			{/each}
		</div>
		<div class="mt-3 grid gap-2 md:grid-cols-4">
			<input class="field" placeholder={m.search_orders()} aria-label={m.search_orders()} bind:value={query} />
			<SelectMenu
				ariaLabel={m.order_type()}
				bind:value={orderType}
				options={[
					{ value: 'ALL', label: m.filter_all() },
					{ value: 'DINE_IN', label: m.type_dine_in() },
					{ value: 'TAKEAWAY', label: m.type_takeaway() },
					{ value: 'DELIVERY', label: m.type_delivery() }
				]}
			/>
			<SelectMenu
				ariaLabel={m.payment()}
				bind:value={pay}
				options={[
					{ value: 'ALL', label: m.filter_all() },
					{ value: 'CASH', label: payMethodLabel('CASH') },
					{ value: 'CARD', label: payMethodLabel('CARD') },
					{ value: 'QR', label: payMethodLabel('QR') },
					{ value: 'GRABPAY', label: payMethodLabel('GRABPAY') }
				]}
			/>
			<SelectMenu
				ariaLabel={m.date()}
				bind:value={when}
				options={[
					{ value: 'ALL', label: m.filter_all() },
					{ value: 'today', label: m.today() },
					{ value: 'yesterday', label: m.yesterday() },
					{ value: 'last7', label: m.last7() }
				]}
			/>
		</div>
	</div>
	<div class="card page-list-grid">
		<table class="w-full min-w-[760px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.order_no()}</th>
					<th class="px-3 py-3">{m.date()}</th>
					<th class="px-3 py-3">{m.customer()}</th>
					<th class="px-3 py-3">{m.type()}</th>
					<th class="px-3 py-3 text-right">{m.items()}</th>
					<th class="px-3 py-3 text-right">{m.total()}</th>
					<th class="px-3 py-3">{m.payment()}</th>
					<th class="px-3 py-3">{m.preparation()}</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as order (order.id)}
					<tr
						class="cursor-pointer border-t border-line hover:bg-brand-50/60"
						onclick={() => openOrder(order)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								openOrder(order);
							}
						}}
						tabindex="0"
						role="button"
					>
						<td class="px-3 py-3 font-semibold text-brand-700">{order.orderNumber}</td>
						<td class="px-3 py-3">{formatWhen(order.paidAt ?? order.createdAt)}</td>
						<td class="px-3 py-3">{label(demo.state.customers.find((item) => item.id === order.customerId)?.name) || m.guest()}</td>
						<td class="px-3 py-3">{orderTypeLabel(order.orderType)}</td>
						<td class="num px-3 py-3 text-right">{order.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
						<td class="num px-3 py-3 text-right">{formatUsd(order.totals.total)}</td>
						<td class="px-3 py-3">
							<span class="badge {payBadge(order.paymentStatus)}">{paymentStatusLabel(order.paymentStatus)}</span>
							<span class="mt-1 block text-[11px] text-muted">{orderStatusLabel(order.orderStatus)}</span>
						</td>
						<td class="px-3 py-3">{kitchenStatusLabel(order.kitchenStatus)}</td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-muted" colspan="8">{m.orders_empty()}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if selected}
	<OrderDetailDialog order={selected} onclose={closeOrder} />
{/if}
