<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Coffee Plus admin section — Sumady PageContainer/FieldSet concept, POS chrome only. */
	let {
		title,
		hint,
		pad = true,
		fill = false,
		actions,
		children
	}: {
		title: string;
		hint?: string;
		/** false when body is an edge-to-edge config table */
		pad?: boolean;
		/** Fill remaining page height; body scrolls, header stays fixed */
		fill?: boolean;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class="card overflow-hidden {fill ? 'flex min-h-0 flex-1 flex-col' : ''}">
	<header class="shrink-0 border-b border-line bg-white px-4 py-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="min-w-0 flex-1 truncate text-base font-semibold text-ink">{title}</h2>
			{#if actions}
				<div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
					{@render actions()}
				</div>
			{/if}
		</div>
		{#if hint}
			<p class="mt-1 text-sm text-muted">{hint}</p>
		{/if}
	</header>
	<div class="{pad ? 'p-4' : ''} {fill ? 'min-h-0 flex-1 overflow-auto' : ''}">
		{@render children()}
	</div>
</section>
