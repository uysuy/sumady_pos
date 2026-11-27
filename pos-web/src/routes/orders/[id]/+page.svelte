<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { href } from '$lib/i18n/label';
	import { onMount } from 'svelte';

	/** Old /orders/:id links open the list dialog instead. */
	onMount(() => {
		const id = page.params.id;
		void goto(href(id ? `/orders?order=${encodeURIComponent(id)}` : '/orders'), { replaceState: true });
	});
</script>

<div class="p-6 text-sm text-muted">…</div>
