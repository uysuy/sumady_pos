<script lang="ts">
	import { isKitchenBoardOrder } from '$lib/cds/queue';
	import { label } from '$lib/i18n/label';
	import { orderTypeLabel } from '$lib/i18n/domain-labels';
	import { demo } from '$lib/state/demo.svelte';
	import type { CartLine, KitchenStatus, Order } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { onMount } from 'svelte';

	type Lane = 'NEW' | 'IN_PROGRESS' | 'NEAR_READY' | 'READY' | 'COMPLETED';

	let now = $state(Date.now());
	let showDone = $state(false);
	let stationId = $state('all');
	/** Plain Sets — must not be $state or the new-ticket effect retriggers itself every write. */
	let seenNew = new Set<string>();
	let primed = false;
	let flashIds = $state<Set<string>>(new Set());
	let lastBumpId = $state<string | null>(null);
	let audioCtx: AudioContext | null = null;

	onMount(() => {
		demo.pullSharedState();
		const timer = setInterval(() => (now = Date.now()), 15000);
		const sync = setInterval(() => demo.pullSharedState(), 2000);
		return () => {
			clearInterval(timer);
			clearInterval(sync);
			void audioCtx?.close();
			audioCtx = null;
		};
	});

	const allowed = $derived(demo.can('kitchen'));

	const tableName = $derived.by(() => {
		const map = new Map<string, string>();
		for (const table of demo.state.tables) map.set(table.id, table.name);
		return map;
	});

	const categoryName = $derived.by(() => {
		const map = new Map<string, string>();
		for (const category of demo.state.categories) map.set(category.id, label(category.name));
		return map;
	});

	const branchOrders = $derived(
		demo.state.orders.filter((order) => isKitchenBoardOrder(order, demo.state.activeBranchId))
	);

	function orderMatchesStation(order: Order) {
		if (stationId === 'all') return true;
		return order.lines.some((line) => line.preparesInKitchen && line.categoryId === stationId);
	}

	const orders = $derived(branchOrders.filter(orderMatchesStation));

	function lineStatus(line: CartLine, order: Order): KitchenStatus {
		return line.kitchenStatus ?? order.kitchenStatus ?? 'NEW';
	}

	function lineDone(line: CartLine, order: Order) {
		const status = lineStatus(line, order);
		return status === 'READY' || status === 'COMPLETED';
	}

	/** Lines not yet sent from an OPEN check stay off the kitchen ticket. */
	function onTicket(line: CartLine) {
		return line.kitchenStatus !== 'UNSENT';
	}

	function kitchenLines(order: Order) {
		return order.lines.filter((line) => line.preparesInKitchen && onTicket(line));
	}

	function visibleLines(order: Order) {
		const lines = order.lines.filter(onTicket);
		if (stationId === 'all') return lines;
		return lines.filter((line) => !line.preparesInKitchen || line.categoryId === stationId);
	}

	function readyCount(order: Order) {
		const lines = kitchenLines(order);
		return { done: lines.filter((line) => lineDone(line, order)).length, total: lines.length };
	}

	function laneOf(order: Order): Lane {
		const status = order.kitchenStatus;
		if (status === 'NEW') return 'NEW';
		if (status === 'READY') return 'READY';
		if (status === 'COMPLETED') return 'COMPLETED';
		const progress = readyCount(order);
		if (progress.total > 0 && progress.done > 0 && progress.done < progress.total) return 'NEAR_READY';
		return 'IN_PROGRESS';
	}

	const byLane = $derived.by(() => {
		const buckets: Record<Lane, Order[]> = {
			NEW: [],
			IN_PROGRESS: [],
			NEAR_READY: [],
			READY: [],
			COMPLETED: []
		};
		for (const order of orders) buckets[laneOf(order)].push(order);
		return buckets;
	});

	const lastBumpOrder = $derived(
		lastBumpId ? (byLane.COMPLETED.find((order) => order.id === lastBumpId) ?? null) : null
	);

	const stations = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const order of branchOrders) {
			if (order.kitchenStatus === 'COMPLETED') continue;
			const seen = new Set<string>();
			for (const line of order.lines) {
				if (!line.preparesInKitchen || seen.has(line.categoryId)) continue;
				seen.add(line.categoryId);
				counts.set(line.categoryId, (counts.get(line.categoryId) ?? 0) + 1);
			}
		}
		return demo.state.categories
			.filter((category) => category.active && (counts.get(category.id) ?? 0) > 0)
			.map((category) => ({
				id: category.id,
				name: label(category.name),
				count: counts.get(category.id) ?? 0
			}));
	});

	const activeCount = $derived(
		byLane.NEW.length + byLane.IN_PROGRESS.length + byLane.NEAR_READY.length + byLane.READY.length
	);

	const rushCount = $derived(
		orders.filter((order) => order.kitchenStatus !== 'COMPLETED' && age(order.createdAt) >= 10).length
	);

	const avgWaitMin = $derived.by(() => {
		const active = orders.filter((order) => order.kitchenStatus !== 'COMPLETED');
		if (!active.length) return 0;
		const total = active.reduce((sum, order) => sum + age(order.createdAt), 0);
		return Math.round(total / active.length);
	});

	const completedToday = $derived.by(() => {
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		const startMs = start.getTime();
		return branchOrders.filter((order) => {
			if (order.kitchenStatus !== 'COMPLETED' || !order.completedAt) return false;
			return new Date(order.completedAt).getTime() >= startMs;
		}).length;
	});

	const clockLabel = $derived(
		new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
	);

	/** Accents stay inside Coffee Plus tokens: info / warning / brand / muted. */
	const columns: { lane: Lane; title: () => string; accent: string; pill: string }[] = [
		{ lane: 'NEW', title: m.kitchen_new, accent: 'border-t-info', pill: 'badge badge-info' },
		{
			lane: 'IN_PROGRESS',
			title: m.kitchen_in_progress,
			accent: 'border-t-warning',
			pill: 'badge badge-warn'
		},
		{
			lane: 'NEAR_READY',
			title: m.kitchen_near_ready,
			accent: 'border-t-brand-500',
			pill: 'badge badge-ok'
		},
		{ lane: 'READY', title: m.kitchen_ready, accent: 'border-t-brand-700', pill: 'badge badge-ok' },
		{
			lane: 'COMPLETED',
			title: m.kitchen_completed,
			accent: 'border-t-line',
			pill: 'badge badge-neutral'
		}
	];

	function age(iso: string) {
		return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
	}

	function ageLabel(iso: string) {
		const mins = age(iso);
		return `${mins}m ${m.kitchen_ago()}`;
	}

	function categoryTags(order: Order) {
		const ids = new Set<string>();
		for (const line of visibleLines(order)) {
			if (line.preparesInKitchen) ids.add(line.categoryId);
		}
		return [...ids];
	}

	function beep() {
		if (!demo.kitchenSoundEnabled) return;
		try {
			const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!audioCtx || audioCtx.state === 'closed') audioCtx = new Ctx();
			if (audioCtx.state === 'suspended') void audioCtx.resume();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = 'sine';
			osc.frequency.value = 880;
			gain.gain.value = 0.04;
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.start();
			osc.stop(audioCtx.currentTime + 0.12);
		} catch {
			/* autoplay / unsupported */
		}
	}

	$effect(() => {
		if (!allowed) return;
		const incoming = byLane.NEW.map((order) => order.id);
		if (!primed) {
			seenNew = new Set(incoming);
			primed = true;
			return;
		}
		const fresh = incoming.filter((id) => !seenNew.has(id));
		for (const id of incoming) seenNew.add(id);
		if (!fresh.length) return;
		flashIds = new Set(fresh);
		beep();
		const timer = window.setTimeout(() => {
			flashIds = new Set();
		}, 2500);
		return () => clearTimeout(timer);
	});

	function move(id: string, status: KitchenStatus, confirm = false) {
		if (!allowed) {
			demo.flash(m.kitchen_denied());
			return;
		}
		const run = () => {
			if (!demo.kitchen(id, status)) {
				demo.flash(m.permission_denied());
				return;
			}
			if (status === 'COMPLETED') lastBumpId = id;
			if (status !== 'COMPLETED' && lastBumpId === id) lastBumpId = null;
		};
		if (!confirm) {
			run();
			return;
		}
		demo.ask({ title: m.revert(), body: m.confirm(), confirmLabel: m.revert(), onYes: run });
	}

	function markLineReady(orderId: string, lineId: string) {
		if (!allowed) {
			demo.flash(m.kitchen_denied());
			return;
		}
		if (!demo.kitchenLine(orderId, lineId, 'READY')) demo.flash(m.permission_denied());
	}

	function recallLast() {
		if (!lastBumpOrder) return;
		move(lastBumpOrder.id, 'READY');
	}

	function toggleSound() {
		demo.toggleKitchenSound();
	}

	function ticketClass(lane: Lane, mins: number, id: string) {
		const flash = lane === 'NEW' || flashIds.has(id);
		const rush = mins >= 10 && lane !== 'COMPLETED';
		if (flash) return 'kds-ticket is-flash';
		if (rush) return 'kds-ticket is-rush';
		if (lane === 'READY' || lane === 'NEAR_READY') return 'kds-ticket is-ready';
		return 'kds-ticket';
	}

	const boardEmpty = $derived(
		activeCount === 0 && (!showDone || byLane.COMPLETED.length === 0)
	);
</script>

<div class="flex h-full min-h-0 min-w-0 flex-col bg-page p-2 sm:p-3 md:p-4">
	{#if !allowed}
		<div class="card p-6">
			<h1 class="text-2xl font-semibold">{m.kitchen_page()}</h1>
			<p class="mt-3 text-sm">{m.kitchen_denied()}</p>
		</div>
	{:else}
		<header class="shrink-0 rounded border border-line bg-white px-3 py-2.5">
			<div class="flex flex-wrap items-center gap-2">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-lg font-bold tracking-tight">{m.kitchen_page()}</h1>
						<p class="text-sm font-semibold tabular-nums text-muted">{clockLabel}</p>
					</div>
					<div class="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
						<button
							class="chip chip-sm shrink-0"
							type="button"
							aria-pressed={stationId === 'all'}
							onclick={() => (stationId = 'all')}
						>
							{m.kitchen_all_stations()}
							<span class="ml-1 rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{activeCount}</span>
						</button>
						{#each stations as station (station.id)}
							<button
								class="chip chip-sm shrink-0"
								type="button"
								aria-pressed={stationId === station.id}
								onclick={() => (stationId = station.id)}
							>
								{station.name}
								<span class="ml-1 rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{station.count}</span>
							</button>
						{/each}
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-1.5">
					{#if lastBumpOrder}
						<button class="btn btn-secondary btn-sm" type="button" onclick={recallLast}>
							{m.kitchen_recall_last()} · {lastBumpOrder.orderNumber}
						</button>
					{/if}
					<button class="btn btn-secondary btn-sm" type="button" onclick={toggleSound}>
						{demo.kitchenSoundEnabled ? m.kitchen_sound_on() : m.kitchen_sound_off()}
					</button>
					<button class="btn btn-secondary btn-sm" type="button" onclick={() => (showDone = !showDone)}>
						{showDone ? m.hide_completed() : m.show_completed()}
					</button>
				</div>
			</div>
		</header>

		<!-- Compact KPI strip — replaces tall side overview that dominated the board. -->
		<section class="kds-kpi mt-3 shrink-0" aria-label={m.kitchen_overview()}>
			<div class="kds-kpi-card">
				<span class="kds-kpi-label">{m.kitchen_avg_wait()}</span>
				<span class="kds-kpi-value">{avgWaitMin}m</span>
			</div>
			<div class="kds-kpi-card">
				<span class="kds-kpi-label">{m.kitchen_active_orders()}</span>
				<span class="kds-kpi-value">{activeCount}</span>
			</div>
			<div class="kds-kpi-card">
				<span class="kds-kpi-label">{m.kitchen_rush_orders()}</span>
				<span class="kds-kpi-value is-rush">{rushCount}</span>
			</div>
			<div class="kds-kpi-card">
				<span class="kds-kpi-label">{m.kitchen_completed_today()}</span>
				<span class="kds-kpi-value is-ok">{completedToday}</span>
			</div>
		</section>

		{#if boardEmpty}
			<div class="kds-empty-board mt-3 flex-1">
				<p class="text-base font-semibold text-ink">{m.kitchen_board_empty()}</p>
				<p class="mt-1 text-sm">{m.no_tickets()}</p>
			</div>
		{:else}
			<div class="kds-board-shell mt-3">
			<div class="kds-board {showDone ? 'is-show-done' : ''}">
				{#each columns as column (column.lane)}
					{#if column.lane !== 'COMPLETED' || showDone}
						<section class="kds-lane {column.accent}">
							<div class="kds-lane-head">
								<h2 class="kds-lane-title">{column.title()}</h2>
								<span class={column.pill}>{byLane[column.lane].length}</span>
							</div>
							<div class="kds-lane-body">
								{#each byLane[column.lane] as order (order.id)}
									{@const mins = age(order.createdAt)}
									{@const rush = mins >= 10 && column.lane !== 'COMPLETED'}
									{@const progress = readyCount(order)}
									{@const tags = categoryTags(order)}
									<article class={ticketClass(column.lane, mins, order.id)}>
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0">
												<div class="flex flex-wrap items-center gap-1.5">
													{#if order.waitingNumber}
														<p class="kds-ticket-num">#{order.waitingNumber}</p>
														<span class="text-xs font-semibold text-muted">{order.orderNumber}</span>
													{:else}
														<p class="kds-ticket-num">#{order.orderNumber}</p>
													{/if}
													{#if rush}<span class="badge badge-danger">{m.kitchen_rush()}</span>{/if}
													{#if column.lane === 'NEAR_READY' || column.lane === 'READY'}
														<span class="badge badge-ok">✓</span>
													{/if}
												</div>
												<p class="mt-0.5 text-xs font-semibold text-muted">
													{orderTypeLabel(order.orderType)}{order.tableId
														? ` · ${tableName.get(order.tableId) ?? ''}`
														: ''}
												</p>
											</div>
											<div class="shrink-0 text-right">
												<p class="text-sm font-bold tabular-nums {rush ? 'text-warning' : 'text-muted'}">
													{ageLabel(order.createdAt)}
												</p>
												{#if (column.lane === 'IN_PROGRESS' || column.lane === 'NEAR_READY') && progress.total > 0}
													<p class="text-[11px] font-semibold text-muted">
														{progress.done}/{progress.total} {m.kitchen_line_ready()}
													</p>
												{/if}
											</div>
										</div>

										<ul class="mt-2.5 space-y-1.5 text-sm">
											{#each visibleLines(order) as line (line.id)}
												{@const done = line.preparesInKitchen && lineDone(line, order)}
												{@const canReady =
													line.preparesInKitchen &&
													!done &&
													(column.lane === 'IN_PROGRESS' ||
														column.lane === 'NEAR_READY' ||
														column.lane === 'READY')}
												<li>
													{#if canReady}
														<button
															class="flex w-full items-start justify-between gap-2 rounded bg-page px-2.5 py-2 text-left hover:bg-brand-50"
															type="button"
															onclick={() => markLineReady(order.id, line.id)}
														>
															<span>
																<span class="font-semibold">{line.quantity}× {label(line.productName)}</span>
																{#if line.selectedModifiers.length}
																	<span class="mt-0.5 block text-xs text-muted"
																		>{line.selectedModifiers.map((item) => label(item.optionName)).join(' · ')}</span
																	>
																{/if}
															</span>
															<span class="badge badge-warn shrink-0">{m.mark_item_ready()}</span>
														</button>
													{:else}
														<div class="flex items-start justify-between gap-2 rounded px-2.5 py-1.5 {done ? 'bg-brand-50' : ''}">
															<span>
																<span class="font-semibold">{line.quantity}× {label(line.productName)}</span>
																{#if line.selectedModifiers.length}
																	<span class="mt-0.5 block text-xs text-muted"
																		>{line.selectedModifiers.map((item) => label(item.optionName)).join(' · ')}</span
																	>
																{/if}
															</span>
															{#if !line.preparesInKitchen}
																<span class="badge badge-neutral shrink-0">{m.serve()}</span>
															{:else if done}
																<span class="badge badge-ok shrink-0">✓ {m.kitchen_line_ready()}</span>
															{/if}
														</div>
													{/if}
												</li>
											{/each}
										</ul>

										{#if tags.length}
											<div class="mt-2 flex flex-wrap gap-1">
												{#each tags as tagId (tagId)}
													<span class="badge badge-neutral">{categoryName.get(tagId) ?? tagId}</span>
												{/each}
											</div>
										{/if}

										<div class="mt-3 flex flex-col gap-1.5">
											{#if column.lane === 'NEW'}
												<button class="btn btn-primary w-full" type="button" onclick={() => move(order.id, 'PREPARING')}
													>{m.start_preparing()}</button
												>
											{:else if column.lane === 'IN_PROGRESS' || column.lane === 'NEAR_READY'}
												<button class="btn btn-primary w-full" type="button" onclick={() => move(order.id, 'READY')}
													>{m.mark_ready()}</button
												>
												<button class="btn btn-ghost btn-sm self-start text-muted" type="button" onclick={() => move(order.id, 'NEW', true)}
													>{m.revert()}</button
												>
											{:else if column.lane === 'READY'}
												<button class="btn btn-primary w-full" type="button" onclick={() => move(order.id, 'COMPLETED')}
													>{m.mark_completed()}</button
												>
												<button
													class="btn btn-ghost btn-sm self-start text-muted"
													type="button"
													onclick={() => move(order.id, 'PREPARING', true)}>{m.revert()}</button
												>
											{:else if column.lane === 'COMPLETED'}
												<button class="btn btn-secondary w-full" type="button" onclick={() => move(order.id, 'READY')}
													>{m.kitchen_recall()}</button
												>
											{/if}
										</div>
									</article>
								{:else}
									<p class="px-2 py-8 text-center text-sm text-muted">{m.kitchen_lane_empty()}</p>
								{/each}
							</div>
						</section>
					{/if}
				{/each}
			</div>
			</div>
		{/if}
	{/if}
</div>
