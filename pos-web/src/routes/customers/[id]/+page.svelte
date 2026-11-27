<script lang="ts">
	import { page } from '$app/state';
	import { formatKhr, formatUsd } from '$lib/domain/money';
	import { refundedTotal } from '$lib/domain/order-payments';
	import { paymentStatusLabel } from '$lib/i18n/domain-labels';
	import { formatWhen, href, label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	const person = $derived(demo.state.customers.find((item) => item.id === page.params.id));
	const history = $derived(
		demo.state.orders
			.filter(
				(order) =>
					order.customerId === person?.id &&
					(order.paymentStatus === 'PAID' ||
						order.paymentStatus === 'PARTIAL_REFUND' ||
						order.paymentStatus === 'REFUNDED')
			)
			.sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))
	);
	const counted = $derived(
		history.filter((order) => order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND')
	);
	const spend = $derived(
		counted.reduce((sum, order) => sum + Math.max(0, order.totals.total - refundedTotal(order)), 0)
	);
</script>

<div class="h-full overflow-auto p-4 md:p-6">
	<a class="text-sm font-semibold text-brand-700" href={href('/customers')}>{m.back()}</a>
	{#if !person}
		<p class="mt-6">{m.no_results()}</p>
	{:else}
		<h1 class="mt-3 text-2xl font-semibold">
			{label(person.name)}
			{#if !person.active}<span class="ml-2 badge badge-neutral align-middle text-sm font-medium">{m.inactive()}</span>{/if}
		</h1>
		<p class="text-sm text-muted">{person.phone} {person.email}</p>
		{#if person.notes}<p class="mt-2 text-sm">{person.notes}</p>{/if}
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			<div class="card p-4"><p class="text-sm text-muted">{m.total_orders()}</p><p class="num text-2xl font-bold">{counted.length}</p></div>
			<div class="card p-4"><p class="text-sm text-muted">{m.total_spend()}</p><p class="num text-2xl font-bold">{formatUsd(spend)}</p><p class="num text-sm text-muted">{formatKhr(Math.round((spend / 100) * demo.state.settings.usdToKhr))}</p></div>
			<div class="card p-4"><p class="text-sm text-muted">{m.last_order()}</p><p class="font-semibold">{history[0] ? formatWhen(history[0].paidAt ?? history[0].createdAt) : m.never()}</p></div>
		</div>
		<h2 class="mt-6 font-semibold">{m.history()}</h2>
		{#if history.length === 0}<p class="mt-2 text-sm text-muted">{m.no_history()}</p>{/if}
		<ul class="mt-3 space-y-2">
			{#each history as order (order.id)}
				<li class="card flex items-center justify-between px-4 py-3">
					<a class="font-semibold text-brand-700" href={href(`/orders?order=${encodeURIComponent(order.id)}`)}>{order.orderNumber}</a>
					<span class="num">{formatUsd(order.totals.total)} · {paymentStatusLabel(order.paymentStatus)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
