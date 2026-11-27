<script lang="ts">
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import ProductThumb from '$lib/components/product-thumb.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import { label } from '$lib/i18n/label';
	import { deliveryChannelLabel } from '$lib/i18n/domain-labels';
	import { modifierSummaryText } from '$lib/domain/catalog';
	import type { DeliveryChannel } from '$lib/domain/types';
	import { formatKhr, formatUsd } from '$lib/domain/money';
	import { tableOccupancy } from '$lib/domain/reports';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';
	import { localizeHref } from '$paraglide/runtime';
	import { motionMs } from '$lib/motion';
	import { ChefHat, ClipboardList, Minus, MonitorSmartphone, PauseCircle, Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';

	let showDiscount = $state(false);
	let totalPulse = $state(false);
	let lastTotal = $state(-1);

	const totals = $derived.by(() => {
		demo.state.cart.lines;
		demo.state.cart.discountMode;
		demo.state.cart.discountValue;
		demo.state.settings.tax;
		demo.state.settings.usdToKhr;
		return demo.cartTotals();
	});
	const tables = $derived(demo.state.tables.filter((table) => table.active && table.branchId === demo.state.activeBranchId));
	const customers = $derived(demo.state.customers.filter((person) => person.active));
	const openCheckCount = $derived(
		demo.state.orders.filter((order) => order.orderStatus === 'OPEN' && order.branchId === demo.state.activeBranchId).length
	);
	const heldCount = $derived(
		demo.state.orders.filter((order) => order.orderStatus === 'HELD' && order.branchId === demo.state.activeBranchId).length
	);
	const customerOptions = $derived([{ value: '', label: m.guest() }, ...customers.map((person) => ({ value: person.id, label: label(person.name) }))]);
	const discountOptions = $derived([
		{ value: 'NONE', label: m.discount_none() },
		{ value: 'PERCENT', label: m.discount_percent() },
		{ value: 'FIXED', label: m.discount_fixed() }
	]);
	const discountVisible = $derived(showDiscount || demo.state.cart.discountMode !== 'NONE');

	$effect(() => {
		const next = totals.total;
		if (lastTotal < 0) {
			lastTotal = next;
			return;
		}
		if (next === lastTotal) return;
		lastTotal = next;
		totalPulse = true;
		const timer = window.setTimeout(() => (totalPulse = false), motionMs(220));
		return () => clearTimeout(timer);
	});

	function moneyValue() {
		if (demo.state.cart.discountMode === 'PERCENT') return String(demo.state.cart.discountValue || '');
		if (!demo.state.cart.discountValue) return '';
		return (demo.state.cart.discountValue / 100).toFixed(2);
	}

	function onDiscount(rawText: string) {
		const raw = Number(rawText);
		if (!Number.isFinite(raw) || raw < 0) return;
		if (demo.state.cart.discountMode === 'PERCENT') demo.setDiscount('PERCENT', Math.min(100, raw));
		else demo.setDiscount('FIXED', Math.round(raw * 100));
	}

	const discountStep = $derived(demo.state.cart.discountMode === 'PERCENT' ? 1 : 0.01);
	const discountMax = $derived(demo.state.cart.discountMode === 'PERCENT' ? 100 : undefined);

	const channelOptions = $derived(
		(['OWN', 'GRAB', 'FOODPANDA', 'NHAM24', 'OTHER'] as DeliveryChannel[]).map((value) => ({
			value,
			label: deliveryChannelLabel(value)
		}))
	);
	const canSendKitchen = $derived(
		demo.persistOpenOrdersEnabled &&
			demo.can('pos') &&
			demo.state.cart.lines.some((line) => line.preparesInKitchen && (!line.kitchenStatus || line.kitchenStatus === 'UNSENT'))
	);

	function sendKitchen() {
		const result = demo.sendToKitchen();
		if (result.ok) {
			demo.flash(m.sent_kitchen());
			return;
		}
		if (result.code === 'table') demo.flash(m.open_needs_table());
		else if (result.code === 'delivery') demo.flash(m.open_needs_delivery());
		else if (result.code === 'empty') demo.flash(m.open_needs_items());
		else if (result.code === 'disabled') demo.flash(m.persist_open_orders_hint());
		else demo.flash(m.permission_denied());
	}

	function setType(type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') {
		if (type !== 'DINE_IN' && demo.state.cart.tableId) {
			demo.ask({
				title: m.order_type(),
				body: m.warning_leave_table(),
				confirmLabel: m.confirm(),
				onYes: () => demo.setOrderType(type)
			});
			return;
		}
		demo.setOrderType(type);
	}
</script>

<section class="flex h-full min-h-0 flex-col bg-white">
	<div class="shrink-0 border-b border-line px-3 py-2">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-sm font-semibold">{m.cart()}</h2>
			{#if !demo.currentShift}
				<a class="text-xs font-semibold text-warning" href={localizeHref('/shifts')} title={m.shift_required()}>{m.open_shift()}</a>
			{/if}
		</div>
		<div class="mt-2 grid grid-cols-2 gap-1.5">
			{#if demo.persistOpenOrdersEnabled}
				<button
					class="cart-queue-btn"
					type="button"
					onclick={() => (demo.openOrdersOpen = true)}
					aria-label={m.open_orders()}
				>
					<span class="cart-queue-icon cart-queue-icon-open" aria-hidden="true">
						<ClipboardList size={15} strokeWidth={2.25} />
					</span>
					<span class="min-w-0 flex-1 text-left">
						<span class="block truncate text-[11px] font-bold leading-tight text-ink">{m.open_orders()}</span>
					</span>
					<span class="cart-queue-count" class:is-hot={openCheckCount > 0}>{openCheckCount}</span>
				</button>
			{/if}
			<button
				class="cart-queue-btn"
				class:col-span-2={!demo.persistOpenOrdersEnabled}
				type="button"
				onclick={() => (demo.heldOpen = true)}
				aria-label={m.held_orders()}
			>
				<span class="cart-queue-icon cart-queue-icon-held" aria-hidden="true">
					<PauseCircle size={15} strokeWidth={2.25} />
				</span>
				<span class="min-w-0 flex-1 text-left">
					<span class="block truncate text-[11px] font-bold leading-tight text-ink">{m.held_orders()}</span>
				</span>
				<span class="cart-queue-count" class:is-hot={heldCount > 0}>{heldCount}</span>
			</button>
		</div>
		{#if demo.state.cart.openOrderId}
			<p class="mt-1 text-[11px] font-semibold text-brand-700">{m.editing_open_order()} · {demo.state.orders.find((o) => o.id === demo.state.cart.openOrderId)?.orderNumber ?? ''}</p>
		{/if}
		<div class="mt-2 grid grid-cols-3 gap-1.5">
			<button class="chip chip-sm" type="button" aria-pressed={demo.state.cart.orderType === 'DINE_IN'} onclick={() => setType('DINE_IN')}>{m.dine_in()}</button>
			<button class="chip chip-sm" type="button" aria-pressed={demo.state.cart.orderType === 'TAKEAWAY'} onclick={() => setType('TAKEAWAY')}>{m.takeaway()}</button>
			<button class="chip chip-sm" type="button" aria-pressed={demo.state.cart.orderType === 'DELIVERY'} onclick={() => setType('DELIVERY')}>{m.delivery()}</button>
		</div>
		<SelectMenu
			id="cart-customer"
			class="mt-1.5"
			ariaLabel={m.customer()}
			placeholder={m.guest()}
			value={demo.state.cart.customerId ?? ''}
			options={customerOptions}
			onchange={(id) => demo.setCustomer(id || undefined)}
		/>
		{#if demo.state.cart.orderType === 'DINE_IN'}
			<div class="mt-1.5 grid grid-cols-8 gap-1" role="group" aria-label={m.table()}>
				{#each tables as table (table.id)}
					{@const busy = tableOccupancy(table.id, demo.state.orders)}
					{@const reserved = !busy && table.status === 'RESERVED'}
					{@const selected = demo.state.cart.tableId === table.id}
					<button
						class="flex h-8 items-center justify-center gap-0.5 rounded border text-[11px] font-bold {selected
							? 'border-brand-700 bg-brand-700 text-white'
							: 'border-line bg-white'}"
						type="button"
						title={busy ? m.occupied() : reserved ? m.reserved() : m.available()}
						aria-pressed={selected}
						onclick={() => demo.setTable(table.id)}
					>
						<span class="h-1.5 w-1.5 shrink-0 rounded-full {selected ? 'bg-white' : busy ? 'bg-danger' : reserved ? 'bg-warning' : 'bg-brand-500'}"></span>
						{table.name}
					</button>
				{/each}
			</div>
		{/if}
		{#if demo.state.cart.orderType === 'DELIVERY'}
			<div class="mt-1.5 space-y-1.5" title={m.delivery_demo()}>
				<div class="flex gap-1.5">
					<SelectMenu
						id="cart-delivery-channel"
						class="min-w-0 flex-1"
						ariaLabel={m.delivery_channel()}
						value={demo.state.cart.delivery.channel ?? 'OWN'}
						options={channelOptions}
						onchange={(value) => demo.setDelivery({ channel: value as DeliveryChannel })}
					/>
					<input
						class="field min-w-0 flex-1 text-sm"
						placeholder={m.app_ref()}
						aria-label={m.app_ref()}
						value={demo.state.cart.delivery.appRef ?? ''}
						oninput={(event) => demo.setDelivery({ appRef: (event.target as HTMLInputElement).value })}
					/>
				</div>
				<input class="field text-sm" placeholder={m.delivery_name()} value={demo.state.cart.delivery.recipientName} oninput={(event) => demo.setDelivery({ recipientName: (event.target as HTMLInputElement).value })} />
				<div class="flex gap-1.5">
					<input class="field text-sm" placeholder={m.delivery_phone()} value={demo.state.cart.delivery.phone} oninput={(event) => demo.setDelivery({ phone: (event.target as HTMLInputElement).value })} />
					<input class="field text-sm" placeholder={m.delivery_address()} value={demo.state.cart.delivery.address} oninput={(event) => demo.setDelivery({ address: (event.target as HTMLInputElement).value })} />
				</div>
			</div>
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
		{#if demo.state.cart.lines.length === 0}
			<p class="text-sm font-semibold">{m.cart_empty()}</p>
			<p class="text-sm text-muted">{m.empty_hint()}</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each demo.state.cart.lines as line (line.id)}
					{@const imageUrl =
						line.productImageUrl ||
						demo.state.products.find((product) => product.id === line.productId)?.imageUrl ||
						''}
					<li
						class="flex items-start gap-2.5 py-2.5"
						in:fly={{ y: 8, duration: motionMs(160) }}
						out:fade={{ duration: motionMs(120) }}
						animate:flip={{ duration: motionMs(160) }}
					>
						<div class="relative shrink-0">
							<ProductThumb src={imageUrl} alt={label(line.productName)} class="h-14 w-14" />
							<span class="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
								{line.quantity}
							</span>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start gap-2">
								<p class="min-w-0 flex-1 text-sm font-semibold leading-normal">{label(line.productName)}</p>
								<p class="num shrink-0 text-sm font-bold tabular-nums transition-colors duration-150">{formatUsd(line.lineTotal)}</p>
								<IconAction label={m.remove()} icon={Trash2} tone="danger" onclick={() => demo.removeLine(line.id)} />
							</div>
							<p class="mt-0.5 text-[11px] font-semibold tabular-nums text-muted">
								{formatUsd(line.unitPrice)} × {line.quantity}
							</p>
							{#if line.selectedModifiers.length}
								{@const modText = modifierSummaryText(line.selectedModifiers, (text) => label(text))}
								{#if modText}<p class="mt-0.5 text-xs leading-normal text-muted">{modText}</p>{/if}
							{/if}
							{#if line.specialInstructions}<p class="text-xs leading-normal text-ink/80">“{line.specialInstructions}”</p>{/if}
							<div class="mt-1.5 flex items-center gap-1">
								<button class="btn btn-secondary btn-sm w-7 px-0" type="button" aria-label={m.decrease()} onclick={() => demo.setQty(line.id, line.quantity - 1)}><Minus size={14} /></button>
								<span class="num w-6 text-center text-sm font-bold">{line.quantity}</span>
								<button class="btn btn-secondary btn-sm w-7 px-0" type="button" aria-label={m.increase()} onclick={() => demo.setQty(line.id, line.quantity + 1)}><Plus size={14} /></button>
								<div class="ml-auto">
									<IconAction
										label={m.edit_line()}
										icon={Pencil}
										onclick={() => demo.openCustomize(line.productId, line.id)}
									/>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="shrink-0 border-t border-line">
		<div class="px-3 py-2">
			<div class="mb-1.5 flex items-center gap-1.5">
				{#if discountVisible}
					<SelectMenu
						id="cart-discount"
						class="min-w-0 w-28 shrink-0"
						ariaLabel={m.discount()}
						value={demo.state.cart.discountMode}
						options={discountOptions}
						onchange={(mode) => {
							demo.setDiscount(mode as 'NONE' | 'PERCENT' | 'FIXED', mode === demo.state.cart.discountMode ? demo.state.cart.discountValue : 0);
							if (mode === 'NONE') showDiscount = false;
						}}
					/>
					{#if demo.state.cart.discountMode !== 'NONE'}
						<NumberField
							class="w-20 shrink-0"
							size="sm"
							min={0}
							max={discountMax}
							step={discountStep}
							value={moneyValue()}
							ariaLabel={m.discount()}
							onchange={onDiscount}
						/>
					{/if}
				{:else}
					<button class="shrink-0 text-xs font-semibold text-muted" type="button" onclick={() => (showDiscount = true)}>{m.discount()}</button>
				{/if}
				<p class="min-w-0 flex-1 truncate text-right text-[11px] text-muted">
					{formatUsd(totals.subtotal)}
					{#if totals.discount > 0}<span> −{formatUsd(totals.discount)}</span>{/if}
					<span> · {label(totals.taxName)} {formatUsd(totals.tax)}</span>
				</p>
			</div>
			<div class="mb-1.5 grid grid-cols-2 gap-1.5">
				<button class="btn btn-secondary btn-sm" type="button" disabled={demo.state.cart.lines.length === 0} onclick={() => (demo.composeHold = true)}>{m.hold()}</button>
				<button
					class="btn btn-danger btn-sm"
					type="button"
					disabled={demo.state.cart.lines.length === 0}
					onclick={() => {
						if (!demo.state.cart.lines.length) return;
						demo.ask({ title: m.clear(), body: m.clear_body(), confirmLabel: m.clear(), danger: true, onYes: () => { demo.clearCart(); demo.flash(m.cleared()); } });
					}}>{m.clear()}</button>
			</div>
			<div class="mb-1.5 grid grid-cols-2 gap-1.5">
				<button
					class="btn btn-secondary btn-sm"
					type="button"
					disabled={!canSendKitchen}
					onclick={sendKitchen}
				>
					<ChefHat size={14} />
					{m.send_kitchen()}
				</button>
				<button class="btn btn-secondary btn-sm" type="button" onclick={() => demo.openCustomerScreen()}>
					<MonitorSmartphone size={14} />
					{m.open_customer_screen()}
				</button>
			</div>
			{#if demo.persistOpenOrdersEnabled}
				<button
					class="btn btn-secondary btn-sm mb-1.5 w-full"
					type="button"
					disabled={demo.state.cart.lines.length === 0 || !demo.can('pos')}
					onclick={() => {
						const result = demo.createOpenOrder();
						if (result.ok) {
							demo.flash(m.open_order_saved());
							return;
						}
						if (result.code === 'empty') demo.flash(m.open_needs_items());
						else if (result.code === 'table') demo.flash(m.open_needs_table());
						else if (result.code === 'delivery') demo.flash(m.open_needs_delivery());
						else if (result.code === 'disabled') demo.flash(m.persist_open_orders_hint());
						else demo.flash(m.permission_denied());
					}}
				>
					{demo.state.cart.openOrderId ? m.save_open_order() : m.open_order()}
				</button>
			{/if}
		</div>
		<!-- Horpao-style checkout strip inside cart; Coffee Plus green. -->
		<div class="pos-checkout-bar {totalPulse ? 'ui-total-pulse' : ''}">
			<div class="min-w-0 flex-1">
				<p class="text-xs text-white/80">{m.total()}</p>
				<p class="num truncate text-base font-bold">{formatUsd(totals.total)} · {formatKhr(totals.totalKhr)}</p>
			</div>
			<button
				class="pos-checkout-bar-cta"
				type="button"
				disabled={demo.state.cart.lines.length === 0 || !demo.can('pos')}
				title={!demo.can('pos') ? m.permission_denied() : !demo.currentShift ? m.shift_required() : ''}
				onclick={() => {
					if (!demo.currentShift) {
						demo.flash(m.shift_required());
						return;
					}
					demo.openCheckout();
				}}>{m.checkout()}</button>
		</div>
	</div>
</section>
