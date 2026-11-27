<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import { selectionError, selectionFrom, unitPrice, visibleGroups } from '$lib/domain/catalog';
	import { formatKhr, formatUsd, toKhr } from '$lib/domain/money';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Product } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Check, Coffee, Flame, ShoppingCart, Snowflake } from 'lucide-svelte';

	const sizeShort: Record<string, string> = { size_s: 'S', size_m: 'M', size_l: 'L' };

	let {
		product,
		lineId = null,
		initialQty = 1
	}: {
		product: Product;
		lineId?: string | null;
		initialQty?: number;
	} = $props();
	// Seed once on open; parent remounts with {#key} when product/line changes.
	/* svelte-ignore state_referenced_locally */
	const line = lineId ? demo.state.cart.lines.find((item) => item.id === lineId) : undefined;
	/* svelte-ignore state_referenced_locally */
	const seedIds = demo.editingDefaults(product);
	const seedNote = line?.specialInstructions ?? '';
	let optionIds = $state(seedIds);
	let note = $state(seedNote);
	/* svelte-ignore state_referenced_locally */
	let qty = $state(Math.max(1, Math.round(initialQty) || 1));

	const groups = $derived(visibleGroups(product, demo.state.modifierGroups, optionIds));
	const selected = $derived(selectionFrom(demo.state.modifierGroups, optionIds));
	const unit = $derived(unitPrice(product.basePrice, selected.map((item) => item.priceDelta)));
	const lineTotal = $derived(unit * qty);
	const problem = $derived(selectionError(product, demo.state.modifierGroups, optionIds));

	function toggle(groupId: string, optionId: string) {
		const group = demo.state.modifierGroups.find((item) => item.id === groupId);
		if (!group) return;
		if (group.selectionMode === 'SINGLE') {
			optionIds = [
				...optionIds.filter((id) => !group.options.some((option) => option.id === id)),
				optionId
			];
			if (optionId === 'temp_hot') optionIds = optionIds.filter((id) => !id.startsWith('ice_'));
			if (optionId === 'temp_iced' && !optionIds.some((id) => id.startsWith('ice_'))) optionIds = [...optionIds, 'ice_regular'];
			return;
		}
		if (optionIds.includes(optionId)) {
			optionIds = optionIds.filter((id) => id !== optionId);
			return;
		}
		const count = optionIds.filter((id) => group.options.some((option) => option.id === id)).length;
		if (count >= group.maxSelections) return;
		optionIds = [...optionIds, optionId];
	}

	let closeDialog = $state<(() => void) | null>(null);

	function save() {
		const result = demo.addConfigured(product.id, optionIds, note, qty, lineId ?? undefined);
		if (result === 'required' || result === 'max') demo.flash(m.required_choice());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'unavailable') demo.flash(m.unavailable_msg());
		else closeDialog?.();
	}
</script>

<Dialog
	title={lineId ? m.edit_line() : m.customize()}
	onclose={() => demo.closeCustomize()}
	bind:close={closeDialog}
	wide
>
	{#snippet leading()}
		<Coffee size={18} />
	{/snippet}
	<div class="grid gap-4 md:grid-cols-[168px_1fr]">
		<div>
			<img class="aspect-[4/5] w-full rounded object-cover" src={product.imageUrl} alt="" />
			<h3 class="mt-2 text-base font-semibold leading-normal">{label(product.name)}</h3>
			<p class="num text-lg font-bold leading-normal text-brand-700">{formatUsd(unit)}</p>
			<p class="num text-xs text-muted">{formatKhr(toKhr(unit, demo.state.settings.usdToKhr))}</p>
			<div class="mt-2 inline-flex items-center gap-1">
				<button class="grid h-8 w-8 place-items-center rounded border border-line text-sm" type="button" aria-label={m.decrease()} onclick={() => (qty = Math.max(1, qty - 1))}>−</button>
				<span class="num w-5 text-center text-sm font-bold">{qty}</span>
				<button class="grid h-8 w-8 place-items-center rounded border border-line text-sm" type="button" aria-label={m.increase()} onclick={() => (qty += 1)}>+</button>
			</div>
		</div>
		<div class="space-y-2.5">
			{#each groups as group (group.id)}
				<fieldset>
					<legend class="mb-1 text-xs font-semibold">{label(group.name)}</legend>
					{#if group.id === 'mod_extras'}
						<div class="grid gap-1.5 sm:grid-cols-2">
							{#each group.options.filter((option) => option.active) as option (option.id)}
								<button
									class="flex h-9 items-center gap-2 rounded border px-2.5 text-left text-sm transition-colors duration-150 {optionIds.includes(option.id) ? 'border-brand-700 bg-brand-50 font-semibold text-brand-900' : 'border-line bg-white'}"
									type="button"
									aria-pressed={optionIds.includes(option.id)}
									onclick={() => toggle(group.id, option.id)}
								>
									<span class="ui-check-box" class:is-on={optionIds.includes(option.id)} aria-hidden="true">
										<Check
											size={12}
											strokeWidth={3}
											class="ui-check-icon {optionIds.includes(option.id) ? 'is-on' : ''}"
										/>
									</span>
									<span class="min-w-0 flex-1 truncate">{label(option.name)}</span>
									{#if option.priceDelta}<span class="num shrink-0 text-xs text-muted">{option.priceDelta > 0 ? '+' : ''}{formatUsd(option.priceDelta)}</span>{/if}
								</button>
							{/each}
						</div>
					{:else if group.id === 'mod_size'}
						<div class="flex flex-wrap gap-1.5">
							{#each group.options.filter((option) => option.active) as option (option.id)}
								<button
									class="inline-flex h-11 min-w-14 flex-col items-center justify-center rounded border px-2 leading-normal {optionIds.includes(option.id) ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}"
									type="button"
									aria-pressed={optionIds.includes(option.id)}
									aria-label={label(option.name)}
									onclick={() => toggle(group.id, option.id)}
								>
									<span class="text-sm font-semibold">{sizeShort[option.id] ?? label(option.name)}</span>
									<span class="num text-[11px] font-medium {optionIds.includes(option.id) ? 'text-white/85' : 'text-muted'}">{formatUsd(product.basePrice + option.priceDelta)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="flex flex-wrap gap-1.5">
							{#each group.options.filter((option) => option.active) as option (option.id)}
								<button
									class="inline-flex h-8 items-center gap-1 rounded border px-3 text-sm font-semibold {optionIds.includes(option.id) ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}"
									type="button"
									aria-pressed={optionIds.includes(option.id)}
									onclick={() => toggle(group.id, option.id)}
								>
									{#if option.id === 'temp_hot'}<Flame size={13} />{/if}
									{#if option.id === 'temp_iced'}<Snowflake size={13} />{/if}
									{label(option.name)}
								</button>
							{/each}
						</div>
					{/if}
				</fieldset>
			{/each}
			<label class="block text-xs font-semibold" for="note">{m.instructions()}</label>
			<textarea id="note" class="field mt-1 min-h-14 py-2 text-sm" bind:value={note} placeholder={m.optional_note()}></textarea>
		</div>
	</div>
	{#snippet footer()}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-baseline gap-2">
				<span class="text-sm font-semibold">{m.total()}</span>
				<span class="num text-xl font-bold text-brand-700">{formatUsd(lineTotal)}</span>
				<span class="num text-xs text-muted">{formatKhr(toKhr(lineTotal, demo.state.settings.usdToKhr))}</span>
			</div>
			<div class="flex items-center gap-2">
				{#if problem}<span class="text-xs text-danger">{m.required_choice()}</span>{/if}
				<button class="inline-flex h-9 items-center rounded border border-line bg-white px-3 text-sm font-semibold" type="button" onclick={() => closeDialog?.()}>{m.cancel()}</button>
				<button class="inline-flex h-9 items-center gap-1.5 rounded bg-brand-700 px-3 text-sm font-semibold text-white disabled:bg-[#e7eee9] disabled:text-muted" type="button" disabled={!!problem} onclick={save}>
					<ShoppingCart size={15} />
					{lineId ? m.save() : m.add_to_cart()}
				</button>
			</div>
		</div>
	{/snippet}
</Dialog>
