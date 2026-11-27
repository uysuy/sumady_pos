<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Category } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Layers, Pencil, Plus } from 'lucide-svelte';

	let query = $state('');
	let availability = $state<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
	let category = $state<Category | null>(null);

	const canEdit = $derived(demo.can('products'));
	const rows = $derived(
		[...demo.state.categories]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.filter((item) => {
				if (availability === 'ACTIVE' && !item.active) return false;
				if (availability === 'INACTIVE' && item.active) return false;
				if (!query.trim()) return true;
				const q = query.trim().toLowerCase();
				return `${item.name.en} ${item.name.kh} ${item.description.en} ${item.description.kh}`.toLowerCase().includes(q);
			})
	);

	function productCount(categoryId: string) {
		return demo.state.products.filter((product) => product.categoryId === categoryId).length;
	}

	function cloneCategory(item: Category): Category {
		return {
			...item,
			name: { ...item.name },
			description: { ...item.description }
		};
	}

	function openCategory(item?: Category) {
		category = item
			? cloneCategory(item)
			: {
					id: crypto.randomUUID(),
					name: { en: '', kh: '' },
					description: { en: '', kh: '' },
					sortOrder: demo.state.categories.length + 1,
					active: true
				};
	}

	function saveCategory() {
		if (!category) return;
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const result = demo.saveCategory(category);
		if (result !== 'ok') demo.flash(result === 'permission' ? m.permission_denied() : m.both_names());
		else {
			category = null;
			demo.flash(m.category_saved());
		}
	}
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-semibold">{m.categories_title()}</h1>
			<IconAction
				label={canEdit ? m.add_category() : m.permission_denied()}
				icon={Plus}
				tone="solid"
				disabled={!canEdit}
				onclick={() => openCategory()}
			/>
		</div>
		{#if !canEdit}<p class="mt-2 text-sm text-muted">{m.view_only_menu()}</p>{/if}
		<div class="mt-4 grid gap-2 md:grid-cols-2">
			<input class="field" placeholder={m.search()} aria-label={m.search()} bind:value={query} />
			<SelectMenu
				ariaLabel={m.availability_filter()}
				bind:value={availability}
				options={[
					{ value: 'ALL', label: m.all_availability() },
					{ value: 'ACTIVE', label: m.active() },
					{ value: 'INACTIVE', label: m.only_inactive() }
				]}
			/>
		</div>
	</div>
	<div class="card page-list-grid">
		<table class="w-full min-w-[720px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.item()}</th>
					<th class="px-3 py-3">{m.name_en()}</th>
					<th class="px-3 py-3">{m.name_kh()}</th>
					<th class="px-3 py-3 text-right">{m.product_count()}</th>
					<th class="px-3 py-3 text-right">{m.sort_order()}</th>
					<th class="px-3 py-3">{m.availability()}</th>
					<th class="px-3 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as item (item.id)}
					<tr class="border-t border-line">
						<td class="px-3 py-3">
							<div class="flex items-center gap-3">
								<span class="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
									<Layers size={22} />
								</span>
								<div>
									<p class="font-semibold">{label(item.name)}</p>
									{#if label(item.description)}
										<p class="text-xs text-muted">{label(item.description)}</p>
									{/if}
								</div>
							</div>
						</td>
						<td class="px-3 py-3">{item.name.en}</td>
						<td class="px-3 py-3">{item.name.kh}</td>
						<td class="num px-3 py-3 text-right">{productCount(item.id)}</td>
						<td class="num px-3 py-3 text-right">{item.sortOrder}</td>
						<td class="px-3 py-3">
							<span class="badge {item.active ? 'badge-ok' : 'badge-neutral'}">
								{item.active ? m.active() : m.inactive()}
							</span>
						</td>
						<td class="px-3 py-3 text-right">
							<div class="icon-action-group">
								<IconAction label={m.edit()} icon={Pencil} onclick={() => openCategory(item)} />
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

{#if category}
	{@const draftCategory = category}
	{@const isNew = !demo.state.categories.some((item) => item.id === draftCategory.id)}
	<Dialog title={isNew ? m.add_category() : m.edit_category()} onclose={() => (category = null)}>
		<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={draftCategory.name.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={draftCategory.name.kh} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.description_en()}<input class="field mt-1" bind:value={draftCategory.description.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.description_kh()}<input class="field mt-1" bind:value={draftCategory.description.kh} /></label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.sort_order()}
			<NumberField class="mt-1" step={1} bind:intValue={draftCategory.sortOrder} ariaLabel={m.sort_order()} />
		</label>
		<div class="mt-3">
			<UiCheckbox bind:checked={draftCategory.active} label={m.active()} />
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (category = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canEdit} onclick={saveCategory}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
