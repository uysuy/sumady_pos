<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import { formatUsd } from '$lib/domain/money';
	import type { OutboxRecord } from '$lib/domain/types';
	import { formatWhen, label } from '$lib/i18n/label';
	import { payMethodLabel } from '$lib/i18n/domain-labels';
	import { demo, pendingSyncCount } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';
	import { Eye, RefreshCw } from 'lucide-svelte';

	type Filter = 'ALL' | 'PENDING' | 'FAILED' | 'SYNCED';

	let filter = $state<Filter>('ALL');
	let detail = $state<OutboxRecord | null>(null);

	const pending = $derived(pendingSyncCount());
	const online = $derived(demo.state.demoLink === 'online');

	const rows = $derived(
		[...demo.state.outbox]
			.filter((item) => (filter === 'ALL' ? true : item.state === filter))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
	);

	const detailOrder = $derived(
		detail ? (demo.state.orders.find((item) => item.id === detail!.orderId) ?? null) : null
	);

	function statusLabel(state: OutboxRecord['state']) {
		if (state === 'SYNCED') return m.sync_badge_synced();
		if (state === 'PENDING') return m.sync_badge_pending();
		if (state === 'FAILED') return m.failed();
		return state;
	}

	function statusBadge(state: OutboxRecord['state']) {
		if (state === 'SYNCED') return 'badge-ok';
		if (state === 'FAILED') return 'badge-danger';
		return 'badge-warn';
	}

	function eventLabel(eventType: OutboxRecord['eventType']) {
		return eventType === 'SALE_FINALIZED' ? m.sale_event() : m.refund_event();
	}

	function syncOne(record: OutboxRecord) {
		const result = demo.syncOne(record.orderId, record.eventType);
		if (!result.ok) demo.flash(m.unreachable());
		else if (result.code === 'duplicate') demo.flash(m.duplicate_sync());
		else demo.flash(m.synced_msg());
	}

	function syncPending() {
		const results = demo.syncAll();
		if (!results.length) {
			demo.flash(m.queue_empty());
			return;
		}
		const failed = results.filter((item) => !item.ok).length;
		if (failed) demo.flash(m.unreachable());
		else demo.flash(m.synced_msg());
	}
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<h1 class="text-2xl font-semibold">{m.sync_page()}</h1>
				<p class="mt-1 max-w-2xl text-sm text-muted">{m.adapter_note()}</p>
			</div>
			<button class="btn btn-primary shrink-0" type="button" disabled={pending === 0} onclick={syncPending}>
				{m.sync_all()}
				{#if pending > 0}<span class="ml-1 tabular-nums">({pending})</span>{/if}
			</button>
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-white px-4 py-3 text-sm">
			<div class="flex items-center gap-2">
				<span class="text-muted">{m.connection()}</span>
				<span class="badge {online ? 'badge-ok' : 'badge-warn'}">{online ? m.link_online() : m.link_offline()}</span>
			</div>
			<div class="hidden h-4 w-px bg-line sm:block" aria-hidden="true"></div>
			<p>
				<span class="text-muted">{m.business()}</span>
				<span class="ml-1.5 font-semibold tabular-nums">{demo.state.settings.businessId}</span>
			</p>
			<p>
				<span class="text-muted">{m.terminal()}</span>
				<span class="ml-1.5 font-semibold tabular-nums">{demo.state.settings.terminalId}</span>
			</p>
			<p>
				<span class="text-muted">{m.warehouse()}</span>
				<span class="ml-1.5 font-semibold tabular-nums">{demo.branch?.warehouseId || '—'}</span>
			</p>
		</div>

		<div class="mt-4 flex flex-wrap gap-2">
			{#each (['ALL', 'PENDING', 'FAILED', 'SYNCED'] as const) as item (item)}
				<button class="chip" type="button" aria-pressed={filter === item} onclick={() => (filter = item)}>
					{item === 'ALL' ? m.filter_all() : statusLabel(item)}
				</button>
			{/each}
		</div>
	</div>

	<div class="card page-list-grid">
		<table class="w-full min-w-[860px] text-left text-sm">
			<thead class="text-xs uppercase text-muted">
				<tr>
					<th class="px-3 py-3">{m.order_no()}</th>
					<th class="px-3 py-3">{m.event()}</th>
					<th class="px-3 py-3">{m.status()}</th>
					<th class="px-3 py-3">{m.date()}</th>
					<th class="px-3 py-3 text-right">{m.attempt()}</th>
					<th class="px-3 py-3">{m.erp_ref()}</th>
					<th class="px-3 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as record (record.id)}
					<tr class="border-t border-line">
						<td class="px-3 py-3">
							<p class="font-semibold text-brand-700">{record.orderNumber}</p>
							<p class="mt-0.5 font-mono text-[11px] text-muted">{record.posTransactionId}</p>
						</td>
						<td class="px-3 py-3">{eventLabel(record.eventType)}</td>
						<td class="px-3 py-3">
							<span class="badge {statusBadge(record.state)}">{statusLabel(record.state)}</span>
						</td>
						<td class="px-3 py-3 text-muted">{formatWhen(record.createdAt)}</td>
						<td class="num px-3 py-3 text-right tabular-nums">{record.attemptCount}</td>
						<td class="px-3 py-3">
							{#if record.erpTransactionId}
								<span class="font-mono text-xs">{record.erpTransactionId}</span>
							{:else}
								<span class="text-muted">—</span>
							{/if}
						</td>
						<td class="px-3 py-3 text-right">
							<div class="icon-action-group">
								{#if record.state !== 'SYNCED'}
									<IconAction
										label={m.sync_now()}
										icon={RefreshCw}
										tone="solid"
										onclick={() => syncOne(record)}
									/>
								{:else}
									<IconAction label={m.retry()} icon={RefreshCw} tone="muted" onclick={() => syncOne(record)} />
								{/if}
								<IconAction label={m.inspect()} icon={Eye} tone="muted" onclick={() => (detail = record)} />
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="px-3 py-10" colspan="7">
							<div class="config-empty">
								<strong>{m.queue_empty()}</strong>
								<span>{m.idempotent()}</span>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if detail}
	{@const record = detail}
	<Dialog title={`${record.orderNumber} · ${eventLabel(record.eventType)}`} onclose={() => (detail = null)}>
		<div class="space-y-3 text-sm">
			<div class="flex flex-wrap items-center gap-2">
				<span class="badge {statusBadge(record.state)}">{statusLabel(record.state)}</span>
				<span class="text-muted">{formatWhen(record.createdAt)}</span>
			</div>

			<dl class="grid gap-2 sm:grid-cols-2">
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-muted">{m.pos_tx()}</dt>
					<dd class="mt-0.5 break-all font-mono text-xs">{record.posTransactionId}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-muted">{m.erp_ref()}</dt>
					<dd class="mt-0.5 font-mono text-xs">{record.erpTransactionId || '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-wide text-muted">{m.attempt()}</dt>
					<dd class="mt-0.5 tabular-nums">{record.attemptCount}</dd>
				</div>
				{#if record.state !== 'SYNCED'}
					<div class="sm:col-span-2">
						<p class="rounded-md bg-warning/10 px-3 py-2 text-warning">{m.not_posted()}</p>
					</div>
				{/if}
			</dl>

			{#if detailOrder}
				<div class="rounded-lg border border-line bg-page px-3 py-3">
					<p>
						<span class="text-muted">{m.tender_account()}:</span>
						{detailOrder.payment?.method ? payMethodLabel(detailOrder.payment.method) : '—'}
						· {formatUsd(detailOrder.totals.total)}
						· {label(detailOrder.totals.taxName)} {formatUsd(detailOrder.totals.tax)}
					</p>
					<p class="mt-2 break-all">
						<span class="text-muted">{m.erp_items()}:</span>
						{detailOrder.lines.map((line) => `${line.erpItemId} × ${line.quantity}`).join(', ') || '—'}
					</p>
					<p class="mt-2 text-xs text-muted">
						{m.ids()}: {detailOrder.branchId} / {detailOrder.warehouseId} / {detailOrder.terminalId}
					</p>
				</div>
			{/if}
		</div>

		{#snippet footer()}
			<div class="flex flex-wrap justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (detail = null)}>{m.hide_details()}</button>
				<button class="btn btn-primary" type="button" onclick={() => syncOne(record)}>
					{record.state === 'SYNCED' ? m.retry() : m.sync_now()}
				</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
