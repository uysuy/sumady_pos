<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import ProductThumb from '$lib/components/product-thumb.svelte';
	import ReceiptView from '$lib/components/receipt-view.svelte';
	import { modifierSummaryText } from '$lib/domain/catalog';
	import { formatUsd } from '$lib/domain/money';
	import { orderPayments, orderRefunds, refundableRemaining, refundedTotal } from '$lib/domain/order-payments';
	import type { Order } from '$lib/domain/types';
	import { formatWhen, label } from '$lib/i18n/label';
	import { kitchenStatusLabel, orderTypeLabel, paymentStatusLabel, payMethodLabel } from '$lib/i18n/domain-labels';
	import { demo } from '$lib/state/demo.svelte';
	import { configuredReceiptPaper, printReceipt } from '$lib/print-receipt';
	import * as m from '$paraglide/messages';

	let {
		order,
		onclose
	}: {
		order: Order;
		onclose: () => void;
	} = $props();

	let reason = $state('');
	let refundAmount = $state('');
	let showReceipt = $state(false);

	const live = $derived(demo.state.orders.find((item) => item.id === order.id) ?? order);
	const remaining = $derived(refundableRemaining(live));
	const tenders = $derived(orderPayments(live));
	const customerName = $derived(
		label(demo.state.customers.find((item) => item.id === live.customerId)?.name) || m.guest()
	);

	const timelineLabel: Record<string, () => string> = {
		held: m.held,
		paid: m.paid,
		kitchen_new: m.kitchen_new,
		kitchen_preparing: m.kitchen_preparing,
		kitchen_ready: m.kitchen_ready,
		kitchen_completed: m.kitchen_completed,
		completed: m.completed,
		cancelled: m.cancelled,
		refunded: m.refunded,
		partial_refund: m.status_partial_refund,
		voided: m.voided
	};

	let pinAction = $state<(() => void) | null>(null);
	let pinValue = $state('');
	let pinError = $state(false);
	let pinClose = $state<(() => void) | null>(null);

	/** Run `action` immediately, or after a correct manager PIN when enabled in settings. */
	function requirePin(action: () => void) {
		if (!demo.state.settings.managerPinEnabled) {
			action();
			return;
		}
		pinValue = '';
		pinError = false;
		pinAction = action;
	}

	function submitPin() {
		if (!demo.verifyManagerPin(pinValue)) {
			pinError = true;
			demo.flash(m.manager_pin_wrong());
			return;
		}
		const action = pinAction;
		pinAction = null;
		pinValue = '';
		pinError = false;
		action?.();
	}

	function cancelPin() {
		pinAction = null;
		pinValue = '';
		pinError = false;
	}

	function refund(full = false) {
		requirePin(() => runRefund(full));
	}

	function runRefund(full: boolean) {
		const cents = full ? remaining : Math.round((Number(refundAmount) || 0) * 100);
		const result = demo.refund(live.id, reason, cents);
		if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'reason') demo.flash(m.reason_required());
		else if (result === 'invalid') demo.flash(m.cannot_refund());
		else if (result === 'amount') demo.flash(m.allocation_incomplete());
		else {
			reason = '';
			refundAmount = '';
			demo.flash(m.refunded_msg());
		}
	}

	function cancelSale() {
		if (!reason.trim()) {
			demo.flash(m.reason_required());
			return;
		}
		requirePin(() =>
			demo.ask({
				title: m.cancel_paid(),
				body: m.cancel_paid_body(),
				confirmLabel: m.do_cancel_paid(),
				danger: true,
				onYes: () => {
					const result = demo.cancelPaid(live.id, reason.trim());
					if (result === 'permission') demo.flash(m.permission_denied());
					else if (result === 'reason') demo.flash(m.reason_required());
					else if (result === 'invalid') demo.flash(m.cannot_refund());
					else {
						reason = '';
						demo.flash(m.cancelled_sale());
					}
				}
			})
		);
	}

	function payBadge(status: string) {
		if (status === 'PAID') return 'badge-ok';
		if (status === 'PARTIAL_REFUND') return 'badge-warn';
		if (status === 'REFUNDED' || status === 'FAILED' || status === 'CANCELLED') return 'badge-danger';
		return 'badge-neutral';
	}

	function lineImage(line: Order['lines'][number]) {
		return (
			line.productImageUrl ||
			demo.state.products.find((product) => product.id === line.productId)?.imageUrl ||
			''
		);
	}
</script>

<Dialog title={live.waitingNumber ? `${m.waiting_number()} ${live.waitingNumber} · ${live.orderNumber}` : live.orderNumber} wide onclose={onclose}>
	<!-- Master payment / order header -->
	<header class="rounded-lg border border-line bg-brand-50/50 px-3 py-3 sm:px-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.payment()}</p>
				<p class="mt-1 flex flex-wrap items-center gap-2">
					<span class="badge {payBadge(live.paymentStatus)}">{paymentStatusLabel(live.paymentStatus)}</span>
					{#each tenders as tender (tender.id)}
						<span class="text-sm font-semibold text-ink">{payMethodLabel(tender.method)} {formatUsd(tender.amount)}</span>
					{/each}
				</p>
				<p class="mt-2 text-sm text-muted">
					{customerName} · {orderTypeLabel(live.orderType)} · {formatWhen(live.paidAt ?? live.createdAt)}
				</p>
				<p class="mt-1 text-xs text-muted">
					{m.preparation()}: {kitchenStatusLabel(live.kitchenStatus)} · {live.syncStatus}
				</p>
			</div>
			<div class="text-right">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.total()}</p>
				<p class="num text-2xl font-bold text-brand-700">{formatUsd(live.totals.total)}</p>
				{#if refundedTotal(live) > 0}
					<p class="mt-0.5 text-sm text-danger">{m.refunded()}: {formatUsd(refundedTotal(live))}</p>
				{/if}
			</div>
		</div>
	</header>

	<!-- Line items list -->
	<section class="mt-4">
		<h3 class="text-sm font-semibold">{m.line_items()}</h3>
		<ul class="mt-2 divide-y divide-line rounded-lg border border-line bg-white">
			{#each live.lines as line (line.id)}
				<li class="flex gap-3 px-3 py-3">
					<ProductThumb src={lineImage(line)} alt={label(line.productName)} class="h-12 w-12 shrink-0" />
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<p class="font-semibold text-ink">{label(line.productName)}</p>
							<p class="num shrink-0 font-semibold">{formatUsd(line.lineTotal)}</p>
						</div>
						<p class="mt-0.5 text-sm text-muted">{line.quantity} × {formatUsd(line.unitPrice)}</p>
						{#if modifierSummaryText(line.selectedModifiers, (text) => label(text))}
							<p class="mt-0.5 text-xs text-muted">{modifierSummaryText(line.selectedModifiers, (text) => label(text))}</p>
						{/if}
						{#if line.specialInstructions}
							<p class="mt-0.5 text-xs italic text-muted">{line.specialInstructions}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
		<dl class="mt-3 space-y-1 text-sm">
			<div class="flex justify-between gap-3"><dt class="text-muted">{m.subtotal()}</dt><dd class="num">{formatUsd(live.totals.subtotal)}</dd></div>
			{#if live.totals.discount > 0}
				<div class="flex justify-between gap-3"><dt class="text-muted">{m.discount()}</dt><dd class="num">−{formatUsd(live.totals.discount)}</dd></div>
			{/if}
			<div class="flex justify-between gap-3"><dt class="text-muted">{label(live.totals.taxName)}</dt><dd class="num">{formatUsd(live.totals.tax)}</dd></div>
			<div class="flex justify-between gap-3 border-t border-line pt-2 text-base font-bold">
				<dt>{m.total()}</dt>
				<dd class="num text-brand-700">{formatUsd(live.totals.total)}</dd>
			</div>
		</dl>
	</section>

	<section class="mt-4">
		<h3 class="text-sm font-semibold">{m.timeline()}</h3>
		<ol class="mt-2 space-y-1.5 text-sm">
			{#each live.timeline as event, index (`${event.at}-${index}`)}
				<li class="flex flex-wrap gap-x-2">
					<span class="font-medium">{timelineLabel[event.code]?.() ?? event.code}</span>
					<span class="text-muted">{formatWhen(event.at)}</span>
					{#if event.detail}<span class="w-full text-muted">{event.detail}</span>{/if}
				</li>
			{/each}
		</ol>
	</section>

	{#if orderRefunds(live).length}
		<section class="mt-4">
			<h3 class="text-sm font-semibold">{m.refund_history()}</h3>
			<ul class="mt-2 space-y-2 text-sm">
				{#each orderRefunds(live) as row (row.id)}
					<li class="flex justify-between gap-3 border-b border-line pb-2">
						<span>{payMethodLabel(row.method)} · {row.reason}</span>
						<span class="num font-semibold">−{formatUsd(row.amount)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if remaining > 0}
		<section class="mt-4 rounded-lg border border-line p-3">
			<h3 class="text-sm font-semibold">{m.partial_refund()}</h3>
			{#if !demo.can('refund')}<p class="mt-2 text-sm text-muted">{m.switch_to_manager()}</p>{/if}
			<p class="mt-2 text-sm">{m.refundable()}: <span class="num font-semibold">{formatUsd(remaining)}</span></p>
			<label class="mt-3 block text-sm font-semibold" for="od-reason">{m.enter_reason()}</label>
			<input id="od-reason" class="field mt-1" bind:value={reason} />
			<label class="mt-3 block text-sm font-semibold" for="od-refund-amt">{m.refund_amount()}</label>
			<NumberField
				id="od-refund-amt"
				class="mt-1"
				min={0}
				step={0.01}
				bind:value={refundAmount}
				placeholder={(remaining / 100).toFixed(2)}
				ariaLabel={m.refund_amount()}
			/>
			<div class="mt-3 flex flex-wrap gap-2">
				<button class="btn btn-danger btn-sm" type="button" disabled={!demo.can('refund')} onclick={() => refund(false)}>{m.do_refund()}</button>
				<button class="btn btn-secondary btn-sm" type="button" disabled={!demo.can('refund')} onclick={() => refund(true)}>{m.refund()}</button>
				<button class="btn btn-secondary btn-sm" type="button" disabled={!demo.can('refund') && !demo.can('orders')} onclick={cancelSale}>{m.cancel_paid()}</button>
			</div>
		</section>
	{/if}

	{#snippet footer()}
		<div class="flex flex-wrap justify-end gap-2">
			<button class="btn btn-secondary" type="button" onclick={onclose}>{m.close()}</button>
			{#if live.receipt}
				<button class="btn btn-primary" type="button" onclick={() => (showReceipt = true)}>{m.view_receipt()}</button>
			{/if}
		</div>
	{/snippet}
</Dialog>

{#if pinAction}
	<Dialog alert title={m.manager_pin()} onclose={cancelPin} bind:close={pinClose}>
		<form
			id="manager-pin-form"
			onsubmit={(event) => {
				event.preventDefault();
				submitPin();
			}}
		>
			<label class="block text-sm font-semibold" for="manager-pin-input">{m.manager_pin_prompt()}</label>
			<input
				id="manager-pin-input"
				class="field mt-1 {pinError ? 'border-danger' : ''}"
				type="password"
				inputmode="numeric"
				autocomplete="off"
				bind:value={pinValue}
			/>
			{#if pinError}<p class="mt-1 text-xs font-semibold text-danger">{m.manager_pin_wrong()}</p>{/if}
		</form>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => pinClose?.()}>{m.cancel()}</button>
				<button class="btn btn-primary" type="submit" form="manager-pin-form">{m.confirm()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if showReceipt && live.receipt}
	{@const paper = configuredReceiptPaper(demo.state.settings)}
	<Dialog title={m.receipt_title()} wide={paper === 'A4'} onclose={() => (showReceipt = false)}>
		<div class="receipt-preview-host" data-paper={paper}>
			<ReceiptView order={live} reprint />
		</div>
		<p class="mt-2 text-center text-xs text-muted">{m.print_hint()}</p>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (showReceipt = false)}>{m.close()}</button>
				<button class="btn btn-primary" type="button" onclick={() => printReceipt(paper)}>{m.print_receipt()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
