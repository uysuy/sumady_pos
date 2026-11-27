<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { formatUsd } from '$lib/domain/money';
	import { refundedTotal } from '$lib/domain/order-payments';
	import { formatWhen, href, label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Customer } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Pencil, Plus } from 'lucide-svelte';

	let query = $state('');
	let editing = $state<Customer | null>(null);

	function cloneCustomer(person: Customer): Customer {
		return {
			...person,
			name: { ...person.name }
		};
	}

	function blankCustomer(): Customer {
		return {
			id: crypto.randomUUID(),
			name: { en: '', kh: '' },
			phone: '',
			email: '',
			notes: '',
			active: true,
			createdAt: new Date().toISOString()
		};
	}

	function stats(id: string) {
		const orders = demo.state.orders.filter(
			(order) =>
				order.customerId === id &&
				(order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND')
		);
		const last = orders.map((order) => order.paidAt ?? order.createdAt).sort().at(-1);
		const spend = orders.reduce((sum, order) => sum + Math.max(0, order.totals.total - refundedTotal(order)), 0);
		return { count: orders.length, spend, last };
	}

	const rows = $derived(
		demo.state.customers.filter((person) => {
			const hay = `${person.name.en} ${person.name.kh} ${person.phone ?? ''} ${person.email ?? ''}`.toLowerCase();
			return hay.includes(query.trim().toLowerCase());
		})
	);

	function save() {
		if (!editing) return;
		const result = demo.saveCustomer(editing);
		if (result === 'name') demo.flash(m.both_names());
		else if (result === 'phone') demo.flash(m.phone_invalid());
		else if (result === 'email') demo.flash(m.email_invalid());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else {
			editing = null;
			demo.flash(m.customer_saved());
		}
	}
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-semibold">{m.customers_title()}</h1>
			<IconAction label={m.add_customer()} icon={Plus} tone="solid" onclick={() => (editing = blankCustomer())} />
		</div>
		<input class="field mt-4 max-w-md" placeholder={m.search_customers()} aria-label={m.search_customers()} bind:value={query} />
	</div>
	<div class="card page-list-grid">
		<table class="w-full min-w-[680px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.customer()}</th>
					<th class="px-3 py-3">{m.phone()}</th>
					<th class="px-3 py-3">{m.email()}</th>
					<th class="px-3 py-3 text-right">{m.total_orders()}</th>
					<th class="px-3 py-3">{m.last_order()}</th>
					<th class="px-3 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as person (person.id)}
					{@const info = stats(person.id)}
					<tr class="border-t border-line">
						<td class="px-3 py-3 font-semibold">
							<a class="text-brand-700" href={href(`/customers/${person.id}`)}>{label(person.name)}</a>
							{#if !person.active}<span class="ml-2 badge badge-neutral">{m.inactive()}</span>{/if}
						</td>
						<td class="px-3 py-3">{person.phone}</td>
						<td class="px-3 py-3">{person.email}</td>
						<td class="num px-3 py-3 text-right">{info.count}</td>
						<td class="px-3 py-3">{info.last ? formatWhen(info.last) : m.never()}</td>
						<td class="px-3 py-3 text-right">
							<div class="icon-action-group">
								<IconAction label={m.edit()} icon={Pencil} onclick={() => (editing = cloneCustomer(person))} />
							</div>
						</td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-muted" colspan="6">{m.customer_empty()}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if editing}
	<Dialog title={editing.createdAt && demo.state.customers.some((c) => c.id === editing?.id) ? m.edit_customer() : m.add_customer()} onclose={() => (editing = null)}>
		<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={editing.name.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={editing.name.kh} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.phone()}<input class="field mt-1" bind:value={editing.phone} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.email()}<input class="field mt-1" bind:value={editing.email} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.notes()}<textarea class="field mt-1" bind:value={editing.notes}></textarea></label>
		<div class="mt-3">
			<UiCheckbox bind:checked={editing.active} label={m.active()} />
		</div>
		<p class="sr-only">{formatUsd(0)}</p>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editing = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={save}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
