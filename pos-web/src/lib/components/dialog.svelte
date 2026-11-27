<script lang="ts">
	import { motionMs } from '$lib/motion';
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';

	let {
		title,
		onclose,
		wide = false,
		brand = true,
		/** Confirm / system alerts sit above regular dialogs and drawers. */
		alert = false,
		/** Parent can `bind:close` to run the standard outro, then `onclose`. */
		close = $bindable<(() => void) | null>(null),
		children,
		leading,
		footer
	}: {
		title: string;
		onclose: () => void;
		wide?: boolean;
		/** Green header — Coffee Plus POS dialog standard (default on). */
		brand?: boolean;
		alert?: boolean;
		close?: (() => void) | null;
		children: Snippet;
		leading?: Snippet;
		footer?: Snippet;
	} = $props();

	let closing = $state(false);
	let shellEl: HTMLDivElement | undefined = $state();
	let panelEl: HTMLDivElement | undefined = $state();

	async function requestClose() {
		if (closing) return;
		const ms = motionMs(280);
		if (ms === 0) {
			onclose();
			return;
		}
		closing = true;
		await tick();
		// Restart outro after the intro class is removed (avoids a hard cut).
		if (shellEl) void shellEl.offsetWidth;
		if (panelEl) {
			void panelEl.offsetWidth;
			panelEl.style.animation = 'none';
			void panelEl.offsetWidth;
			panelEl.style.animation = '';
		}
		if (shellEl) {
			shellEl.style.animation = 'none';
			void shellEl.offsetWidth;
			shellEl.style.animation = '';
		}
		window.setTimeout(() => {
			onclose();
		}, ms);
	}

	// Expose animated closer to parent (`bind:close`) as soon as the dialog mounts.
	close = requestClose;

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') requestClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	bind:this={shellEl}
	class="fixed inset-0 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4 {alert
		? 'z-[12000]'
		: 'z-[100]'} {closing ? 'ui-overlay-fade-out' : 'ui-overlay'}"
	role="presentation"
>
	<button class="absolute inset-0 cursor-default" type="button" aria-label={title} onclick={requestClose}></button>
	<div
		bind:this={panelEl}
		class="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded bg-white shadow-2xl will-change-transform {wide
			? 'sm:max-w-3xl'
			: 'sm:max-w-lg'} {closing ? 'ui-dialog-out' : 'ui-dialog'}"
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		{#if brand}
			<div class="flex shrink-0 items-center justify-between bg-brand-700 px-4 py-2.5 text-white">
				<h2 class="flex items-center gap-2 text-base font-semibold">
					{#if leading}{@render leading()}{/if}
					{title}
				</h2>
				<button
					class="grid h-7 w-7 cursor-pointer place-items-center rounded text-lg leading-none text-white hover:bg-white/15"
					type="button"
					onclick={requestClose}
					aria-label={title}>×</button
				>
			</div>
		{:else}
			<div class="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
				<h2 class="text-lg font-semibold text-ink">{title}</h2>
				<button
					class="grid h-8 w-8 place-items-center rounded border border-line text-lg leading-none hover:bg-brand-50"
					type="button"
					onclick={requestClose}
					aria-label={title}>×</button
				>
			</div>
		{/if}
		<div class="min-h-0 flex-1 overflow-auto px-4 py-3">
			{@render children()}
		</div>
		{#if footer}
			<!--
				Dialog footer standard (Coffee Plus):
				- Right-aligned button group: class="flex justify-end gap-2"
				- Order: Cancel/Close (secondary) → primary action (rightmost)
				- Example: Cancel | Save · Close | Print receipt
			-->
			<div class="shrink-0 border-t border-line px-4 py-2.5">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>
