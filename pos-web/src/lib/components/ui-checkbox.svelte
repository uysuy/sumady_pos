<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { playInkWave } from '$lib/ui/ink-wave';
	import type { Snippet } from 'svelte';

	let {
		checked = $bindable(false),
		disabled = false,
		label,
		class: className = '',
		onchange,
		children
	}: {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		class?: string;
		onchange?: (next: boolean) => void;
		children?: Snippet;
	} = $props();

	let boxEl: HTMLSpanElement | undefined = $state();

	function toggle() {
		if (disabled) return;
		const next = !checked;
		/** Always notify parent first so one-way `checked={…}` + onchange stays in sync. */
		onchange?.(next);
		checked = next;
	}

	function onPointerDown(event: PointerEvent) {
		if (disabled) return;
		if (event.button !== 0 && event.pointerType === 'mouse') return;
		if (boxEl) playInkWave(boxEl);
	}
</script>

<button
	class="ui-check {className}"
	type="button"
	role="checkbox"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	onpointerdown={onPointerDown}
	onclick={toggle}
>
	<span bind:this={boxEl} class="ui-check-box" class:is-on={checked} aria-hidden="true">
		<Check size={14} strokeWidth={3} class="ui-check-icon {checked ? 'is-on' : ''}" />
	</span>
	{#if label}<span class="ui-check-text">{label}</span>{/if}
	{#if children}
		<span class="ui-check-text">{@render children()}</span>
	{/if}
</button>
