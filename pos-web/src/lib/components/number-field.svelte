<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { playInkWave } from '$lib/ui/ink-wave';
	import * as m from '$paraglide/messages';

	let {
		id,
		value = $bindable<string | undefined>(undefined),
		intValue = $bindable<number | undefined>(undefined),
		min,
		max,
		step = 1,
		disabled = false,
		placeholder = '',
		ariaLabel,
		class: klass = '',
		size = 'md',
		onchange
	}: {
		id?: string;
		/** Text / decimal fields (money, rates). Prefer this for most forms. */
		value?: string;
		/** Integer fields (sort order, min/max counts). */
		intValue?: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
		size?: 'sm' | 'md';
		onchange?: (value: string) => void;
	} = $props();

	let focused = $state(false);
	let draft = $state('');
	let shellEl: HTMLDivElement | undefined = $state();

	const useInt = $derived(intValue !== undefined && value === undefined);
	const display = $derived(useInt ? String(intValue ?? '') : (value ?? draft));

	function parse(raw: string): number | null {
		const trimmed = raw.trim();
		if (!trimmed) return null;
		const n = Number(trimmed);
		return Number.isFinite(n) ? n : null;
	}

	function format(n: number): string {
		if (useInt || !String(step).includes('.')) return String(Math.round(n));
		const decimals = String(step).split('.')[1]?.length ?? 0;
		return n.toFixed(decimals);
	}

	function clamp(n: number): number {
		let next = n;
		if (min != null && next < min) next = min;
		if (max != null && next > max) next = max;
		return next;
	}

	function commit(next: string) {
		if (useInt) {
			const n = parse(next);
			intValue = n == null ? (min ?? 0) : Math.round(clamp(n));
			onchange?.(String(intValue));
			return;
		}
		value = next;
		draft = next;
		onchange?.(next);
	}

	function stepBy(dir: 1 | -1) {
		if (disabled) return;
		const current = parse(display) ?? (min != null ? min : 0);
		const next = clamp(current + dir * step);
		commit(format(next));
	}

	function onInput(event: Event) {
		commit((event.currentTarget as HTMLInputElement).value);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			stepBy(1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			stepBy(-1);
		}
	}

	/** Ring on field body only — not up/down steppers. */
	function onShellPointerDown(event: PointerEvent) {
		if (disabled) return;
		if (event.button !== 0 && event.pointerType === 'mouse') return;
		const target = event.target;
		if (target instanceof Element && target.closest('.number-field-action')) return;
		if (shellEl) playInkWave(shellEl);
	}

	const atMin = $derived(min != null && (parse(display) ?? min) <= min);
	const atMax = $derived(max != null && (parse(display) ?? max) >= max);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={shellEl}
	class="number-field-shell {klass}"
	onpointerdown={onShellPointerDown}
>
	<div
		class="number-field number-field-{size}"
		class:is-focused={focused}
		class:is-disabled={disabled}
	>
		<input
			{id}
			class="number-field-input num"
			type="text"
			inputmode={useInt ? 'numeric' : 'decimal'}
			role="spinbutton"
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={parse(display) ?? undefined}
			aria-label={ariaLabel}
			{placeholder}
			{disabled}
			value={display}
			oninput={onInput}
			onkeydown={onKey}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		/>
		<div class="number-field-actions" aria-hidden={disabled}>
			<button
				class="number-field-action number-field-action-up"
				type="button"
				tabindex="-1"
				aria-label={m.increase()}
				disabled={disabled || atMax}
				onclick={() => stepBy(1)}
			>
				<ChevronUp size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
			</button>
			<button
				class="number-field-action number-field-action-down"
				type="button"
				tabindex="-1"
				aria-label={m.decrease()}
				disabled={disabled || atMin}
				onclick={() => stepBy(-1)}
			>
				<ChevronDown size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
			</button>
		</div>
	</div>
</div>
