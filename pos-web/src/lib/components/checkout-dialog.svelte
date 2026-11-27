<script lang="ts">
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import ProductThumb from '$lib/components/product-thumb.svelte';
	import ReceiptView from '$lib/components/receipt-view.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import { modifierSummaryText } from '$lib/domain/catalog';
	import { formatKhr, formatUsd, priceCart, settleMixedCash } from '$lib/domain/money';
	import { orderPayments } from '$lib/domain/order-payments';
	import { resolveTaxForProducts } from '$lib/domain/product-resolve';
	import { deliveryChannelLabel, orderTypeLabel } from '$lib/i18n/domain-labels';
	import { href, label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { PaymentAttemptStatus, PaymentMethod, Product, TenderAllocation } from '$lib/domain/types';
	import { untrack } from 'svelte';
	import { configuredReceiptPaper, printReceipt } from '$lib/print-receipt';
	import { motionMs } from '$lib/motion';
	import * as m from '$paraglide/messages';
	import { Banknote, CreditCard, Minus, Pencil, Plus, QrCode, Trash2, Wallet } from 'lucide-svelte';

	const methodIcon = {
		CASH: Banknote,
		CARD: CreditCard,
		QR: QrCode,
		GRABPAY: Wallet
	} as const;

	const totals = $derived.by(() => {
		demo.state.cart;
		demo.state.settings;
		return demo.cartTotals();
	});
	const methods = $derived(demo.state.settings.paymentMethods.filter((item) => item.enabled));
	const methodOptions = $derived(methods.map((item) => ({ value: item.method, label: label(item.label) })));
	const order = $derived(demo.state.orders.find((item) => item.id === demo.checkoutOrderId));
	const hasShift = $derived(!!demo.currentShift);
	const itemCount = $derived(demo.state.cart.lines.reduce((sum, line) => sum + line.quantity, 0));
	const tableName = $derived(demo.state.tables.find((table) => table.id === demo.state.cart.tableId)?.name ?? '');
	const customerName = $derived(
		label(demo.state.customers.find((person) => person.id === demo.state.cart.customerId)?.name) || m.guest()
	);

	type TenderRow = {
		id: string;
		method: PaymentMethod;
		amount: string;
		/** Cash only: USD received (decimal string). */
		received: string;
		/** Cash only: KHR received (riel string). */
		receivedKhr: string;
		paidByApp: boolean;
	};

	let rows = $state<TenderRow[]>([]);
	let seededOpen = $state(false);
	let closing = $state(false);
	let syncedTotal = $state<number | null>(null);
	let selectedIds = $state<string[]>([]);
	let guests = $state('2');
	let attemptRowId = $state<string | null>(null);
	let confirmedAttempts = $state<Record<string, string>>({});
	let khqrLoading = $state(false);
	let khqrError = $state<string | null>(null);
	let paywayPoll: ReturnType<typeof setInterval> | null = null;

	const selectedLines = $derived(demo.state.cart.lines.filter((line) => selectedIds.includes(line.id)));
	/** Split-by-lines is active when some (not all) lines are ticked. */
	const partial = $derived(selectedLines.length > 0 && selectedLines.length < demo.state.cart.lines.length);
	const dueTotals = $derived.by(() => {
		if (!partial) return totals;
		const subtotal = selectedLines.reduce((sum, line) => sum + line.lineTotal, 0);
		const products = selectedLines
			.map((line) => demo.state.products.find((product) => product.id === line.productId))
			.filter((product): product is Product => Boolean(product));
		const tax = resolveTaxForProducts(products, demo.state.taxCategories, demo.state.settings.tax);
		return priceCart(
			subtotal,
			demo.state.cart.discountMode,
			demo.state.cart.discountValue,
			tax,
			demo.state.settings.usdToKhr
		);
	});
	const due = $derived(dueTotals.total);
	const appChannel = $derived(
		demo.state.cart.orderType === 'DELIVERY' && !!demo.state.cart.delivery.channel && demo.state.cart.delivery.channel !== 'OWN'
	);
	const canPaidByApp = $derived(appChannel && methods.some((item) => item.method === 'GRABPAY'));

	function cents(value: string) {
		return Math.round((Number(value) || 0) * 100);
	}

	function newRow(method: PaymentMethod, amountCents: number): TenderRow {
		const amount = amountCents > 0 ? (amountCents / 100).toFixed(2) : '';
		return {
			id: crypto.randomUUID(),
			method,
			amount,
			received: method === 'CASH' ? amount : '',
			receivedKhr: '',
			paidByApp: false
		};
	}

	function clearPaywayPoll() {
		if (paywayPoll) {
			clearInterval(paywayPoll);
			paywayPoll = null;
		}
	}

	function startPaywayPoll(row: TenderRow, tranId: string) {
		clearPaywayPoll();
		paywayPoll = setInterval(async () => {
			try {
				const res = await fetch('/api/payway/status', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ tranId })
				});
				const data = (await res.json()) as { status?: string };
				if (!res.ok) return;
				if (data.status === 'APPROVED') {
					clearPaywayPoll();
					confirmAttempt(row);
				} else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
					clearPaywayPoll();
					failAttempt();
				}
			} catch {
				/* keep polling */
			}
		}, 3000);
	}

	async function startAttempt(row: TenderRow | undefined) {
		clearPaywayPoll();
		khqrError = null;
		khqrLoading = false;
		if (!row || row.method === 'CASH' || row.paidByApp) return;
		const amount = cents(row.amount);
		if (amount <= 0) return;
		const attempt = demo.startPaymentAttempt(row.method, amount);
		attemptRowId = attempt ? row.id : null;
		if (!attempt || row.method !== 'QR') return;

		khqrLoading = true;
		try {
			const res = await fetch('/api/payway/khqr', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amountCents: amount, firstname: 'POS', lastname: 'Customer' })
			});
			const data = (await res.json()) as {
				configured?: boolean;
				tranId?: string;
				qrImage?: string;
				qrString?: string;
				error?: string;
			};
			if (res.status === 503 || data.configured === false) {
				return;
			}
			if (!res.ok || !data.tranId) {
				khqrError = data.error || 'payway_error';
				return;
			}
			demo.attachPaywayToAttempt({
				tranId: data.tranId,
				qrImage: data.qrImage,
				qrString: data.qrString
			});
			startPaywayPoll(row, data.tranId);
		} catch {
			khqrError = 'network';
		} finally {
			khqrLoading = false;
		}
	}

	function attemptKey(row: TenderRow) {
		return `${row.method}:${cents(row.amount)}`;
	}

	function attemptState(row: TenderRow): PaymentAttemptStatus | null {
		if (row.method === 'CASH' || row.paidByApp) return null;
		if (confirmedAttempts[row.id] === attemptKey(row)) return 'CONFIRMED';
		const attempt = demo.paymentAttempt;
		if (attempt && attemptRowId === row.id && attempt.method === row.method && attempt.amount === cents(row.amount)) {
			return attempt.status;
		}
		return null;
	}

	function confirmAttempt(row: TenderRow) {
		clearPaywayPoll();
		if (demo.resolvePaymentAttempt('CONFIRMED')) {
			confirmedAttempts = { ...confirmedAttempts, [row.id]: attemptKey(row) };
		}
	}

	function failAttempt() {
		clearPaywayPoll();
		demo.resolvePaymentAttempt('FAILED');
		demo.checkoutPhase = 'failed';
	}

	$effect(() => {
		if (!demo.checkoutOpen) {
			clearPaywayPoll();
			seededOpen = false;
			closing = false;
			syncedTotal = null;
			selectedIds = [];
			attemptRowId = null;
			confirmedAttempts = {};
			khqrLoading = false;
			khqrError = null;
			return;
		}
		if (demo.checkoutPhase !== 'review' || seededOpen) return;
		const first = methods[0]?.method ?? 'CASH';
		const total = due;
		rows = [newRow(first, total)];
		syncedTotal = total;
		seededOpen = true;
		untrack(() => void startAttempt(rows[0]));
	});

	/** Keep the single tender row in sync when qty / line selection changes the due total. */
	$effect(() => {
		if (!demo.checkoutOpen || demo.checkoutPhase !== 'review' || !seededOpen) return;
		const total = due;
		if (syncedTotal === total) return;
		syncedTotal = total;
		if (rows.length !== 1) return;
		const amount = (total / 100).toFixed(2);
		const row = rows[0];
		rows = [
			{
				...row,
				amount,
				received: row.method === 'CASH' ? amount : row.received
			}
		];
	});

	function bumpQty(lineId: string, next: number) {
		demo.setQty(lineId, next);
		if (!demo.state.cart.lines.length) requestClose();
	}

	function toggleLine(lineId: string) {
		selectedIds = selectedIds.includes(lineId) ? selectedIds.filter((id) => id !== lineId) : [...selectedIds, lineId];
	}

	const allocations = $derived(
		rows.map((row) => ({
			method: row.method,
			amount: cents(row.amount),
			amountReceived: row.method === 'CASH' ? cents(row.received) : undefined,
			amountReceivedKhr: row.method === 'CASH' ? Math.max(0, Math.round(Number(row.receivedKhr) || 0)) : undefined,
			paidByApp: row.paidByApp
		}))
	);
	const allocated = $derived(allocations.reduce((sum, row) => sum + row.amount, 0));
	const remaining = $derived(due - allocated);

	function settleRow(row: TenderRow) {
		return settleMixedCash({
			appliedUsdCents: cents(row.amount),
			receivedUsdCents: cents(row.received),
			receivedKhr: Math.max(0, Math.round(Number(row.receivedKhr) || 0)),
			usdToKhr: dueTotals.usdToKhr
		});
	}

	const cashRows = $derived(rows.filter((row) => row.method === 'CASH'));
	const cashOk = $derived(cashRows.every((row) => settleRow(row).ok));
	const changeTotals = $derived(
		cashRows.reduce(
			(sum, row) => {
				const settled = settleRow(row);
				return settled.ok
					? { usd: sum.usd + settled.changeDueUsd, khr: sum.khr + settled.changeDueKhr }
					: sum;
			},
			{ usd: 0, khr: 0 }
		)
	);
	const attemptsOk = $derived(rows.every((row) => row.method === 'CASH' || row.paidByApp || attemptState(row) === 'CONFIRMED'));
	const canConfirm = $derived(
		hasShift &&
			remaining === 0 &&
			allocated === due &&
			allocations.every((row) => row.amount > 0) &&
			cashOk &&
			attemptsOk
	);

	/** Footer Confirm allowed while QR/CARD is still PENDING — manual fallback if status never arrives. */
	const canFooterConfirm = $derived(
		hasShift &&
			remaining === 0 &&
			allocated === due &&
			allocations.every((row) => row.amount > 0) &&
			cashOk &&
			rows.every((row) => {
				if (row.method === 'CASH' || row.paidByApp) return true;
				const status = attemptState(row);
				return status === 'CONFIRMED' || status === 'PENDING';
			})
	);

	/** Auto-finish when PayWay (or confirm attempt) marks the tender confirmed. */
	$effect(() => {
		if (!demo.checkoutOpen || demo.checkoutPhase !== 'review' || demo.paying) return;
		if (!canConfirm) return;
		const digitalDone = rows.some(
			(row) => row.paidByApp || (row.method !== 'CASH' && attemptState(row) === 'CONFIRMED')
		);
		if (!digitalDone) return;
		untrack(() => pay('success'));
	});

	function explain(code: string) {
		if (code === 'table') return m.table_required();
		if (code === 'delivery') return m.delivery_required();
		if (code === 'insufficient') return m.insufficient();
		if (code === 'offline_tender') return m.offline_card();
		if (code === 'offline_limit') return m.offline_limit();
		if (code === 'permission') return m.permission_denied();
		if (code === 'empty') return m.empty_cart_checkout();
		if (code === 'simulated_fail') return m.payment_failed();
		if (code === 'no_shift') return m.shift_required();
		if (code === 'allocation') return m.allocation_incomplete();
		return m.payment_failed();
	}

	function methodLabel(value: PaymentMethod) {
		return label(demo.state.settings.paymentMethods.find((item) => item.method === value)?.label) || value;
	}

	function addRow() {
		const next = methods.find((item) => !rows.some((row) => row.method === item.method)) ?? methods[0];
		if (!next) return;
		const fill = Math.max(0, remaining);
		const row = newRow(next.method, fill);
		rows = [...rows, row];
		void startAttempt(row);
	}

	function removeRow(id: string) {
		if (rows.length <= 1) return;
		if (attemptRowId === id) clearPaywayPoll();
		rows = rows.filter((row) => row.id !== id);
	}

	function setMethod(id: string, method: PaymentMethod) {
		rows = rows.map((row) =>
			row.id === id
				? {
						...row,
						method,
						paidByApp: false,
						received: method === 'CASH' ? row.amount || row.received : '',
						receivedKhr: method === 'CASH' ? row.receivedKhr : ''
					}
				: row
		);
		void startAttempt(rows.find((row) => row.id === id));
	}

	/** Pre-fill N tender rows of due / N (remainder cents on the last row). */
	function splitEqual() {
		const count = Math.min(20, Math.max(2, Math.floor(Number(guests) || 2)));
		const base = Math.floor(due / count);
		const rest = due - base * count;
		const method = methods[0]?.method ?? 'CASH';
		rows = Array.from({ length: count }, (_, index) => newRow(method, base + (index === count - 1 ? rest : 0)));
		confirmedAttempts = {};
		attemptRowId = null;
		void startAttempt(rows[0]);
	}

	/** Delivery-app shortcut: one GRABPAY tender flagged paidByApp for the full due. */
	function payByApp() {
		rows = [{ ...newRow('GRABPAY', due), paidByApp: true }];
		confirmedAttempts = {};
		attemptRowId = null;
	}

	function pay(simulate: 'success' | 'fail') {
		const payload: TenderAllocation[] = allocations.map((row) => ({
			method: row.method,
			amount: row.amount,
			amountReceived: row.method === 'CASH' ? row.amountReceived : undefined,
			amountReceivedKhr: row.method === 'CASH' ? row.amountReceivedKhr : undefined,
			paidByApp: row.paidByApp || undefined
		}));
		const result = partial
			? demo.paySelectedLines(
					selectedLines.map((line) => line.id),
					payload,
					simulate
				)
			: demo.pay(payload, simulate);
		if (!result.ok && result.code !== 'simulated_fail') demo.flash(explain(result.code));
		if (result.ok) {
			rows = [];
			selectedIds = [];
		}
	}

	/** Confirm payment — also clears stuck PENDING QR/CARD when status poll never returns. */
	function confirmPayment() {
		for (const row of rows) {
			if (row.method === 'CASH' || row.paidByApp) continue;
			if (attemptState(row) === 'PENDING') confirmAttempt(row);
		}
		pay('success');
	}

	function doPrint() {
		printReceipt(configuredReceiptPaper(demo.state.settings));
	}

	function requestClose() {
		if (closing) return;
		if (motionMs(250) === 0) {
			demo.closeCheckout();
			return;
		}
		closing = true;
		window.setTimeout(() => {
			demo.closeCheckout();
			closing = false;
		}, 250);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') requestClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<button
	class="fixed inset-0 z-50 cursor-pointer bg-ink/40 {closing ? 'ui-overlay-fade-out' : 'ui-overlay-fade'}"
	type="button"
	aria-label={m.close()}
	onclick={requestClose}
></button>
<div
	class="fixed inset-y-0 right-0 z-[55] flex h-full w-[min(100%,28rem)] flex-col bg-white shadow-2xl will-change-transform {closing
		? 'ui-drawer-out'
		: 'ui-drawer'}"
	role="dialog"
	aria-modal="true"
	aria-label={m.checkout()}
>
	<header class="flex shrink-0 items-center justify-between bg-brand-700 px-4 py-2.5 text-white">
		<h2 class="text-base font-semibold">{m.checkout()}</h2>
		<button
			class="grid h-7 w-7 cursor-pointer place-items-center rounded text-lg leading-none text-white hover:bg-white/15"
			type="button"
			onclick={requestClose}
			aria-label={m.close()}>×</button
		>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		{#if demo.checkoutPhase === 'success' && order}
			<div class="rounded bg-brand-50 p-4">
				<p class="text-sm font-bold uppercase tracking-wide text-brand-700">{m.payment_success()}</p>
				{#if order.waitingNumber}
					<p class="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-700">{m.waiting_number()}</p>
					<p class="num text-4xl font-bold text-brand-800">{order.waitingNumber}</p>
					<p class="mt-1 text-sm text-muted">{m.order_word()}: {order.orderNumber}</p>
				{:else}
					<p class="mt-1 text-2xl font-bold">{order.orderNumber}</p>
				{/if}
				<p class="num text-xl">{formatUsd(order.totals.total)} · {formatKhr(order.totals.totalKhr)}</p>
				<p class="mt-2 text-sm">{m.one_order()} {m.paid_demo()}. {order.syncStatus === 'PENDING' ? m.not_posted() : ''}</p>
				<ul class="mt-2 space-y-1 text-sm">
					{#each orderPayments(order) as tender (tender.id)}
						<li class="flex justify-between gap-2">
							<span>{methodLabel(tender.method)}</span>
							<span class="num font-semibold">{formatUsd(tender.amount)}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="receipt-preview-host mt-4" data-paper={configuredReceiptPaper(demo.state.settings)}>
				<ReceiptView {order} />
			</div>
			<div class="mt-3 flex flex-wrap gap-2">
				<button class="btn btn-primary" type="button" onclick={doPrint}>{m.print_receipt()}</button>
			</div>
			<p class="mt-2 text-xs text-muted">{m.print_hint()}</p>
		{:else}
			{#if !hasShift}
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded bg-warning/15 px-3 py-2 text-sm text-warning">
					<span>{m.shift_required()}</span>
					<a class="btn btn-secondary btn-sm" href={href('/shifts')}>{m.open_shift_to_pay()}</a>
				</div>
			{/if}
			{#if demo.state.demoLink === 'offline'}
				<div class="mb-3 rounded bg-info/10 px-3 py-2 text-sm text-info">{m.offline_card()}</div>
			{/if}
			<section class="checkout-review" aria-label={m.checkout_review()}>
				<div class="checkout-review-head">
					<div class="min-w-0">
						<p class="text-sm font-bold text-ink">{m.checkout_review()}</p>
						<p class="mt-0.5 truncate text-xs font-semibold text-muted">
							{orderTypeLabel(demo.state.cart.orderType)}
							{#if tableName} · {m.table()} {tableName}{/if}
							 · {customerName}
							 · {itemCount} {m.items()}
							{#if demo.state.cart.orderType === 'DELIVERY'} · {deliveryChannelLabel(demo.state.cart.delivery.channel)}{/if}
						</p>
					</div>
					{#if demo.state.cart.lines.length > 1}
						<span class="shrink-0 text-[11px] font-semibold text-muted">{m.split_by_lines()}</span>
					{/if}
				</div>

				<ul class="checkout-lines">
					{#each demo.state.cart.lines as line (line.id)}
						{@const product = demo.state.products.find((item) => item.id === line.productId)}
						{@const imageUrl = line.productImageUrl || product?.imageUrl || ''}
						{@const canCustomize = Boolean(product?.modifierGroupIds.length)}
						{@const modText = modifierSummaryText(line.selectedModifiers, (text) => label(text))}
						<li class="checkout-line">
							{#if demo.state.cart.lines.length > 1}
								<input
									class="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-700"
									type="checkbox"
									checked={selectedIds.includes(line.id)}
									aria-label={`${m.split_by_lines()}: ${label(line.productName)}`}
									onchange={() => toggleLine(line.id)}
								/>
							{/if}
							<div class="checkout-line-media">
								<ProductThumb src={imageUrl} alt={label(line.productName)} class="h-16 w-16" />
								<span class="checkout-line-qty">{line.quantity}</span>
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<p class="min-w-0 text-[15px] font-semibold leading-normal text-ink">{label(line.productName)}</p>
									<p class="num shrink-0 text-[15px] font-bold tabular-nums">{formatUsd(line.lineTotal)}</p>
								</div>
								<p class="mt-0.5 text-xs font-semibold tabular-nums text-muted">
									{formatUsd(line.unitPrice)} {m.item_each()}
								</p>
								{#if modText}
									<p class="mt-1 text-xs leading-normal text-muted">{modText}</p>
								{/if}
								{#if line.specialInstructions}
									<p class="mt-1 text-xs leading-normal text-ink/80">“{line.specialInstructions}”</p>
								{/if}
								<div class="mt-2 flex items-center gap-1">
									<button
										class="btn btn-secondary btn-sm w-7 px-0"
										type="button"
										aria-label={m.decrease()}
										onclick={() => bumpQty(line.id, line.quantity - 1)}
									>
										<Minus size={14} />
									</button>
									<span class="num w-6 text-center text-sm font-bold">{line.quantity}</span>
									<button
										class="btn btn-secondary btn-sm w-7 px-0"
										type="button"
										aria-label={m.increase()}
										onclick={() => bumpQty(line.id, line.quantity + 1)}
									>
										<Plus size={14} />
									</button>
									{#if canCustomize}
										<div class="ml-auto">
											<IconAction
												label={m.edit_line()}
												icon={Pencil}
												onclick={() => demo.openCustomize(line.productId, line.id)}
											/>
										</div>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>

				<div class="checkout-totals">
					<div class="flex justify-between gap-3 text-sm">
						<span class="text-muted">{m.subtotal()}</span>
						<span class="num font-semibold">{formatUsd(totals.subtotal)}</span>
					</div>
					{#if totals.discount > 0}
						<div class="flex justify-between gap-3 text-sm">
							<span class="text-muted">{m.discount()}</span>
							<span class="num font-semibold text-brand-700">−{formatUsd(totals.discount)}</span>
						</div>
					{/if}
					<div class="flex justify-between gap-3 text-sm">
						<span class="text-muted">{label(totals.taxName)}</span>
						<span class="num font-semibold">{formatUsd(totals.tax)}</span>
					</div>
					<div class="checkout-totals-due">
						<div>
							<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.total()}</p>
							<p class="num text-2xl font-bold text-brand-700">{formatUsd(totals.total)}</p>
						</div>
						<p class="num text-sm font-semibold text-ink">{formatKhr(totals.totalKhr)}</p>
					</div>
					{#if partial}
						<div class="checkout-totals-due border-t border-line">
							<div>
								<p class="text-xs font-semibold uppercase tracking-wide text-muted">{m.split_pay_part()}</p>
								<p class="num text-xl font-bold text-brand-700">{formatUsd(due)}</p>
							</div>
							<p class="num text-sm font-semibold text-ink">{formatKhr(dueTotals.totalKhr)}</p>
						</div>
					{/if}
				</div>
			</section>
			{#if demo.checkoutPhase === 'failed'}
				<div class="flex min-h-[16rem] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
					<p class="text-base font-semibold text-danger">{m.payment_failed()}</p>
					<p class="text-sm text-muted">{m.cart_kept()}</p>
				</div>
			{:else}
			<div class="mt-4 flex items-center justify-between gap-2">
				<p class="text-sm font-semibold">{m.split_payment()}</p>
				<button class="btn btn-secondary btn-sm" type="button" disabled={methods.length === 0} onclick={addRow}>
					<Plus size={14} />
					{m.add_tender()}
				</button>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-2 rounded bg-brand-50 px-3 py-2">
				<label class="text-xs font-semibold text-brand-700" for="split-guests">{m.split_guests()}</label>
				<NumberField id="split-guests" class="w-20" size="sm" min={2} max={20} step={1} bind:value={guests} ariaLabel={m.split_guests()} />
				<button class="btn btn-secondary btn-sm" type="button" disabled={methods.length === 0 || due <= 0} onclick={splitEqual}>
					{m.split_equal()}
				</button>
				{#if canPaidByApp}
					<button class="btn btn-secondary btn-sm ml-auto" type="button" onclick={payByApp}>
						<Wallet size={14} />
						{m.paid_by_app()}
					</button>
				{/if}
			</div>
			<div class="mt-2 space-y-2">
				{#each rows as row (row.id)}
					{@const Icon = methodIcon[row.method]}
					<div class="rounded border border-line p-3">
						<div class="flex flex-wrap items-center gap-2">
							<span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon size={18} /></span>
							<SelectMenu
								class="min-w-0 flex-1"
								ariaLabel={m.payment()}
								value={row.method}
								options={methodOptions}
								onchange={(value) => setMethod(row.id, value as PaymentMethod)}
							/>
							{#if rows.length > 1}
								<IconAction label={m.remove_tender()} icon={Trash2} tone="danger" onclick={() => removeRow(row.id)} />
							{/if}
						</div>
						<label class="mt-2 block text-xs font-semibold" for={`amt-${row.id}`}>{m.tender_amount()}</label>
						<NumberField id={`amt-${row.id}`} class="mt-1" min={0} step={0.01} bind:value={row.amount} ariaLabel={m.tender_amount()} />
						{#if row.method === 'CASH'}
							{@const settled = settleRow(row)}
							<div class="mt-2 grid grid-cols-2 gap-2">
								<div>
									<label class="block text-xs font-semibold" for={`recv-${row.id}`}>{m.received_usd()}</label>
									<NumberField id={`recv-${row.id}`} class="mt-1" min={0} step={0.01} bind:value={row.received} ariaLabel={m.received_usd()} />
								</div>
								<div>
									<label class="block text-xs font-semibold" for={`recv-khr-${row.id}`}>{m.received_khr()}</label>
									<NumberField id={`recv-khr-${row.id}`} class="mt-1" min={0} step={100} bind:value={row.receivedKhr} ariaLabel={m.received_khr()} />
								</div>
							</div>
							{#if settled.ok && (settled.changeDueUsd > 0 || settled.changeDueKhr > 0)}
								<div class="mt-2 flex flex-wrap justify-between gap-2 rounded bg-brand-50 px-3 py-1.5 text-sm">
									<p>{m.change_usd()}: <span class="num font-semibold text-brand-700">{formatUsd(settled.changeDueUsd)}</span></p>
									<p>{m.change_khr()}: <span class="num font-semibold text-brand-700">{formatKhr(settled.changeDueKhr)}</span></p>
								</div>
							{:else if !settled.ok}
								<p class="mt-2 text-xs font-semibold text-warning">{m.insufficient()}</p>
							{/if}
						{:else if row.paidByApp}
							<p class="mt-2 rounded bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
								{m.paid_by_app()} · {deliveryChannelLabel(demo.state.cart.delivery.channel)}
								{#if demo.state.cart.delivery.appRef}· {demo.state.cart.delivery.appRef}{/if}
							</p>
						{:else}
							{@const status = attemptState(row)}
							{@const payway =
								row.method === 'QR' &&
								attemptRowId === row.id &&
								demo.paymentAttempt?.provider === 'payway' &&
								demo.paymentAttempt.amount === cents(row.amount)
									? demo.paymentAttempt
									: null
							}
							<div class="mt-2 rounded border border-line bg-white px-3 py-2">
								{#if status === 'PENDING'}
									{#if row.method === 'QR' && khqrLoading && attemptRowId === row.id}
										<p class="text-center text-xs font-semibold text-warning">{m.khqr_loading()}</p>
									{:else if payway?.qrImage}
										<p class="text-center text-xs font-semibold text-brand-700">{m.scan_khqr()}</p>
										<img
											src={payway.qrImage}
											alt="KHQR"
											class="mx-auto mt-2 w-full max-w-[220px] bg-white"
										/>
										{#if payway.tranId}
											<p class="mt-1 text-center text-[10px] text-muted">Ref {payway.tranId}</p>
										{/if}
										<p class="mt-2 text-center text-xs font-semibold text-warning">{m.cds_waiting_qr()}</p>
									{:else if row.method === 'QR' && khqrError && attemptRowId === row.id}
										<p class="text-center text-xs font-semibold text-danger">{m.khqr_error()}</p>
										<button
											class="btn btn-secondary btn-sm mx-auto mt-2 block"
											type="button"
											disabled={cents(row.amount) <= 0 || demo.state.demoLink === 'offline' || khqrLoading}
											onclick={() => void startAttempt(row)}
										>
											{m.retry()}
										</button>
									{:else}
										<p class="text-center text-xs font-semibold text-warning">{m.attempt_pending()}</p>
										<button
											class="btn btn-primary btn-sm mx-auto mt-2 block"
											type="button"
											onclick={() => confirmAttempt(row)}
										>
											{m.confirm_attempt()}
										</button>
									{/if}
								{:else if status === 'CONFIRMED'}
									<p class="text-center text-xs font-semibold text-brand-700">{m.status_paid()}</p>
								{:else}
									{#if status === 'FAILED'}
										<p class="text-center text-xs font-semibold text-danger">{m.attempt_failed()}</p>
									{/if}
									<button
										class="btn btn-secondary btn-sm mx-auto mt-2 block"
										type="button"
										disabled={cents(row.amount) <= 0 || demo.state.demoLink === 'offline' || khqrLoading}
										onclick={() => void startAttempt(row)}
									>
										{m.retry()}
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-3 flex flex-wrap justify-between gap-2 text-sm">
				<p>{m.allocated()}: <span class="num font-semibold">{formatUsd(allocated)}</span></p>
				<p class={remaining === 0 ? 'text-brand-700' : remaining < 0 ? 'text-danger' : 'text-warning'}>
					{remaining < 0 ? m.over_allocated() : m.remaining_due()}:
					<span class="num font-semibold">{formatUsd(Math.abs(remaining))}</span>
				</p>
			</div>
			{#if changeTotals.usd > 0 || changeTotals.khr > 0}
				<p class="num mt-1 text-sm font-semibold">
					{m.change_usd()} {formatUsd(changeTotals.usd)} · {m.change_khr()} {formatKhr(changeTotals.khr)}
				</p>
			{/if}
			{/if}
		{/if}
	</div>

	<footer class="shrink-0 border-t border-line px-4 py-2.5">
		{#if demo.checkoutPhase === 'success' && order}
			<div class="flex flex-wrap justify-center gap-2">
				<a class="btn btn-secondary" href={href('/kitchen')}>{m.nav_kitchen()}</a>
				<button class="btn btn-secondary" type="button" onclick={doPrint}>{m.print_receipt()}</button>
				<button class="btn btn-primary" type="button" onclick={requestClose}>{m.new_order()}</button>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-center gap-2">
				<button class="btn btn-secondary min-w-[9rem]" type="button" onclick={requestClose}>{m.back_order()}</button>
				<button
					class="btn btn-primary min-w-[10rem]"
					type="button"
					disabled={demo.paying || !canFooterConfirm}
					onclick={confirmPayment}
				>
					{demo.paying ? m.processing() : partial ? m.split_pay_part() : m.confirm_payment()}
				</button>
			</div>
		{/if}
	</footer>
</div>
