<script lang="ts">
	import CartPanel from '$lib/components/cart-panel.svelte';
	import CheckoutDialog from '$lib/components/checkout-dialog.svelte';
	import CustomizeDialog from '$lib/components/customize-dialog.svelte';
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import { formatKhr, formatUsd, toKhr } from '$lib/domain/money';
	import { resolveProduct } from '$lib/domain/product-resolve';
	import { href, label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Customer, Product } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { motionMs } from '$lib/motion';
	import {
		Cake,
		Coffee,
		Croissant,
		CupSoda,
		Flame,
		IceCream,
		LayoutGrid,
		Leaf,
		Martini,
		Play,
		Plus,
		Salad,
		Sandwich,
		Search,
		ShoppingCart,
		Snowflake,
		Soup,
		Trash2,
		UtensilsCrossed,
		Wine
	} from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	let cartBump = $state(false);
	let lastCartCount = $state(-1);
	const cartCount = $derived(demo.state.cart.lines.reduce((sum, line) => sum + line.quantity, 0));
	const cartTotals = $derived.by(() => {
		demo.state.cart.lines;
		demo.state.cart.discountMode;
		demo.state.cart.discountValue;
		demo.state.settings.tax;
		demo.state.settings.usdToKhr;
		return demo.cartTotals();
	});
	const cartProductIds = $derived(new Set(demo.state.cart.lines.map((line) => line.productId)));
	const rate = $derived(demo.state.settings.usdToKhr);
	$effect(() => {
		const count = cartCount;
		if (lastCartCount < 0) {
			lastCartCount = count;
			return;
		}
		if (count <= lastCartCount) {
			lastCartCount = count;
			return;
		}
		lastCartCount = count;
		cartBump = true;
		const timer = window.setTimeout(() => (cartBump = false), motionMs(280));
		return () => clearTimeout(timer);
	});

	const categoryIcon: Record<string, typeof Coffee> = {
		cat_coffee: Coffee,
		cat_tea: Leaf,
		cat_noncoffee: CupSoda,
		cat_cold: Snowflake,
		cat_bakery: Croissant,
		cat_pastries: Cake,
		cat_food: Sandwich,
		cat_starters: Salad,
		cat_mains: UtensilsCrossed,
		cat_grill: Flame,
		cat_noodles: Soup,
		cat_desserts: IceCream,
		cat_skybar: Martini,
		cat_bar_snacks: Wine
	};

	let cartClosing = $state(false);
	let holdRef = $state('');
	let askCustomer = $state(false);
	const cartOpen = $derived(demo.cartOpen);

	$effect(() => {
		if (typeof document === 'undefined') return;
		if (!cartOpen && !demo.checkoutOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});

	function openCart() {
		cartClosing = false;
		demo.openCart();
	}

	function closeCart() {
		if (!demo.cartOpen || cartClosing) return;
		if (motionMs(250) === 0) {
			demo.closeCart();
			cartClosing = false;
			return;
		}
		cartClosing = true;
		window.setTimeout(() => {
			demo.closeCart();
			cartClosing = false;
		}, 250);
	}

	let customerForm = $state<Customer>({
		id: '',
		name: { en: '', kh: '' },
		phone: '',
		email: '',
		active: true,
		createdAt: ''
	});

	const categories = $derived(demo.state.categories.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder));
	const activeProduct = $derived(
		demo.customizeProductId ? (demo.resolvedProduct(demo.customizeProductId) ?? null) : null
	);
	const held = $derived(
		demo.state.orders.filter((order) => order.orderStatus === 'HELD' && order.branchId === demo.state.activeBranchId)
	);
	const openChecks = $derived(
		demo.state.orders.filter((order) => order.orderStatus === 'OPEN' && order.branchId === demo.state.activeBranchId)
	);
	const visible = $derived.by(() => {
		const query = demo.posQuery.trim().toLowerCase();
		const branchId = demo.state.activeBranchId;
		return [...demo.state.products]
			.map((product) => resolveProduct(product, branchId))
			.filter((product) => {
				if (!product.active) return false;
				const category = demo.state.categories.find((item) => item.id === product.categoryId);
				if (!category?.active) return false;
				if (demo.posCategory !== 'all' && product.categoryId !== demo.posCategory) return false;
				if (!query) return true;
				return `${product.name.en} ${product.name.kh} ${product.sku}`.toLowerCase().includes(query);
			})
			.sort((a, b) => a.sortOrder - b.sortOrder || a.name.en.localeCompare(b.name.en));
	});

	function pick(product: Product) {
		if (!demo.can('pos')) {
			demo.flash(m.permission_denied());
			return;
		}
		if (!product.available) {
			demo.flash(m.unavailable_msg());
			return;
		}
		if (product.modifierGroupIds.length === 0) {
			demo.addQuick(product.id);
			demo.flash(m.quick_add());
			return;
		}
		// Always add a new configured line. Edit existing lines from the cart pencil only —
		// otherwise Size L then Size S would overwrite the first line instead of adding a second.
		demo.openCustomize(product.id);
	}

	function saveHold() {
		if (!demo.state.cart.lines.length) {
			demo.flash(m.hold_needs_items());
			return;
		}
		const ok = demo.hold(holdRef);
		if (ok) {
			demo.flash(m.held_saved());
			holdRef = '';
			demo.composeHold = false;
		}
	}

	function resume(id: string) {
		if (demo.state.cart.lines.length) {
			demo.ask({
				title: m.resume(),
				body: m.replace_cart(),
				confirmLabel: m.resume(),
				onYes: () => {
					demo.resume(id);
					demo.flash(m.resume_ok());
					demo.heldOpen = false;
				}
			});
			return;
		}
		demo.resume(id);
		demo.flash(m.resume_ok());
	}

	function loadOpen(id: string) {
		const run = () => {
			if (demo.loadOpenOrder(id)) demo.flash(m.open_order_loaded());
		};
		if (demo.state.cart.lines.length && demo.state.cart.openOrderId !== id) {
			demo.ask({
				title: m.open_orders(),
				body: m.replace_cart(),
				confirmLabel: m.open_order(),
				onYes: run
			});
			return;
		}
		run();
	}

	function saveCustomer() {
		const id = customerForm.id || crypto.randomUUID();
		const result = demo.saveCustomer({
			...customerForm,
			id,
			name: { en: customerForm.name.en.trim(), kh: customerForm.name.kh.trim() },
			active: true
		});
		if (result === 'name') demo.flash(m.both_names());
		else if (result === 'phone') demo.flash(m.phone_invalid());
		else if (result === 'email') demo.flash(m.email_invalid());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else {
			demo.setCustomer(id);
			askCustomer = false;
			demo.flash(m.customer_added());
		}
	}
</script>

<div class="flex h-full min-h-0">
	<section class="flex min-w-0 flex-1 flex-col">
		<div class="border-b border-line bg-white px-3 py-2">
			<div class="flex items-center gap-2">
				<label class="field flex min-w-0 flex-1 items-center gap-1.5 !py-0">
					<Search class="shrink-0 text-muted" size={16} aria-hidden="true" />
					<input
						class="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
						placeholder={m.search_products()}
						aria-label={m.header_search()}
						value={demo.posQuery}
						oninput={(event) => (demo.posQuery = (event.target as HTMLInputElement).value)}
					/>
				</label>
				{#if demo.posQuery}
					<button class="btn btn-secondary btn-sm shrink-0" type="button" onclick={() => (demo.posQuery = '')}>{m.clear_search()}</button>
				{/if}
				<IconAction label={m.add_customer()} icon={Plus} tone="solid" onclick={() => (askCustomer = true)} />
			</div>
			{#if demo.posQuery && demo.posCategory !== 'all'}
				<p class="mt-1.5 text-xs text-muted">{m.searching_in()} {label(categories.find((item) => item.id === demo.posCategory)?.name)}</p>
			{/if}
			<div class="mt-2 flex gap-1.5 overflow-auto pb-0.5">
				<button class="chip chip-sm shrink-0 gap-1.5" type="button" aria-pressed={demo.posCategory === 'all'} onclick={() => (demo.posCategory = 'all')}>
					<LayoutGrid size={14} />
					{m.all_items()}
				</button>
				{#each categories as category (category.id)}
					{@const Icon = categoryIcon[category.id] ?? Coffee}
					<button class="chip chip-sm shrink-0 gap-1.5" type="button" aria-pressed={demo.posCategory === category.id} onclick={() => (demo.posCategory = category.id)}>
						<Icon size={14} />
						{label(category.name)}
					</button>
				{/each}
			</div>
			{#if !demo.currentShift}
				<div class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded bg-warning/15 px-3 py-2 text-sm text-warning">
					<span>{m.shift_required()}</span>
					<a class="btn btn-secondary btn-sm" href={href('/shifts')}>{m.open_shift_to_pay()}</a>
				</div>
			{/if}
			{#if demo.state.demoLink === 'offline'}
				<div class="mt-2 rounded bg-info/10 px-3 py-2 text-sm text-info">
					{m.link_offline()} — {m.offline_card()}
				</div>
			{/if}
		</div>
		<div class="@container min-h-0 flex-1 overflow-auto p-3 {cartCount > 0 ? 'pb-24 xl:pb-3' : 'pb-3'}">
			{#key demo.posCategory}
				<div class="ui-category-panel">
					{#if visible.length === 0}
						<div class="card p-8 text-center">
							<p class="font-semibold">{m.search_empty()}</p>
							{#if demo.posCategory !== 'all'}
								<button class="btn btn-primary mt-4" type="button" onclick={() => (demo.posCategory = 'all')}>{m.search_all()}</button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-3 gap-2 @min-[28rem]:grid-cols-4 @min-[46rem]:grid-cols-5 @min-[64rem]:grid-cols-6">
							{#each visible as product (product.id)}
								<button
									class="product-card {product.available ? '' : 'opacity-70'} {cartProductIds.has(product.id) ? 'is-in-cart' : ''}"
									type="button"
									onclick={() => pick(product)}
								>
									<div class="product-card-media">
										{#if product.imageUrl}
											<img class="product-card-img" src={product.imageUrl} alt="" />
										{:else}
											<span class="product-card-img grid place-items-center bg-brand-50 text-brand-700" aria-hidden="true">
												<Coffee size={28} />
											</span>
										{/if}
									</div>
									<div class="product-card-body">
										<p class="product-card-name">
											{label(product.name)}
											{#if !product.available}<span class="badge badge-danger ml-1">{m.sold_out()}</span>{/if}
										</p>
										<p class="product-card-price-usd num">{formatUsd(product.basePrice)}</p>
										<p class="product-card-price-khr num">{formatKhr(toKhr(product.basePrice, rate))}</p>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Sticky current-order bar — only while the cart has items (mobile/tablet). -->
		{#if cartCount > 0}
			<div class="pos-checkout-bar xl:hidden {cartBump ? 'ui-cart-bump' : ''}">
				<button class="flex min-w-0 flex-1 items-center gap-2 text-left" type="button" onclick={openCart}>
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
						<ShoppingCart size={18} />
					</span>
					<span class="min-w-0">
						<span class="block truncate text-sm font-semibold">{m.cart()} · {cartCount}</span>
						<span class="num block text-xs text-white/80">{formatUsd(cartTotals.total)} · {formatKhr(cartTotals.totalKhr)}</span>
					</span>
				</button>
				<button
					class="pos-checkout-bar-cta"
					type="button"
					disabled={!demo.can('pos')}
					onclick={() => {
						if (!demo.currentShift) {
							demo.flash(m.shift_required());
							return;
						}
						demo.openCheckout();
					}}
				>{m.checkout()}</button>
			</div>
		{/if}
	</section>
	<aside class="hidden h-full min-h-0 w-80 shrink-0 border-l border-line xl:flex xl:flex-col 2xl:w-96">
		<CartPanel />
	</aside>
</div>
{#if cartOpen}
	<button
		class="fixed inset-0 z-40 cursor-pointer bg-ink/40 xl:hidden {cartClosing ? 'ui-overlay-fade-out' : 'ui-overlay-fade'}"
		type="button"
		aria-label={m.hide_cart()}
		onclick={closeCart}
	></button>
	<div
		class="fixed inset-y-0 right-0 z-50 flex h-full w-[min(100%,420px)] flex-col bg-white shadow-2xl will-change-transform xl:hidden {cartClosing ? 'ui-drawer-out' : 'ui-drawer'}"
		role="dialog"
		aria-modal="true"
		aria-label={m.show_cart()}
	>
		<CartPanel />
	</div>
{/if}

{#if demo.checkoutOpen}
	<CheckoutDialog />
{/if}
{#if activeProduct}
	{#key demo.customizeSession}
		<CustomizeDialog
			product={activeProduct}
			lineId={demo.editingLineId}
			initialQty={demo.editingLineId
				? (demo.state.cart.lines.find((line) => line.id === demo.editingLineId)?.quantity ?? 1)
				: 1}
		/>
	{/key}
{/if}
{#if demo.heldOpen}
	<Dialog title={m.held_orders()} onclose={() => (demo.heldOpen = false)}>
		<p class="text-sm text-muted">{m.held_excluded()}</p>
		{#if held.length === 0}
			<p class="mt-4 text-sm">{m.no_held()}</p>
		{/if}
		<ul class="mt-3 space-y-2">
			{#each held as order (order.id)}
				<li class="rounded border border-line p-3">
					<p class="font-semibold">{order.holdReference || order.orderNumber}</p>
					<p class="text-xs text-muted">{order.lines.length} {m.items()} · {formatUsd(order.totals.total)}</p>
					<div class="mt-2 icon-action-group">
						<IconAction
							label={m.cancel_hold()}
							icon={Trash2}
							tone="danger"
							onclick={() =>
								demo.ask({
									title: m.cancel_hold(),
									body: m.cancel_hold_body(),
									confirmLabel: m.cancel_hold(),
									danger: true,
									onYes: () => {
										demo.cancelHeld(order.id);
										demo.flash(m.cancelled_ok());
									}
								})}
						/>
						<IconAction label={m.resume()} icon={Play} onclick={() => resume(order.id)} />
					</div>
				</li>
			{/each}
		</ul>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (demo.heldOpen = false)}>{m.close()}</button>
				<button class="btn btn-primary" type="button" onclick={() => (demo.composeHold = true)}>{m.hold()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
{#if demo.composeHold}
	<Dialog title={m.hold_title()} onclose={() => (demo.composeHold = false)}>
		<label class="text-sm font-semibold" for="hold-ref">{m.hold_reference()}</label>
		<input id="hold-ref" class="field mt-1" bind:value={holdRef} placeholder={m.optional_note()} />
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (demo.composeHold = false)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={saveHold}>{m.hold()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
{#if demo.openOrdersOpen}
	<Dialog title={m.open_orders()} onclose={() => (demo.openOrdersOpen = false)}>
		<p class="text-sm text-muted">{m.persist_open_orders_hint()}</p>
		{#if openChecks.length === 0}
			<p class="mt-4 text-sm">{m.no_open_orders()}</p>
		{/if}
		<ul class="mt-3 space-y-2">
			{#each openChecks as order (order.id)}
				{@const tableName = order.tableId
					? (demo.state.tables.find((table) => table.id === order.tableId)?.name ?? order.tableId)
					: '—'}
				<li class="rounded border border-line p-3">
					<p class="font-semibold">
						{#if order.waitingNumber}
							<span class="num text-brand-700">{order.waitingNumber}</span>
							<span class="text-muted"> · {order.orderNumber}</span>
						{:else}
							{order.orderNumber}
						{/if}
					</p>
					<p class="text-xs text-muted">
						{m.table()}: {tableName} · {order.lines.length} {m.items()} · {formatUsd(order.totals.total)}
					</p>
					<div class="mt-2 icon-action-group">
						<IconAction
							label={m.cancel_open()}
							icon={Trash2}
							tone="danger"
							onclick={() =>
								demo.ask({
									title: m.cancel_open(),
									body: m.cancel_open_body(),
									confirmLabel: m.cancel_open(),
									danger: true,
									onYes: () => {
										demo.cancelOpenOrder(order.id);
										demo.flash(m.cancelled_ok());
									}
								})}
						/>
						<IconAction label={m.open_order()} icon={Play} onclick={() => loadOpen(order.id)} />
					</div>
				</li>
			{/each}
		</ul>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (demo.openOrdersOpen = false)}>{m.close()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
{#if askCustomer}
	<Dialog title={m.new_customer()} onclose={() => (askCustomer = false)}>
		<label class="text-sm font-semibold" for="c-en">{m.name_en()}</label>
		<input id="c-en" class="field mt-1" bind:value={customerForm.name.en} />
		<label class="mt-3 block text-sm font-semibold" for="c-kh">{m.name_kh()}</label>
		<input id="c-kh" class="field mt-1" bind:value={customerForm.name.kh} />
		<label class="mt-3 block text-sm font-semibold" for="c-phone">{m.phone()}</label>
		<input id="c-phone" class="field mt-1" bind:value={customerForm.phone} />
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (askCustomer = false)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={saveCustomer}>{m.save_and_select()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

<p class="sr-only"><a href={href('/orders')}>{m.nav_orders()}</a></p>
