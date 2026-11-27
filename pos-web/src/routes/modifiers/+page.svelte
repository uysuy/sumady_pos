<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { formatUsd } from '$lib/domain/money';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { ModifierGroup, ModifierOption } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-svelte';

	let query = $state('');
	let availability = $state<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
	let draftGroup = $state<ModifierGroup | null>(null);

	const canEdit = $derived(demo.can('products'));
	const rows = $derived(
		[...demo.state.modifierGroups]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.filter((item) => {
				if (availability === 'ACTIVE' && !item.active) return false;
				if (availability === 'INACTIVE' && item.active) return false;
				if (!query.trim()) return true;
				const q = query.trim().toLowerCase();
				const optionText = item.options.map((option) => `${option.name.en} ${option.name.kh}`).join(' ');
				return `${item.name.en} ${item.name.kh} ${optionText}`.toLowerCase().includes(q);
			})
	);

	function cloneGroup(item: ModifierGroup): ModifierGroup {
		return {
			...item,
			name: { ...item.name },
			options: item.options.map((option) => ({ ...option, name: { ...option.name } }))
		};
	}

	function selectGroup(item: ModifierGroup) {
		draftGroup = cloneGroup(item);
	}

	function startNewGroup() {
		draftGroup = {
			id: crypto.randomUUID(),
			name: { en: '', kh: '' },
			selectionMode: 'SINGLE',
			required: false,
			minSelections: 0,
			maxSelections: 1,
			active: true,
			sortOrder: demo.state.modifierGroups.length + 1,
			options: [{ id: crypto.randomUUID(), name: { en: '', kh: '' }, priceDelta: 0, active: true, sortOrder: 1 }]
		};
	}

	function saveGroup() {
		if (!draftGroup) return;
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const result = demo.saveModifierGroup(draftGroup);
		if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'name') demo.flash(m.both_names());
		else if (result === 'options') demo.flash(m.option_required());
		else if (result === 'limits') demo.flash(m.modifier_limits());
		else {
			draftGroup = null;
			demo.flash(m.group_saved());
		}
	}

	function addOption() {
		if (!draftGroup) return;
		const option: ModifierOption = {
			id: crypto.randomUUID(),
			name: { en: '', kh: '' },
			priceDelta: 0,
			active: true,
			sortOrder: draftGroup.options.length + 1
		};
		draftGroup = { ...draftGroup, options: [...draftGroup.options, option] };
	}

	function removeOption(id: string) {
		if (!draftGroup) return;
		draftGroup = { ...draftGroup, options: draftGroup.options.filter((option) => option.id !== id) };
	}

	function modeLabel(mode: ModifierGroup['selectionMode']) {
		return mode === 'SINGLE' ? m.single() : m.multiple();
	}

	const isNewGroup = $derived(!!draftGroup && !demo.state.modifierGroups.some((item) => item.id === draftGroup!.id));
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-semibold">{m.modifiers_title()}</h1>
			<IconAction
				label={canEdit ? m.add_group() : m.permission_denied()}
				icon={Plus}
				tone="solid"
				disabled={!canEdit}
				onclick={startNewGroup}
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
		<table class="w-full min-w-[760px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.item()}</th>
					<th class="px-3 py-3">{m.selection_mode()}</th>
					<th class="px-3 py-3 text-right">{m.options_count()}</th>
					<th class="px-3 py-3 text-right">{m.sort_order()}</th>
					<th class="px-3 py-3">{m.required()}</th>
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
									<SlidersHorizontal size={22} />
								</span>
								<div>
									<p class="font-semibold">{label(item.name)}</p>
									<p class="text-xs text-muted">{item.name.en} · {item.name.kh}</p>
								</div>
							</div>
						</td>
						<td class="px-3 py-3">{modeLabel(item.selectionMode)}</td>
						<td class="num px-3 py-3 text-right">{item.options.filter((option) => option.active).length}</td>
						<td class="num px-3 py-3 text-right">{item.sortOrder}</td>
						<td class="px-3 py-3">
							<span class="badge {item.required ? 'badge-warn' : 'badge-neutral'}">
								{item.required ? m.required() : m.optional()}
							</span>
						</td>
						<td class="px-3 py-3">
							<span class="badge {item.active ? 'badge-ok' : 'badge-neutral'}">
								{item.active ? m.active() : m.inactive()}
							</span>
						</td>
						<td class="px-3 py-3 text-right">
							<div class="icon-action-group">
								<IconAction label={m.edit()} icon={Pencil} onclick={() => selectGroup(item)} />
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

{#if draftGroup}
	{@const group = draftGroup}
	<Dialog title={isNewGroup ? m.add_group() : m.edit_group()} onclose={() => (draftGroup = null)} wide>
		<div class="space-y-4">
			<div class="grid gap-3 md:grid-cols-2">
				<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={group.name.en} disabled={!canEdit} /></label>
				<label class="text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={group.name.kh} disabled={!canEdit} /></label>
				<label class="text-sm font-semibold"
					>{m.selection_mode()}
					<SelectMenu
						class="mt-1"
						disabled={!canEdit}
						bind:value={group.selectionMode}
						options={[
							{ value: 'SINGLE', label: m.single() },
							{ value: 'MULTIPLE', label: m.multiple() }
						]}
					/>
				</label>
				<div class="flex items-end">
					<UiCheckbox bind:checked={group.required} disabled={!canEdit} label={m.required()} />
				</div>
				<label class="text-sm font-semibold"
					>{m.min()}
					<NumberField class="mt-1" min={0} step={1} bind:intValue={group.minSelections} disabled={!canEdit} ariaLabel={m.min()} />
				</label>
				<label class="text-sm font-semibold"
					>{m.max()}
					<NumberField
						class="mt-1"
						min={1}
						step={1}
						bind:intValue={group.maxSelections}
						disabled={!canEdit || group.selectionMode === 'SINGLE'}
						ariaLabel={m.max()}
					/>
				</label>
				<div class="md:col-span-2">
					<UiCheckbox bind:checked={group.active} disabled={!canEdit} label={m.active()} />
				</div>
			</div>

			<section class="overflow-hidden rounded-lg border border-line">
				<div class="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-3 py-2.5">
					<div>
						<h3 class="font-semibold">{m.modifiers()}</h3>
						<p class="text-xs text-muted">{m.price_delta()}: {formatUsd(0)}+</p>
					</div>
					<IconAction
						label={m.add_option()}
						icon={Plus}
						tone="solid"
						disabled={!canEdit}
						onclick={addOption}
					/>
				</div>
				<div class="max-h-[min(42vh,20rem)] overflow-auto">
					<table class="config-table">
						<thead class="sticky top-0 z-[1] bg-white">
							<tr>
								<th>{m.name_en()}</th>
								<th>{m.name_kh()}</th>
								<th class="text-right">{m.price_delta()}</th>
								<th>{m.active()}</th>
								<th>{m.default_option()}</th>
								<th class="w-12"></th>
							</tr>
						</thead>
						<tbody>
							{#each group.options as option (option.id)}
								<tr>
									<td><input class="field" aria-label={m.name_en()} bind:value={option.name.en} disabled={!canEdit} /></td>
									<td><input class="field" aria-label={m.name_kh()} bind:value={option.name.kh} disabled={!canEdit} /></td>
									<td>
										<NumberField
											size="sm"
											step={0.01}
											disabled={!canEdit}
											ariaLabel={m.price_delta()}
											value={(option.priceDelta / 100).toFixed(2)}
											onchange={(next) => {
												option.priceDelta = Math.round(Number(next) * 100) || 0;
											}}
										/>
									</td>
									<td><UiCheckbox bind:checked={option.active} disabled={!canEdit} label={m.active()} /></td>
									<td>
										<UiCheckbox
											checked={option.isDefault === true}
											disabled={!canEdit}
											label={m.default_option()}
											onchange={(on) => {
												if (group.selectionMode === 'SINGLE') group.options.forEach((row) => (row.isDefault = false));
												option.isDefault = on;
											}}
										/>
									</td>
									<td class="text-center">
										<div class="icon-action-group justify-center">
											<IconAction
												label={m.remove_option()}
												icon={Trash2}
												tone="danger"
												disabled={!canEdit}
												onclick={() => removeOption(option.id)}
											/>
										</div>
									</td>
								</tr>
							{:else}
								<tr><td colspan="6"><div class="config-empty"><strong>{m.empty_config()}</strong></div></td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (draftGroup = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canEdit} onclick={saveGroup}>{m.save_group()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
