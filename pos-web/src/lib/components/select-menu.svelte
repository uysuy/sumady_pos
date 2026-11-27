<script lang="ts">
	import { Check, ChevronDown } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	export type SelectOption = { value: string; label: string };

	let {
		id,
		value = $bindable(''),
		options,
		placeholder = '',
		tone = 'light',
		disabled = false,
		ariaLabel,
		class: klass = '',
		onchange,
		face
	}: {
		id?: string;
		value?: string;
		options: SelectOption[];
		placeholder?: string;
		tone?: 'light' | 'dark';
		disabled?: boolean;
		ariaLabel?: string;
		class?: string;
		onchange?: (value: string) => void;
		face?: Snippet;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	let activeIndex = $state(0);
	let box = $state({ top: 0, left: 0, width: 220, maxHeight: 240, above: false });

	const selected = $derived(options.find((item) => item.value === value));

	function place() {
		if (!root) return;
		const rect = root.getBoundingClientRect();
		const width = Math.max(rect.width, 180);
		const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
		const below = window.innerHeight - rect.bottom;
		const above = rect.top;
		const flip = below < 160 && above > below;
		box = {
			top: flip ? rect.top - 6 : rect.bottom + 6,
			left,
			width,
			maxHeight: Math.max(140, Math.min(280, (flip ? above : below) - 16)),
			above: flip
		};
	}

	function toggle() {
		if (disabled) return;
		open = !open;
		if (open) {
			const index = options.findIndex((item) => item.value === value);
			activeIndex = index >= 0 ? index : 0;
			place();
		}
	}

	function choose(next: string) {
		open = false;
		value = next;
		onchange?.(next);
	}

	function onKey(event: KeyboardEvent) {
		if (disabled) return;
		if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			toggle();
			return;
		}
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			open = false;
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = Math.min(options.length - 1, activeIndex + 1);
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(0, activeIndex - 1);
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const option = options[activeIndex];
			if (option) choose(option.value);
		}
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	$effect(() => {
		if (!open) return;
		const onDoc = (event: MouseEvent) => {
			const target = event.target as Node;
			if (root?.contains(target) || panel?.contains(target)) return;
			open = false;
		};
		const onMove = () => place();
		document.addEventListener('mousedown', onDoc);
		window.addEventListener('resize', onMove);
		window.addEventListener('scroll', onMove, true);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			window.removeEventListener('resize', onMove);
			window.removeEventListener('scroll', onMove, true);
		};
	});
</script>

<div class="select-menu {klass}" bind:this={root}>
	<button
		{id}
		class="select-trigger {face ? 'plain' : tone}"
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-label={ariaLabel}
		{disabled}
		onkeydown={onKey}
		onclick={toggle}
	>
		{#if face}
			<span class="min-w-0 flex-1">{@render face()}</span>
		{:else}
			<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-muted'}">{selected?.label || placeholder}</span>
			<ChevronDown size={16} class="shrink-0 {open ? 'rotate-180' : ''} transition-transform" />
		{/if}
	</button>
</div>

{#if open}
	<div
			id="{id}-list"
			class="select-panel"
			role="listbox"
		use:portal
		bind:this={panel}
		data-above={box.above ? 'true' : 'false'}
		style:top={box.above ? 'auto' : `${box.top}px`}
		style:bottom={box.above ? `${window.innerHeight - box.top}px` : 'auto'}
		style:left={`${box.left}px`}
		style:width={`${box.width}px`}
		style:max-height={`${box.maxHeight}px`}
	>
		{#each options as option, index (option.value)}
			<button
				class="select-option"
				type="button"
				role="option"
				aria-selected={option.value === value}
				data-active={index === activeIndex}
				onmouseenter={() => (activeIndex = index)}
				onclick={() => choose(option.value)}
			>
				<span class="min-w-0 flex-1 truncate">{option.label}</span>
				{#if option.value === value}<Check size={16} />{/if}
			</button>
		{/each}
	</div>
{/if}
