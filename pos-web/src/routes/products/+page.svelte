<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import ProductThumb from '$lib/components/product-thumb.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { formatUsd } from '$lib/domain/money';
	import { resolveProduct, upsertBranchOverride } from '$lib/domain/product-resolve';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Product } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Archive, ArchiveRestore, CircleCheck, PackageX, Pencil, Plus } from 'lucide-svelte';

	let query = $state('');
	let categoryId = $state('ALL');
	let availability = $state<'ALL' | 'IN' | 'OUT' | 'INACTIVE'>('ALL');
	let editing = $state<Product | null>(null);
	let dollars = $state('0.00');
	let branchAvail = $state<'inherit' | 'yes' | 'no'>('inherit');
	let branchDollars = $state('');

	const canEdit = $derived(demo.can('products'));
	const branchId = $derived(demo.state.activeBranchId);

	const rows = $derived(
		[...demo.state.products]
			.sort((a, b) => a.sortOrder - b.sortOrder || a.name.en.localeCompare(b.name.en))
			.filter((product) => {
				if (categoryId !== 'ALL' && product.categoryId !== categoryId) return false;
				const resolved = resolveProduct(product, branchId);
				if (availability === 'IN' && (!resolved.available || !product.active)) return false;
				if (availability === 'OUT' && (resolved.available || !product.active)) return false;
				if (availability === 'INACTIVE' && product.active) return false;
				if (!query.trim()) return true;
				return `${product.name.en} ${product.name.kh} ${product.sku}`.toLowerCase().includes(query.trim().toLowerCase());
			})
	);

	function cloneProduct(product: Product): Product {
		return {
			...product,
			name: { ...product.name },
			description: { ...product.description },
			modifierGroupIds: [...product.modifierGroupIds],
			branchOverrides: product.branchOverrides.map((row) => ({ ...row }))
		};
	}

	function sold(productId: string) {
		return demo.state.orders
			.filter(
				(order) =>
					order.orderStatus !== 'CANCELLED' &&
					(order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND')
			)
			.reduce(
				(sum, order) =>
					sum + order.lines.filter((line) => line.productId === productId).reduce((inner, line) => inner + line.quantity, 0),
				0
			);
	}

	function loadBranchFields(product: Product) {
		const override = product.branchOverrides.find((row) => row.branchId === branchId);
		branchAvail = override?.available === undefined ? 'inherit' : override.available ? 'yes' : 'no';
		branchDollars = override?.basePrice !== undefined ? (override.basePrice / 100).toFixed(2) : '';
	}

	function openNew() {
		editing = {
			id: '',
			sku: '',
			erpItemId: '',
			name: { en: '', kh: '' },
			description: { en: '', kh: '' },
			type: 'DRINK',
			categoryId: demo.state.categories.find((item) => item.active)?.id ?? demo.state.categories[0]?.id ?? '',
			imageUrl: '',
			basePrice: 0,
			modifierGroupIds: [],
			active: true,
			available: true,
			preparesInKitchen: true,
			taxCategoryId: demo.state.settings.tax.id,
			sortOrder: demo.state.products.length + 1,
			branchOverrides: []
		};
		dollars = '0.00';
		branchAvail = 'inherit';
		branchDollars = '';
	}

	function openEdit(product: Product) {
		editing = cloneProduct(product);
		dollars = (product.basePrice / 100).toFixed(2);
		loadBranchFields(product);
	}

	function onPhoto(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file || !editing) return;
		if (file.size > 350000) {
			demo.flash(m.image_large());
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (editing && typeof reader.result === 'string') editing.imageUrl = reader.result;
		};
		reader.readAsDataURL(file);
	}

	function toggleAvailable(product: Product) {
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const resolved = resolveProduct(product, branchId);
		const next = !resolved.available;
		if (!demo.setProductAvailability(product.id, next)) demo.flash(m.permission_denied());
		else demo.flash(next ? m.marked_available() : m.marked_sold_out());
	}

	function archiveToggle(product: Product) {
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const archived = product.active;
		if (!demo.setProductArchived(product.id, archived)) {
			demo.flash(m.permission_denied());
			return;
		}
		if (editing?.id === product.id) editing.active = !archived;
		demo.flash(archived ? m.product_archived() : m.product_restored());
	}

	function applyBranchFields(product: Product): Product {
		let branchOverrides = product.branchOverrides;
		const availPatch =
			branchAvail === 'inherit' ? null : branchAvail === 'yes';
		const pricePatch =
			branchDollars.trim() === '' ? null : Math.max(0, Math.round(Number(branchDollars) * 100));
		if (pricePatch !== null && !Number.isFinite(pricePatch)) return product;
		branchOverrides = upsertBranchOverride(branchOverrides, branchId, {
			available: availPatch,
			basePrice: pricePatch
		});
		return { ...product, branchOverrides };
	}

	function save(forceZero = false) {
		if (!editing || !canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const cents = Math.round(Number(dollars) * 100);
		if (cents === 0 && !forceZero) {
			demo.ask({ title: m.zero_price(), body: m.zero_price(), confirmLabel: m.zero_ok(), onYes: () => save(true) });
			return;
		}
		const withBranch = applyBranchFields({ ...editing, basePrice: cents, erpItemId: editing.erpItemId || editing.sku });
		const result = demo.saveProduct(withBranch);
		if (result === 'name') demo.flash(m.both_names());
		else if (result === 'price') demo.flash(m.price_invalid());
		else if (result === 'category') demo.flash(m.category_required());
		else if (result === 'sku') demo.flash(m.sku_unique());
		else if (result === 'tax') demo.flash(m.tax_invalid());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else {
			editing = null;
			demo.flash(m.product_saved());
		}
	}

	const categoryOptions = $derived([
		{ value: 'ALL', label: m.filter_all() },
		...demo.state.categories.map((category) => ({ value: category.id, label: label(category.name) }))
	]);

	const editorCategories = $derived(
		demo.state.categories
			.filter((category) => category.active || category.id === editing?.categoryId)
			.map((category) => ({ value: category.id, label: label(category.name) }))
	);

	const taxOptions = $derived(
		demo.state.taxCategories
			.filter((tax) => tax.active || tax.id === editing?.taxCategoryId)
			.map((tax) => ({
				value: tax.id,
				label: `${label(tax.name)} (${(tax.rateBasisPoints / 100).toFixed(tax.rateBasisPoints % 100 === 0 ? 0 : 2)}%)`
			}))
	);
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-semibold">{m.products_title()}</h1>
			<IconAction
				label={canEdit ? m.add_product() : m.permission_denied()}
				icon={Plus}
				tone="solid"
				disabled={!canEdit}
				onclick={openNew}
			/>
		</div>
		{#if !canEdit}<p class="mt-2 text-sm text-muted">{m.view_only_menu()}</p>{/if}
		<div class="mt-4 grid gap-2 md:grid-cols-3">
			<input class="field" placeholder={m.search()} aria-label={m.search()} bind:value={query} />
			<SelectMenu ariaLabel={m.category_filter()} bind:value={categoryId} options={categoryOptions} />
			<SelectMenu
				ariaLabel={m.availability_filter()}
				bind:value={availability}
				options={[
					{ value: 'ALL', label: m.all_availability() },
					{ value: 'IN', label: m.only_available() },
					{ value: 'OUT', label: m.only_unavailable() },
					{ value: 'INACTIVE', label: m.only_inactive() }
				]}
			/>
		</div>
	</div>
	<div class="card page-list-grid">
		<table class="w-full min-w-[760px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.item()}</th>
					<th class="px-3 py-3">{m.sku_label()}</th>
					<th class="px-3 py-3">{m.category()}</th>
					<th class="px-3 py-3 text-right">{m.price()}</th>
					<th class="px-3 py-3">{m.availability()}</th>
					<th class="px-3 py-3 text-right">{m.product_sales()}</th>
					<th class="px-3 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as product (product.id)}
					{@const resolved = resolveProduct(product, branchId)}
					<tr class="border-t border-line">
						<td class="px-3 py-3">
							<div class="flex items-center gap-3">
								<ProductThumb src={product.imageUrl} class="h-12 w-12 shrink-0" />
								<div>
									<p class="font-semibold">{label(product.name)}</p>
									{#if !product.active}<span class="badge badge-neutral">{m.inactive()}</span>{/if}
								</div>
							</div>
						</td>
						<td class="px-3 py-3">{product.sku || '—'}</td>
						<td class="px-3 py-3">{label(demo.state.categories.find((item) => item.id === product.categoryId)?.name)}</td>
						<td class="num px-3 py-3 text-right">{formatUsd(resolved.basePrice)}</td>
						<td class="px-3 py-3">
							<span class="badge {resolved.available && product.active ? 'badge-ok' : 'badge-danger'}">
								{!product.active ? m.inactive() : resolved.available ? m.available() : m.sold_out()}
							</span>
						</td>
						<td class="num px-3 py-3 text-right">{sold(product.id)}</td>
						<td class="px-3 py-3 text-right">
							<div class="icon-action-group">
								{#if canEdit && product.active}
									<IconAction
										label={resolved.available ? m.mark_sold_out() : m.mark_in_stock()}
										icon={resolved.available ? PackageX : CircleCheck}
										tone="muted"
										onclick={() => toggleAvailable(product)}
									/>
								{/if}
								{#if canEdit}
									<IconAction
										label={product.active ? m.archive() : m.restore()}
										icon={product.active ? Archive : ArchiveRestore}
										tone="muted"
										onclick={() => archiveToggle(product)}
									/>
								{/if}
								<IconAction label={m.edit()} icon={Pencil} onclick={() => openEdit(product)} />
							</div>
						</td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-muted" colspan="7">{m.no_results()}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if editing}
	{@const draft = editing}
	<Dialog title={draft.id ? m.edit_product() : m.add_product()} onclose={() => (editing = null)} wide>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={draft.name.en} /></label>
			<label class="text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={draft.name.kh} /></label>
			<label class="text-sm font-semibold">{m.sku()}<input class="field mt-1" bind:value={draft.sku} placeholder={m.sku_auto()} /></label>
			<label class="text-sm font-semibold">{m.erp_ref()}<input class="field mt-1" bind:value={draft.erpItemId} /></label>
			<label class="text-sm font-semibold"
				>{m.category()}
				<SelectMenu class="mt-1" bind:value={draft.categoryId} options={editorCategories} />
			</label>
			<label class="text-sm font-semibold"
				>{m.type()}
				<SelectMenu
					class="mt-1"
					bind:value={draft.type}
					options={[
						{ value: 'DRINK', label: m.drink() },
						{ value: 'FOOD', label: m.food() },
						{ value: 'BAKERY', label: m.bakery() },
						{ value: 'OTHER', label: m.other() }
					]}
				/>
			</label>
			<label class="text-sm font-semibold"
				>{m.price()}
				<NumberField class="mt-1" min={0} step={0.01} bind:value={dollars} ariaLabel={m.price()} />
			</label>
			<label class="text-sm font-semibold"
				>{m.sort_order()}
				<NumberField class="mt-1" step={1} bind:intValue={draft.sortOrder} ariaLabel={m.sort_order()} />
			</label>
			<label class="text-sm font-semibold"
				>{m.tax_category()}
				<SelectMenu class="mt-1" bind:value={draft.taxCategoryId} options={taxOptions} />
			</label>
			<label class="text-sm font-semibold">{m.image()}<input class="field mt-1" type="file" accept="image/*" onchange={onPhoto} /></label>
			<label class="text-sm font-semibold md:col-span-2">{m.description_en()}<input class="field mt-1" bind:value={draft.description.en} /></label>
			<label class="text-sm font-semibold md:col-span-2">{m.description_kh()}<input class="field mt-1" bind:value={draft.description.kh} /></label>
		</div>
		<div class="mt-3 flex items-center gap-3">
			<ProductThumb src={draft.imageUrl} class="h-16 w-16" />
			{#if draft.imageUrl}
				<button class="btn btn-secondary btn-sm" type="button" onclick={() => (draft.imageUrl = '')}>{m.remove_image()}</button>
			{/if}
		</div>
		<fieldset class="mt-3">
			<legend class="text-sm font-semibold">{m.groups_for_product()}</legend>
			<div class="mt-2 grid gap-1.5 sm:grid-cols-2">
				{#each demo.state.modifierGroups.filter((group) => group.active || draft.modifierGroupIds.includes(group.id)) as group (group.id)}
					<UiCheckbox
						class="ui-check-row"
						checked={draft.modifierGroupIds.includes(group.id)}
						label={label(group.name)}
						onchange={(on: boolean) => {
							draft.modifierGroupIds = on
								? [...draft.modifierGroupIds, group.id]
								: draft.modifierGroupIds.filter((id) => id !== group.id);
						}}
					/>
				{/each}
			</div>
		</fieldset>
		<fieldset class="mt-4 rounded border border-line p-3">
			<legend class="px-1 text-sm font-semibold">{m.branch_override()} · {label(demo.branch.name)}</legend>
			<div class="mt-2 grid gap-3 md:grid-cols-2">
				<label class="text-sm font-semibold"
					>{m.branch_availability()}
					<SelectMenu
						class="mt-1"
						bind:value={branchAvail}
						options={[
							{ value: 'inherit', label: m.inherit_default() },
							{ value: 'yes', label: m.available() },
							{ value: 'no', label: m.sold_out() }
						]}
					/>
				</label>
				<label class="text-sm font-semibold"
					>{m.branch_price()}
					<NumberField
						class="mt-1"
						min={0}
						step={0.01}
						bind:value={branchDollars}
						placeholder={m.inherit_default()}
						ariaLabel={m.branch_price()}
					/>
				</label>
			</div>
		</fieldset>
		<div class="mt-3 flex flex-wrap gap-4">
			<UiCheckbox bind:checked={draft.active} label={m.active_product()} />
			<UiCheckbox bind:checked={draft.available} label={m.available_product()} />
			<UiCheckbox bind:checked={draft.preparesInKitchen} label={m.kitchen_item()} />
		</div>
		<p class="mt-3 text-sm text-muted">{m.product_sales()}: {draft.id ? sold(draft.id) : 0}</p>
		{#snippet footer()}
			<div class="flex flex-wrap items-center justify-end gap-2">
				{#if draft.id && canEdit}
					<button class="btn btn-secondary" type="button" onclick={() => archiveToggle(draft)}>
						{draft.active ? m.archive() : m.restore()}
					</button>
				{/if}
				<button class="btn btn-secondary" type="button" onclick={() => (editing = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canEdit} onclick={() => save()}>{m.save_product()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
