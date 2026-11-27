<script lang="ts">
	import SelectMenu from '$lib/components/select-menu.svelte';
	import type { RangeKey } from '$lib/domain/report-core';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	let {
		range = $bindable<RangeKey>('today'),
		from = $bindable(''),
		to = $bindable(''),
		branchId = $bindable(''),
		cashierId = $bindable(''),
		showCashier = true,
		onexport
	}: {
		range?: RangeKey;
		from?: string;
		to?: string;
		branchId?: string;
		cashierId?: string;
		showCashier?: boolean;
		onexport?: () => void;
	} = $props();

	const branchOptions = $derived([
		{ value: '', label: m.filter_all() },
		...demo.state.branches.map((branch) => ({ value: branch.id, label: label(branch.name) }))
	]);

	const cashierOptions = $derived([
		{ value: '', label: m.filter_all() },
		...demo.state.staff
			.filter((staff) => staff.active)
			.map((staff) => ({ value: staff.id, label: label(staff.name) }))
	]);
</script>

<div class="mt-4 flex flex-wrap items-end gap-2">
	{#each ['today', 'yesterday', 'last7', 'custom'] as key (key)}
		<button class="chip" type="button" aria-pressed={range === key} onclick={() => (range = key as RangeKey)}>
			{key === 'today' ? m.today() : key === 'yesterday' ? m.yesterday() : key === 'last7' ? m.last7() : m.custom()}
		</button>
	{/each}
	{#if range === 'custom'}
		<input class="field w-auto" type="date" aria-label={m.from()} bind:value={from} />
		<input class="field w-auto" type="date" aria-label={m.to()} bind:value={to} />
	{/if}
	<div class="min-w-[10rem]">
		<p class="mb-1 text-xs text-muted">{m.branch()}</p>
		<SelectMenu ariaLabel={m.branch()} bind:value={branchId} options={branchOptions} />
	</div>
	{#if showCashier}
		<div class="min-w-[10rem]">
			<p class="mb-1 text-xs text-muted">{m.cashier()}</p>
			<SelectMenu ariaLabel={m.cashier()} bind:value={cashierId} options={cashierOptions} />
		</div>
	{/if}
	{#if onexport}
		<button class="btn btn-secondary ml-auto" type="button" onclick={onexport}>{m.export_csv()}</button>
	{/if}
</div>
