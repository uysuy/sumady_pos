<script lang="ts">
	import ReportFilters from '$lib/components/report-filters.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import { formatKhr, formatUsd, toKhr } from '$lib/domain/money';
	import { downloadCsv, toCsv } from '$lib/domain/report-export';
	import type { RangeKey } from '$lib/domain/report-core';
	import { buildSalesReports } from '$lib/domain/sales-reports';
	import { formatWhen, href, label } from '$lib/i18n/label';
	import { paymentStatusLabel, payMethodLabel } from '$lib/i18n/domain-labels';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';
	import * as echarts from 'echarts';
	import { onMount } from 'svelte';

	const pageSizeOptions = [
		{ value: '25', label: '25' },
		{ value: '50', label: '50' },
		{ value: '100', label: '100' }
	];

	type Tab =
		| 'summary'
		| 'detail'
		| 'product'
		| 'category'
		| 'variant'
		| 'modifier'
		| 'hour'
		| 'cashier'
		| 'branch';

	let tab = $state<Tab>('summary');
	let range = $state<RangeKey>('today');
	let from = $state('');
	let to = $state('');
	let branchId = $state('');
	let cashierId = $state('');
	let query = $state('');
	let page = $state(1);
	let pageSize = $state(25);
	let host = $state<HTMLDivElement | null>(null);
	let chart: echarts.ECharts | null = null;

	const allowed = $derived(demo.can('reports'));

	const rate = $derived(demo.state.settings.usdToKhr);

	const moneyPair = (cents: number) => `${formatUsd(cents)} · ${formatKhr(toKhr(cents, rate))}`;

	const report = $derived.by(() => {
		demo.state.orders;
		return buildSalesReports(demo.state.orders, { range, from, to, branchId, cashierId });
	});

	const staffName = (id: string) => label(demo.state.staff.find((s) => s.id === id)?.name) || id;
	const branchName = (id: string) => label(demo.state.branches.find((b) => b.id === id)?.name) || id;
	const categoryName = (id: string) => label(demo.state.categories.find((c) => c.id === id)?.name) || id;

	const tabs: { id: Tab; title: () => string }[] = [
		{ id: 'summary', title: m.report_summary },
		{ id: 'detail', title: m.report_sales_detail },
		{ id: 'product', title: m.report_by_product },
		{ id: 'category', title: m.report_by_category },
		{ id: 'variant', title: m.report_by_variant },
		{ id: 'modifier', title: m.report_by_modifier },
		{ id: 'hour', title: m.report_by_hour },
		{ id: 'cashier', title: m.report_by_cashier },
		{ id: 'branch', title: m.report_by_branch }
	];

	$effect(() => {
		void tab;
		void query;
		page = 1;
	});

	onMount(() => {
		if (!host) return;
		chart = echarts.init(host);
		const observer = new ResizeObserver(() => chart?.resize());
		observer.observe(host);
		return () => {
			observer.disconnect();
			chart?.dispose();
		};
	});

	$effect(() => {
		if (tab !== 'summary') return;
		const labels = report.series.map((point) => point.label);
		const data = report.series.map((point) => point.total / 100);
		chart?.setOption({
			color: ['#07883F'],
			tooltip: { trigger: 'axis' },
			grid: { left: 48, right: 16, top: 24, bottom: 32 },
			xAxis: { type: 'category', data: labels },
			yAxis: { type: 'value' },
			series: [{ type: 'bar', data, name: 'USD' }]
		});
	});

	function matches(hay: string) {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return hay.toLowerCase().includes(q);
	}

	const detailFiltered = $derived(
		report.detail.filter((row) =>
			matches(`${row.orderNumber} ${staffName(row.cashierId)} ${branchName(row.branchId)}`)
		)
	);
	const productFiltered = $derived(
		report.byProduct.filter((row) => matches(label(row.name)))
	);
	const categoryFiltered = $derived(
		report.byCategory.filter((row) => matches(categoryName(row.categoryId)))
	);
	const variantFiltered = $derived(
		report.byVariant.filter((row) => matches(`${label(row.name)} ${row.modifiers}`))
	);
	const modifierFiltered = $derived(
		report.byModifier.filter((row) => matches(`${label(row.groupName)} ${label(row.optionName)}`))
	);
	const hourFiltered = $derived(report.byHour.filter((row) => matches(row.label)));
	const cashierFiltered = $derived(
		report.byCashier.filter((row) => matches(staffName(row.cashierId)))
	);
	const branchFiltered = $derived(
		report.byBranch.filter((row) => matches(branchName(row.branchId)))
	);

	const size = $derived(Number(pageSize) || 25);

	function pageSlice<T>(rows: T[]): T[] {
		const start = (page - 1) * size;
		return rows.slice(start, start + size);
	}

	function pageCount(total: number) {
		return Math.max(1, Math.ceil(total / size));
	}

	function exportCurrent() {
		const stamp = new Date().toISOString().slice(0, 10);
		if (tab === 'detail') {
			downloadCsv(
				`sales-detail-${stamp}.csv`,
				toCsv(
					['Order', 'Paid at', 'Branch', 'Cashier', 'Items', 'Gross', 'Discount', 'Tax', 'Ticket', 'Refunds', 'Net'],
					detailFiltered.map((row) => [
						row.orderNumber,
						row.paidAt,
						branchName(row.branchId),
						staffName(row.cashierId),
						row.itemCount,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.tax / 100).toFixed(2),
						(row.ticketTotal / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.collected / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'product') {
			downloadCsv(
				`sales-by-product-${stamp}.csv`,
				toCsv(
					['Product', 'Qty', 'Gross', 'Discount', 'Refunds', 'Net'],
					productFiltered.map((row) => [
						label(row.name),
						row.qty,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.net / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'category') {
			downloadCsv(
				`sales-by-category-${stamp}.csv`,
				toCsv(
					['Category', 'Qty', 'Gross', 'Discount', 'Refunds', 'Net'],
					categoryFiltered.map((row) => [
						categoryName(row.categoryId),
						row.qty,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.net / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'variant') {
			downloadCsv(
				`sales-by-variant-${stamp}.csv`,
				toCsv(
					['Product', 'Modifiers', 'Qty', 'Gross', 'Discount', 'Refunds', 'Net'],
					variantFiltered.map((row) => [
						label(row.name),
						row.modifiers,
						row.qty,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.net / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'modifier') {
			downloadCsv(
				`sales-by-modifier-${stamp}.csv`,
				toCsv(
					['Group', 'Option', 'Qty', 'Modifier revenue'],
					modifierFiltered.map((row) => [
						label(row.groupName),
						label(row.optionName),
						row.qty,
						(row.deltaRevenue / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'hour') {
			downloadCsv(
				`sales-by-hour-${stamp}.csv`,
				toCsv(
					['Hour', 'Orders', 'Gross', 'Net'],
					hourFiltered.map((row) => [
						row.label,
						row.orderCount,
						(row.gross / 100).toFixed(2),
						(row.collected / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'cashier') {
			downloadCsv(
				`sales-by-cashier-${stamp}.csv`,
				toCsv(
					['Cashier', 'Orders', 'Gross', 'Discount', 'Refunds', 'Net'],
					cashierFiltered.map((row) => [
						staffName(row.cashierId),
						row.orderCount,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.collected / 100).toFixed(2)
					])
				)
			);
			return;
		}
		if (tab === 'branch') {
			downloadCsv(
				`sales-by-branch-${stamp}.csv`,
				toCsv(
					['Branch', 'Orders', 'Gross', 'Discount', 'Refunds', 'Net'],
					branchFiltered.map((row) => [
						branchName(row.branchId),
						row.orderCount,
						(row.gross / 100).toFixed(2),
						(row.discounts / 100).toFixed(2),
						(row.refunds / 100).toFixed(2),
						(row.collected / 100).toFixed(2)
					])
				)
			);
			return;
		}
		downloadCsv(
			`sales-summary-${stamp}.csv`,
			toCsv(
				['Metric', 'USD'],
				[
					['Gross', (report.totals.gross / 100).toFixed(2)],
					['Discounts', (report.totals.discounts / 100).toFixed(2)],
					['Tax', (report.totals.tax / 100).toFixed(2)],
					['Ticket total', (report.totals.ticketTotal / 100).toFixed(2)],
					['Refunds', (report.totals.refunds / 100).toFixed(2)],
					['Net / collected', (report.totals.collected / 100).toFixed(2)],
					['Orders', report.totals.orderCount]
				]
			)
		);
	}
</script>

{#if !allowed}
	<div class="flex h-full items-center justify-center p-6">
		<p class="text-muted">{m.reports_denied()}</p>
	</div>
{:else}
	<div class="h-full overflow-auto p-4 md:p-6">
		<h1 class="text-2xl font-semibold">{m.reports_title()}</h1>
		<p class="mt-1 max-w-4xl text-sm text-muted">{m.metric_help_v2()}</p>

		<div class="mt-4 flex flex-wrap gap-2">
			{#each tabs as item (item.id)}
				<button class="chip" type="button" aria-pressed={tab === item.id} onclick={() => (tab = item.id)}>
					{item.title()}
				</button>
			{/each}
		</div>

		<ReportFilters
			bind:range
			bind:from
			bind:to
			bind:branchId
			bind:cashierId
			showCashier={tab !== 'branch'}
			onexport={exportCurrent}
		/>

		<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div class="card bg-brand-50 p-4">
				<p class="text-sm text-muted">{m.collected()}</p>
				<p class="num text-3xl font-bold text-brand-700">{formatUsd(report.totals.collected)}</p>
				<p class="num text-sm">{formatKhr(toKhr(report.totals.collected, rate))}</p>
			</div>
			<div class="card p-4">
				<p class="text-sm text-muted">{m.kpi_orders()}</p>
				<p class="num text-3xl font-bold">{report.totals.orderCount}</p>
			</div>
			<div class="card p-4">
				<p class="text-sm text-muted">{m.kpi_aov()}</p>
				<p class="num text-3xl font-bold">{formatUsd(report.totals.average)}</p>
			</div>
			<div class="card p-4">
				<p class="text-sm text-muted">{m.refunds_total()}</p>
				<p class="num text-3xl font-bold">{formatUsd(report.totals.refunds)}</p>
			</div>
		</div>
		<div class="mt-3 grid gap-3 md:grid-cols-4">
			<div class="card p-3 text-sm"><p class="text-muted">{m.gross()}</p><p class="num font-bold">{moneyPair(report.totals.gross)}</p></div>
			<div class="card p-3 text-sm"><p class="text-muted">{m.discounts()}</p><p class="num font-bold">{moneyPair(report.totals.discounts)}</p></div>
			<div class="card p-3 text-sm"><p class="text-muted">{m.tax_collected()}</p><p class="num font-bold">{moneyPair(report.totals.tax)}</p></div>
			<div class="card p-3 text-sm"><p class="text-muted">{m.ticket_total()}</p><p class="num font-bold">{moneyPair(report.totals.ticketTotal)}</p></div>
		</div>

		{#if tab === 'summary'}
			<div class="card mt-4 p-4">
				<h2 class="font-semibold">{m.chart_sales()}</h2>
				<div class="mt-2 h-64" bind:this={host}></div>
				{#if report.totals.orderCount === 0}<p class="text-sm text-muted">{m.empty_report()}</p>{/if}
			</div>
			<div class="mt-4 grid gap-4 lg:grid-cols-2">
				<section class="card p-4">
					<h2 class="font-semibold">{m.by_category()}</h2>
					<ul class="mt-3 space-y-2 text-sm">
						{#each report.byCategory.slice(0, 8) as row (row.categoryId)}
							<li class="flex justify-between"><span>{categoryName(row.categoryId)}</span><span class="num">{formatUsd(row.net)}</span></li>
						{:else}<li class="text-muted">{m.empty_report()}</li>{/each}
					</ul>
				</section>
				<section class="card p-4">
					<h2 class="font-semibold">{m.by_payment()}</h2>
					<ul class="mt-3 space-y-2 text-sm">
						{#each report.byPayment as row (row.method)}
							<li class="flex justify-between"><span>{payMethodLabel(row.method)} · {row.count}</span><span class="num">{formatUsd(row.total)}</span></li>
						{:else}<li class="text-muted">{m.empty_report()}</li>{/each}
					</ul>
				</section>
				<section class="card p-4">
					<h2 class="font-semibold">{m.top_products()}</h2>
					<ul class="mt-3 space-y-2 text-sm">
						{#each report.byProduct.slice(0, 8) as row (row.productId)}
							<li class="flex justify-between"><span>{label(row.name)} · {row.qty}</span><span class="num">{formatUsd(row.net)}</span></li>
						{:else}<li class="text-muted">{m.empty_report()}</li>{/each}
					</ul>
				</section>
				<section class="card p-4">
					<h2 class="font-semibold">{m.by_cashier()}</h2>
					<ul class="mt-3 space-y-2 text-sm">
						{#each report.byCashier as row (row.cashierId)}
							<li class="flex justify-between"><span>{staffName(row.cashierId)} · {row.orderCount}</span><span class="num">{formatUsd(row.collected)}</span></li>
						{:else}<li class="text-muted">{m.empty_report()}</li>{/each}
					</ul>
				</section>
			</div>
		{:else}
			<div class="mt-4 flex flex-wrap items-end gap-2">
				<input class="field max-w-sm flex-1" placeholder={m.report_search()} aria-label={m.report_search()} bind:value={query} />
				<label class="flex items-center gap-2 text-sm text-muted">
					{m.report_page_size()}
					<SelectMenu
						class="w-24"
						ariaLabel={m.report_page_size()}
						value={String(pageSize)}
						options={pageSizeOptions}
						onchange={(value) => {
							pageSize = Number(value);
							page = 1;
						}}
					/>
				</label>
			</div>

			<div class="card mt-3 max-h-[min(70vh,40rem)] overflow-auto">
				{#if tab === 'detail'}
					{@const rows = pageSlice(detailFiltered)}
					<table class="w-full min-w-[960px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.order_no()}</th>
								<th class="px-3 py-3">{m.date()}</th>
								<th class="px-3 py-3">{m.branch()}</th>
								<th class="px-3 py-3">{m.cashier()}</th>
								<th class="px-3 py-3 text-right">{m.items()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.refunds_total()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
								<th class="px-3 py-3">{m.payment()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.orderId)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-semibold"><a class="text-brand-700" href={href(`/orders?order=${encodeURIComponent(row.orderId)}`)}>{row.orderNumber}</a></td>
									<td class="px-3 py-3">{formatWhen(row.paidAt)}</td>
									<td class="px-3 py-3">{branchName(row.branchId)}</td>
									<td class="px-3 py-3">{staffName(row.cashierId)}</td>
									<td class="num px-3 py-3 text-right">{row.itemCount}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.refunds)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.collected)}</td>
									<td class="px-3 py-3">{paymentStatusLabel(row.paymentStatus)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="10">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
					{#if detailFiltered.length > size}
						<div class="flex items-center justify-between border-t border-line px-3 py-2 text-sm">
							<button class="btn btn-secondary" type="button" disabled={page <= 1} onclick={() => (page -= 1)}>‹</button>
							<span>{page} / {pageCount(detailFiltered.length)}</span>
							<button class="btn btn-secondary" type="button" disabled={page >= pageCount(detailFiltered.length)} onclick={() => (page += 1)}>›</button>
						</div>
					{/if}
				{:else if tab === 'product'}
					{@const rows = pageSlice(productFiltered)}
					<table class="w-full min-w-[720px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.product()}</th>
								<th class="px-3 py-3 text-right">{m.qty()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.refunds_total()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.productId)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{label(row.name)}</td>
									<td class="num px-3 py-3 text-right">{row.qty}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.refunds)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.net)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="6">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'category'}
					{@const rows = pageSlice(categoryFiltered)}
					<table class="w-full min-w-[720px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.category()}</th>
								<th class="px-3 py-3 text-right">{m.qty()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.refunds_total()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.categoryId)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{categoryName(row.categoryId)}</td>
									<td class="num px-3 py-3 text-right">{row.qty}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.refunds)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.net)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="6">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'variant'}
					{@const rows = pageSlice(variantFiltered)}
					<table class="w-full min-w-[820px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.product()}</th>
								<th class="px-3 py-3">{m.modifiers()}</th>
								<th class="px-3 py-3 text-right">{m.qty()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.key)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{label(row.name)}</td>
									<td class="px-3 py-3 text-muted">{row.modifiers}</td>
									<td class="num px-3 py-3 text-right">{row.qty}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.net)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="6">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'modifier'}
					{@const rows = pageSlice(modifierFiltered)}
					<table class="w-full min-w-[640px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.category()}</th>
								<th class="px-3 py-3">{m.modifiers()}</th>
								<th class="px-3 py-3 text-right">{m.qty()}</th>
								<th class="px-3 py-3 text-right">{m.delta_revenue()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (`${row.groupId}:${row.optionId}`)}
								<tr class="border-t border-line">
									<td class="px-3 py-3">{label(row.groupName)}</td>
									<td class="px-3 py-3 font-medium">{label(row.optionName)}</td>
									<td class="num px-3 py-3 text-right">{row.qty}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.deltaRevenue)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="4">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'hour'}
					{@const rows = pageSlice(hourFiltered)}
					<table class="w-full min-w-[520px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.hour()}</th>
								<th class="px-3 py-3 text-right">{m.orders_count()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.hour)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{row.label}</td>
									<td class="num px-3 py-3 text-right">{row.orderCount}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.collected)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="4">{m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'cashier'}
					{@const rows = pageSlice(cashierFiltered)}
					<table class="w-full min-w-[720px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.cashier()}</th>
								<th class="px-3 py-3 text-right">{m.orders_count()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.refunds_total()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.cashierId)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{staffName(row.cashierId)}</td>
									<td class="num px-3 py-3 text-right">{row.orderCount}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.refunds)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.collected)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="6">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if tab === 'branch'}
					{@const rows = pageSlice(branchFiltered)}
					<table class="w-full min-w-[720px] text-left text-sm">
						<thead class="text-xs uppercase text-muted">
							<tr>
								<th class="px-3 py-3">{m.branch()}</th>
								<th class="px-3 py-3 text-right">{m.orders_count()}</th>
								<th class="px-3 py-3 text-right">{m.gross()}</th>
								<th class="px-3 py-3 text-right">{m.discounts()}</th>
								<th class="px-3 py-3 text-right">{m.refunds_total()}</th>
								<th class="px-3 py-3 text-right">{m.net_amount()}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.branchId)}
								<tr class="border-t border-line">
									<td class="px-3 py-3 font-medium">{branchName(row.branchId)}</td>
									<td class="num px-3 py-3 text-right">{row.orderCount}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.gross)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.discounts)}</td>
									<td class="num px-3 py-3 text-right">{formatUsd(row.refunds)}</td>
									<td class="num px-3 py-3 text-right font-semibold">{formatUsd(row.collected)}</td>
								</tr>
							{:else}
								<tr><td class="px-3 py-6 text-muted" colspan="6">{query ? m.no_matching_rows() : m.empty_report()}</td></tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
	</div>
{/if}
