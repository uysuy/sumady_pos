<script lang="ts">
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';

	type Side = 'top' | 'bottom' | 'left' | 'right';

	let {
		label,
		icon: Icon,
		disabled = false,
		tone = 'brand',
		onclick,
		class: klass = ''
	}: {
		/** Tooltip + accessible name */
		label: string;
		icon: Component<{ size?: number; strokeWidth?: number; class?: string }>;
		disabled?: boolean;
		/** brand = outline; solid = filled primary (page Add CTAs); danger / muted */
		tone?: 'brand' | 'solid' | 'danger' | 'muted';
		onclick?: (event: MouseEvent) => void;
		class?: string;
	} = $props();

	let btnEl: HTMLButtonElement | undefined = $state();
	let tipEl: HTMLSpanElement | undefined = $state();
	let open = $state(false);
	let placed = $state(false);
	let side = $state<Side>('bottom');
	let tipLeft = $state(0);
	let tipTop = $state(0);
	let arrowOffset = $state(0);

	const GAP = 8;
	const MARGIN = 8;

	/** Escape overflow:hidden ancestors (shell / header / cards). */
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function measureTip(): { w: number; h: number } {
		if (!tipEl) return { w: 0, h: 0 };
		const rect = tipEl.getBoundingClientRect();
		return {
			w: rect.width || tipEl.offsetWidth || tipEl.scrollWidth,
			h: rect.height || tipEl.offsetHeight || tipEl.scrollHeight
		};
	}

	function placeTip() {
		if (!btnEl || !tipEl) return;
		const btn = btnEl.getBoundingClientRect();
		const { w: tipW, h: tipH } = measureTip();
		if (tipW <= 0 || tipH <= 0) return;

		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const space = {
			top: btn.top - MARGIN,
			bottom: vh - btn.bottom - MARGIN,
			left: btn.left - MARGIN,
			right: vw - btn.right - MARGIN
		};
		const need = {
			top: tipH + GAP,
			bottom: tipH + GAP,
			left: tipW + GAP,
			right: tipW + GAP
		};

		const order: Side[] = ['top', 'bottom', 'right', 'left'];
		let next: Side = order.reduce((best, candidate) =>
			space[candidate] >= space[best] ? candidate : best
		);
		for (const candidate of order) {
			if (space[candidate] >= need[candidate]) {
				next = candidate;
				break;
			}
		}

		let left = 0;
		let top = 0;
		let arrow = 0;

		if (next === 'top' || next === 'bottom') {
			left = btn.left + btn.width / 2 - tipW / 2;
			top = next === 'top' ? btn.top - GAP - tipH : btn.bottom + GAP;
			const clampedLeft = Math.min(Math.max(left, MARGIN), vw - MARGIN - tipW);
			arrow = left - clampedLeft;
			left = clampedLeft;
		} else {
			top = btn.top + btn.height / 2 - tipH / 2;
			left = next === 'left' ? btn.left - GAP - tipW : btn.right + GAP;
			const clampedTop = Math.min(Math.max(top, MARGIN), vh - MARGIN - tipH);
			arrow = top - clampedTop;
			top = clampedTop;
		}

		side = next;
		tipLeft = Math.round(left);
		tipTop = Math.round(top);
		arrowOffset = Math.round(arrow);
		placed = true;
	}

	function showTip() {
		if (disabled) return;
		open = true;
		placed = false;
	}

	function hideTip() {
		open = false;
		placed = false;
		arrowOffset = 0;
	}

	function onWindowChange() {
		if (open) placeTip();
	}

	$effect(() => {
		if (!open || !tipEl || !btnEl) return;
		placeTip();
		const id = requestAnimationFrame(placeTip);
		return () => cancelAnimationFrame(id);
	});

	onMount(() => {
		/** Capture scrolls inside overflow panels (shell/main), not only window. */
		document.addEventListener('scroll', onWindowChange, true);
		return () => document.removeEventListener('scroll', onWindowChange, true);
	});
</script>

<svelte:window onresize={onWindowChange} />

<button
	bind:this={btnEl}
	type="button"
	class="icon-action icon-action-{tone} {klass}"
	{disabled}
	aria-label={label}
	onpointerenter={showTip}
	onpointerleave={hideTip}
	onfocus={showTip}
	onblur={hideTip}
	{onclick}
>
	<Icon size={16} strokeWidth={2} class="icon-action-glyph" />
</button>

{#if open}
	<span
		bind:this={tipEl}
		use:portal
		class="icon-action-tip is-portal"
		class:is-open={placed}
		data-side={side}
		style="left: {tipLeft}px; top: {tipTop}px; --tip-arrow: {arrowOffset}px"
		role="tooltip"
		aria-hidden={!placed}
	>
		{label}
	</span>
{/if}
