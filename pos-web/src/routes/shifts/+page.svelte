<script lang="ts">
	import AdminSection from '$lib/components/admin-section.svelte';
	import Dialog from '$lib/components/dialog.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import { formatUsd } from '$lib/domain/money';
	import { shiftFigures } from '$lib/domain/reports';
	import { payMethodLabel } from '$lib/i18n/domain-labels';
	import { formatWhen, label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	let openDialog = $state(false);
	let closeDialog = $state(false);
	let opening = $state('200.00');
	let note = $state('');
	let moveAmount = $state('');
	let moveReason = $state('');
	let moveType = $state<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
	let counted = $state('');
	let reportShiftId = $state<string | null>(null);
	const reportShift = $derived(reportShiftId ? demo.state.shifts.find((item) => item.id === reportShiftId) : undefined);

	const shift = $derived(demo.currentShift);
	const figures = $derived(shift ? shiftFigures(shift, demo.state.orders) : null);
	const canShift = $derived(demo.can('shifts'));
	const branchName = $derived(label(demo.branch?.name));
	const cashierName = $derived(label(demo.staff?.name));
	const history = $derived(
		demo.state.shifts
			.filter((item) => item.status === 'CLOSED' && item.branchId === demo.state.activeBranchId)
			.sort((a, b) => (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt))
	);

	const countedCents = $derived.by(() => {
		const raw = Number(counted);
		if (!Number.isFinite(raw) || counted.trim() === '') return null;
		return Math.round(raw * 100);
	});
	const liveDiff = $derived(
		figures && countedCents != null ? countedCents - figures.expected : null
	);

	function diffLabel(value: number) {
		if (value === 0) return m.balanced();
		return value > 0 ? m.over() : m.short();
	}

	function diffClass(value: number) {
		if (value === 0) return 'text-brand-700';
		return value > 0 ? 'text-warning' : 'text-danger';
	}

	function showOpenDialog() {
		opening = '200.00';
		note = '';
		openDialog = true;
	}

	function showCloseDialog() {
		counted = '';
		closeDialog = true;
	}

	function open() {
		const result = demo.openShift(Math.round(Number(opening) * 100), note);
		if (result === 'duplicate') demo.flash(m.already_open());
		else if (result === 'amount') demo.flash(m.need_amount());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else {
			openDialog = false;
			note = '';
			demo.flash(m.shift_opened());
		}
	}

	function move() {
		const result = demo.cashMove(moveType, Math.round(Number(moveAmount) * 100), moveReason);
		if (result === 'amount') demo.flash(m.need_amount());
		else if (result === 'reason') demo.flash(m.need_reason());
		else if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'closed') demo.flash(m.no_shift_yet());
		else {
			moveAmount = '';
			moveReason = '';
			demo.flash(m.movement_saved());
		}
	}

	function close() {
		if (countedCents == null) {
			demo.flash(m.need_amount());
			return;
		}
		const result = demo.closeShift(countedCents);
		if (result !== 'ok') {
			demo.flash(result === 'permission' ? m.permission_denied() : m.need_amount());
			return;
		}
		closeDialog = false;
		counted = '';
		demo.flash(m.shift_closed_msg());
	}
</script>

<div class="h-full overflow-auto p-4 md:p-6">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold">{m.shifts_title()}</h1>
			<p class="mt-1 text-sm text-muted">{m.shift_staff_scope()}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<span class="badge badge-neutral">{m.shift_cashier()}: {cashierName || '—'}</span>
			<span class="badge badge-neutral">{branchName || '—'}</span>
			{#if shift}
				<span class="badge badge-ok">{m.shift_active()}</span>
				<button class="btn btn-danger btn-sm" type="button" disabled={!canShift} onclick={showCloseDialog}>
					{m.close_shift()}
				</button>
			{:else}
				<span class="badge badge-warn">{m.no_shift_yet()}</span>
				<button class="btn btn-primary btn-sm" type="button" disabled={!canShift} onclick={showOpenDialog}>
					{m.open_shift()}
				</button>
			{/if}
		</div>
	</header>

	{#if !shift}
		<section class="card mt-5 px-4 py-10 text-center">
			<p class="text-base font-semibold">{m.no_shift_yet()}</p>
			<p class="mx-auto mt-1 max-w-md text-sm text-muted">{m.shift_open_hint()}</p>
			<button class="btn btn-primary mt-5" type="button" disabled={!canShift} onclick={showOpenDialog}>
				{m.open_shift()}
			</button>
		</section>
	{:else if figures}
		<section class="card mt-5 overflow-hidden">
			<header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
				<div class="min-w-0">
					<h2 class="text-base font-semibold">{m.shift_summary()}</h2>
					<p class="mt-0.5 text-sm text-muted">
						{m.shift_opened_at()}: {formatWhen(shift.openedAt)}
						{#if shift.note}<span> · {shift.note}</span>{/if}
					</p>
				</div>
				<span class="badge badge-ok">{m.shift_open()}</span>
			</header>

			<div class="grid grid-cols-2 border-b border-line sm:grid-cols-3 lg:grid-cols-6">
				<div class="border-b border-line p-4 sm:border-b-0 lg:border-r">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.opening_cash()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums">{formatUsd(shift.openingCash)}</p>
				</div>
				<div class="border-b border-l border-line p-4 sm:border-b-0 lg:border-r">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.cash_sales()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums">{formatUsd(figures.cashSales)}</p>
				</div>
				<div class="border-b border-line p-4 sm:border-b-0 sm:border-l lg:border-r">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.non_cash()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums">{formatUsd(figures.nonCashSales)}</p>
				</div>
				<div class="border-b border-l border-line p-4 sm:border-b-0 lg:border-r">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.cash_in()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums text-brand-700">{formatUsd(figures.cashIn)}</p>
				</div>
				<div class="border-line p-4 sm:border-l lg:border-r">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.cash_out()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums text-danger">{formatUsd(figures.cashOut)}</p>
				</div>
				<div class="border-l border-line bg-brand-50/50 p-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.expected_now()}</p>
					<p class="num mt-1 text-lg font-bold tabular-nums text-brand-700">{formatUsd(figures.expected)}</p>
				</div>
			</div>
			<p class="px-4 py-2 text-xs text-muted">{m.formula()} · {m.non_cash_note()}</p>
		</section>

		<div class="mt-4">
			<AdminSection title={m.movements()} pad={false}>
				{#snippet actions()}
					<span class="text-xs tabular-nums text-muted">{shift.movements.length}</span>
				{/snippet}
				<div class="border-b border-line p-4">
					<div class="grid gap-2 sm:grid-cols-[9rem_8rem_minmax(0,1fr)_auto]">
						<SelectMenu
							ariaLabel={m.movement_type()}
							bind:value={moveType}
							disabled={!canShift}
							options={[
								{ value: 'CASH_IN', label: m.cash_in() },
								{ value: 'CASH_OUT', label: m.cash_out() }
							]}
						/>
						<NumberField
							min={0}
							step={0.01}
							placeholder={m.amount()}
							ariaLabel={m.amount()}
							bind:value={moveAmount}
							disabled={!canShift}
						/>
						<input
							class="field"
							placeholder={m.reason()}
							aria-label={m.reason()}
							bind:value={moveReason}
							disabled={!canShift}
						/>
						<button class="btn btn-secondary" type="button" disabled={!canShift} onclick={move}>
							{m.record_movement()}
						</button>
					</div>
				</div>
				{#if shift.movements.length === 0}
					<p class="px-4 py-8 text-sm text-muted">{m.no_movement()}</p>
				{:else}
					<div class="max-h-[min(40vh,18rem)] overflow-auto">
						<table class="w-full min-w-[420px] text-left text-sm">
							<thead class="text-xs uppercase text-muted">
								<tr>
									<th class="px-4 py-2.5">{m.movement_type()}</th>
									<th class="px-4 py-2.5">{m.reason()}</th>
									<th class="px-4 py-2.5">{m.time()}</th>
									<th class="px-4 py-2.5 text-right">{m.amount()}</th>
								</tr>
							</thead>
							<tbody>
								{#each [...shift.movements].reverse() as movement (movement.id)}
									<tr class="border-t border-line">
										<td class="px-4 py-2.5">
											<span class="badge {movement.type === 'CASH_IN' ? 'badge-ok' : 'badge-danger'}">
												{movement.type === 'CASH_IN' ? m.cash_in() : m.cash_out()}
											</span>
										</td>
										<td class="px-4 py-2.5">{movement.reason}</td>
										<td class="px-4 py-2.5 text-muted">{formatWhen(movement.createdAt)}</td>
										<td class="num px-4 py-2.5 text-right font-semibold tabular-nums">
											{movement.type === 'CASH_OUT' ? '−' : '+'}{formatUsd(movement.amount)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</AdminSection>
		</div>
	{/if}

	<section class="card mt-6 overflow-hidden">
		<header class="border-b border-line px-4 py-3">
			<h2 class="text-base font-semibold">{m.history_shifts()}</h2>
		</header>
		{#if history.length === 0}
			<p class="px-4 py-8 text-sm text-muted">{m.shift_history_empty()}</p>
		{:else}
			<div class="max-h-[min(50vh,24rem)] overflow-auto">
				<table class="w-full min-w-[720px] text-left text-sm">
					<thead class="text-xs uppercase text-muted">
						<tr>
							<th class="px-4 py-3">{m.shift_cashier()}</th>
							<th class="px-4 py-3">{m.shift_opened_at()}</th>
							<th class="px-4 py-3">{m.shift_closed_at()}</th>
							<th class="px-4 py-3 text-right">{m.expected()}</th>
							<th class="px-4 py-3 text-right">{m.counted()}</th>
							<th class="px-4 py-3 text-right">{m.difference()}</th>
							<th class="px-4 py-3">{m.shift_status()}</th>
						</tr>
					</thead>
					<tbody>
						{#each history as item (item.id)}
							{@const closed = shiftFigures(item, demo.state.orders)}
							{@const staffName = label(demo.state.staff.find((person) => person.id === item.staffId)?.name)}
							<tr class="border-t border-line">
								<td class="px-4 py-3 font-semibold">{staffName || '—'}</td>
								<td class="px-4 py-3 text-muted">{formatWhen(item.openedAt)}</td>
								<td class="px-4 py-3 text-muted">{item.closedAt ? formatWhen(item.closedAt) : '—'}</td>
								<td class="num px-4 py-3 text-right tabular-nums">{formatUsd(closed.expected)}</td>
								<td class="num px-4 py-3 text-right tabular-nums">
									{item.countedCash != null ? formatUsd(item.countedCash) : '—'}
								</td>
								<td class="num px-4 py-3 text-right font-semibold tabular-nums {diffClass(closed.difference)}">
									{formatUsd(closed.difference)}
									<span class="ml-1 font-medium">({diffLabel(closed.difference)})</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex flex-wrap items-center gap-2">
										<span class="badge badge-neutral">{m.shift_closed()}</span>
										{#if item.closingReport}
											<button class="btn btn-secondary btn-sm" type="button" onclick={() => (reportShiftId = item.id)}>
												{m.view_closing_report()}
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

{#if reportShift?.closingReport}
	{@const report = reportShift.closingReport}
	{@const reportStaff = label(demo.state.staff.find((person) => person.id === report.staffId)?.name)}
	<Dialog title={m.closing_report()} wide onclose={() => (reportShiftId = null)}>
		<p class="rounded border border-line bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">{m.closing_immutable()}</p>
		<p class="mt-3 text-sm text-muted">
			{m.shift_cashier()}: {reportStaff || '—'} · {m.shift_closed_at()}: {formatWhen(report.closedAt)}
		</p>
		<dl class="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
			{#each [
				{ title: m.opening_cash(), value: report.openingCash },
				{ title: m.cash_sales(), value: report.cashSales },
				{ title: m.non_cash(), value: report.nonCashSales },
				{ title: m.amount_received(), value: report.cashReceived },
				{ title: m.change_due(), value: report.cashChange },
				{ title: m.refunded(), value: report.cashRefunds },
				{ title: m.expected(), value: report.expectedCash },
				{ title: m.counted(), value: report.countedCash },
				{ title: m.difference(), value: report.overShort }
			] as cell (cell.title)}
				<div class="rounded border border-line px-3 py-2">
					<dt class="text-xs font-semibold uppercase tracking-wide text-muted">{cell.title}</dt>
					<dd class="num mt-1 font-bold tabular-nums">{formatUsd(cell.value)}</dd>
				</div>
			{/each}
		</dl>
		{#if report.byMethod.length}
			<table class="mt-4 w-full text-left text-sm">
				<thead class="text-xs uppercase text-muted">
					<tr>
						<th class="py-2">{m.payment()}</th>
						<th class="py-2 text-right">{m.nav_orders()}</th>
						<th class="py-2 text-right">{m.amount()}</th>
					</tr>
				</thead>
				<tbody>
					{#each report.byMethod as row (row.method)}
						<tr class="border-t border-line">
							<td class="py-2">{payMethodLabel(row.method)}</td>
							<td class="num py-2 text-right tabular-nums">{row.count}</td>
							<td class="num py-2 text-right font-semibold tabular-nums">{formatUsd(row.applied)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if report.movements.length}
			<h3 class="mt-4 text-sm font-semibold">{m.movements()}</h3>
			<ul class="mt-2 divide-y divide-line text-sm">
				{#each report.movements as movement (movement.id)}
					<li class="flex justify-between gap-3 py-1.5">
						<span>{movement.type === 'CASH_IN' ? m.cash_in() : m.cash_out()} · {movement.reason}</span>
						<span class="num font-semibold tabular-nums">{movement.type === 'CASH_OUT' ? '−' : '+'}{formatUsd(movement.amount)}</span>
					</li>
				{/each}
			</ul>
		{/if}
		{#snippet footer()}
			<div class="flex justify-end">
				<button class="btn btn-secondary" type="button" onclick={() => (reportShiftId = null)}>{m.close()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if openDialog}
	<Dialog title={m.shift_open_title()} onclose={() => (openDialog = false)}>
		<p class="text-sm text-muted">{m.shift_open_hint()}</p>
		<label class="mt-4 block text-sm font-semibold" for="opening">{m.opening_cash()}</label>
		<NumberField
			id="opening"
			class="mt-1"
			min={0}
			step={0.01}
			bind:value={opening}
			ariaLabel={m.opening_cash()}
			disabled={!canShift}
		/>
		<label class="mt-3 block text-sm font-semibold" for="open-note">{m.opening_note()}</label>
		<input
			id="open-note"
			class="field mt-1"
			bind:value={note}
			disabled={!canShift}
			placeholder={m.optional_note()}
		/>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (openDialog = false)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canShift} onclick={open}>{m.open_shift()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if closeDialog && figures}
	<Dialog title={m.shift_close_title()} onclose={() => (closeDialog = false)}>
		<p class="text-sm text-muted">{m.shift_close_hint()}</p>
		<div class="mt-4 rounded border border-line bg-page px-3 py-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.expected()}</p>
			<p class="num mt-1 text-2xl font-bold tabular-nums text-brand-700">{formatUsd(figures.expected)}</p>
			<p class="mt-1 text-xs text-muted">{m.formula()}</p>
		</div>
		<label class="mt-4 block text-sm font-semibold" for="counted">{m.counted_input()}</label>
		<NumberField
			id="counted"
			class="mt-1"
			min={0}
			step={0.01}
			bind:value={counted}
			ariaLabel={m.counted_input()}
			disabled={!canShift}
		/>
		<p class="mt-1 text-xs text-muted">{m.counted_hint()}</p>
		{#if liveDiff != null}
			<div class="mt-3 flex items-center justify-between rounded border border-line px-3 py-2.5 text-sm">
				<span class="text-muted">{m.difference()}</span>
				<span class="num font-bold tabular-nums {diffClass(liveDiff)}">
					{formatUsd(liveDiff)} · {diffLabel(liveDiff)}
				</span>
			</div>
		{/if}
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (closeDialog = false)}>{m.cancel()}</button>
				<button class="btn btn-danger" type="button" disabled={!canShift} onclick={close}>{m.close_shift()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
