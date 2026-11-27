<script lang="ts">
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { playInkWave } from '$lib/ui/ink-wave';
	import { Check, ChevronDown } from 'lucide-svelte';
	import * as m from '$paraglide/messages';

	export type MultiSelectOption = { value: string; label: string; disabled?: boolean };

	let {
		id,
		value = $bindable<string[]>([]),
		options,
		placeholder = '',
		disabled = false,
		ariaLabel,
		class: klass = '',
		onchange
	}: {
		id?: string;
		value?: string[];
		options: MultiSelectOption[];
		placeholder?: string;
		disabled?: boolean;
		ariaLabel?: string;
		class?: string;
		onchange?: (value: string[]) => void;
	} = $props();

	let open = $state(false);
	let query = $state('');
	let root = $state<HTMLDivElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	let searchEl = $state<HTMLInputElement | null>(null);
	let box = $state({ top: 0, left: 0, width: 280, maxHeight: 320, above: false });

	const selectedSet = $derived(new Set(value));
	const filtered = $derived(
		options.filter((option) => {
			if (!query.trim()) return true;
			return option.label.toLowerCase().includes(query.trim().toLowerCase());
		})
	);
	const selectable = $derived(filtered.filter((option) => !option.disabled));
	const allFilteredSelected = $derived(
		selectable.length > 0 && selectable.every((option) => selectedSet.has(option.value))
	);
	const summary = $derived.by(() => {
		if (!value.length) return placeholder || m.search();
		const labels = value
			.map((id) => options.find((option) => option.value === id)?.label)
			.filter((item): item is string => Boolean(item));
		return labels.length ? labels.join(', ') : placeholder || m.search();
	});

	function place() {
		if (!root) return;
		const rect = root.getBoundingClientRect();
		const width = Math.max(rect.width, 240);
		const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
		const below = window.innerHeight - rect.bottom;
		const above = rect.top;
		const flip = below < 220 && above > below;
		box = {
			top: flip ? rect.top - 6 : rect.bottom + 6,
			left,
			width,
			maxHeight: Math.max(180, Math.min(360, (flip ? above : below) - 16)),
			above: flip
		};
	}

	function setValue(next: string[]) {
		value = next;
		onchange?.(next);
	}

	function toggleOpen() {
		if (disabled) return;
		open = !open;
		if (open) {
			query = '';
			place();
			queueMicrotask(() => searchEl?.focus());
		}
	}

	function toggleOption(optionValue: string, optionDisabled?: boolean) {
		if (disabled || optionDisabled) return;
		const next = new Set(value);
		if (next.has(optionValue)) next.delete(optionValue);
		else next.add(optionValue);
		setValue([...next]);
	}

	function applySelectAll(on: boolean) {
		if (disabled || !selectable.length) return;
		const next = new Set(value);
		if (on) {
			for (const option of selectable) next.add(option.value);
		} else {
			for (const option of selectable) next.delete(option.value);
		}
		setValue([...next]);
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function onTriggerKey(event: KeyboardEvent) {
		if (disabled) return;
		if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			toggleOpen();
		}
	}

	function onPanelKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			open = false;
		}
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

<div class="select-menu multi-select-menu {klass}" bind:this={root}>
	<button
		{id}
		class="select-trigger light"
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-label={ariaLabel}
		{disabled}
		onkeydown={onTriggerKey}
		onclick={toggleOpen}
	>
		<span class="min-w-0 flex-1 truncate {value.length ? '' : 'text-muted'}">{summary}</span>
		{#if value.length}
			<span class="multi-select-count">{value.length}</span>
		{/if}
		<ChevronDown size={16} class="shrink-0 {open ? 'rotate-180' : ''} transition-transform" />
	</button>
</div>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		id="{id}-list"
		class="select-panel multi-select-panel"
		role="listbox"
		tabindex="-1"
		aria-multiselectable="true"
		use:portal
		bind:this={panel}
		data-above={box.above ? 'true' : 'false'}
		style:top={box.above ? 'auto' : `${box.top}px`}
		style:bottom={box.above ? `${window.innerHeight - box.top}px` : 'auto'}
		style:left={`${box.left}px`}
		style:width={`${box.width}px`}
		style:max-height={`${box.maxHeight}px`}
		onkeydown={onPanelKey}
	>
		<div class="multi-select-search">
			<input
				class="field"
				type="search"
				bind:this={searchEl}
				bind:value={query}
				placeholder={m.search()}
				aria-label={m.search()}
			/>
		</div>
		<div class="multi-select-all">
			<UiCheckbox
				checked={allFilteredSelected}
				disabled={disabled || !selectable.length}
				label={m.select_all()}
				onchange={applySelectAll}
			/>
		</div>
		<div class="multi-select-options">
			{#each filtered as option (option.value)}
				<button
					class="select-option multi-select-option"
					type="button"
					role="option"
					aria-selected={selectedSet.has(option.value)}
					disabled={disabled || option.disabled}
					onpointerdown={(event) => {
						if (disabled || option.disabled) return;
						if (event.button !== 0 && event.pointerType === 'mouse') return;
						const box = (event.currentTarget as HTMLElement).querySelector('.ui-check-box');
						if (box instanceof HTMLElement) playInkWave(box);
					}}
					onclick={() => toggleOption(option.value, option.disabled)}
				>
					<span class="ui-check-box" class:is-on={selectedSet.has(option.value)} aria-hidden="true">
						<Check
							size={14}
							strokeWidth={3}
							class="ui-check-icon {selectedSet.has(option.value) ? 'is-on' : ''}"
						/>
					</span>
					<span class="ui-check-text min-w-0 flex-1 truncate">{option.label}</span>
				</button>
			{:else}
				<p class="multi-select-empty">{m.no_results()}</p>
			{/each}
		</div>
	</div>
{/if}
