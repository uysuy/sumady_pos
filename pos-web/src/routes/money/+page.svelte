<script lang="ts">
	import AdminSection from '$lib/components/admin-section.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	const locked = $derived(!demo.can('settings'));

	let rate = $state(String(demo.state.settings.usdToKhr));
	let limit = $state((demo.state.settings.offlineCashLimitCents / 100).toFixed(2));

	function save() {
		const fx = Number(rate);
		if (!Number.isFinite(fx) || fx <= 0) {
			demo.flash(m.invalid_rate());
			return;
		}
		const ok = demo.updateSettings({
			usdToKhr: Math.round(fx),
			offlineCashLimitCents: Math.round(Number(limit) * 100)
		});
		demo.flash(ok ? m.settings_saved() : m.permission_denied());
	}
</script>

<div class="h-full overflow-auto p-4 md:p-6">
	<header class="mb-4">
		<h1 class="text-2xl font-semibold">{m.money_rates()}</h1>
		<p class="mt-1 text-sm text-muted">{m.money_rates_hint()}</p>
		{#if locked}<p class="mt-2 text-sm">{m.switch_to_manager()}</p>{/if}
	</header>

	<AdminSection title={m.money_rates()}>
		{#snippet actions()}
			<button class="btn btn-primary" type="button" disabled={locked} onclick={save}>{m.save_settings()}</button>
		{/snippet}
		<div class="grid max-w-xl gap-4">
			<label class="block text-sm font-semibold"
				>{m.fx_rate()}
				<NumberField class="mt-1" min={0} step={1} bind:value={rate} disabled={locked} ariaLabel={m.fx_rate()} />
			</label>
			<label class="block text-sm font-semibold"
				>{m.offline_limit_label()}
				<NumberField class="mt-1" min={0} step={0.01} bind:value={limit} disabled={locked} ariaLabel={m.offline_limit_label()} />
			</label>
			<p class="text-xs text-muted">{m.limit_label()}</p>
		</div>
	</AdminSection>
</div>
