<script lang="ts">
	import { Coffee } from 'lucide-svelte';

	let {
		src = '',
		alt = '',
		class: className = 'h-12 w-12'
	}: {
		src?: string;
		alt?: string;
		class?: string;
	} = $props();
</script>

{#if src}
	<img class="shrink-0 rounded-lg object-cover {className}" {src} {alt} />
{:else}
	<span class="grid shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 {className}" aria-hidden="true">
		<Coffee size={20} />
	</span>
{/if}
