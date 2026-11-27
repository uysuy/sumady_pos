<script lang="ts">
	import {
		bilingualLines,
		brandLines,
		defaultReceiptShow,
		looksLikeKhmer,
		normalizeReceiptTemplate
	} from '$lib/domain/receipt-template';
	import { formatKhr, formatRate, formatUsd } from '$lib/domain/money';
	import { orderPayments } from '$lib/domain/order-payments';
	import type { LocaleText, Order, ReceiptTemplateSettings } from '$lib/domain/types';
	import { orderTypeLabel, payMethodLabel } from '$lib/i18n/domain-labels';
	import { appLocale } from '$lib/i18n/locale.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import { configuredReceiptPaper, paperWidthCss } from '$lib/print-receipt';
	import * as m from '$paraglide/messages';

	let {
		order,
		templateOverride,
		reprint = false,
		printId = 'receipt-print'
	}: {
		order: Order;
		/** Live designer draft — display only; never recalculates money. */
		templateOverride?: ReceiptTemplateSettings;
		reprint?: boolean;
		printId?: string;
	} = $props();

	/** Settings template paper wins so preview/print match Receipt & Printing. */
	const settingsPaper = $derived(configuredReceiptPaper(demo.state.settings));

	const template = $derived(
		normalizeReceiptTemplate(
			templateOverride ?? {
				docType: order.receipt?.docType,
				language: order.receipt?.language,
				paper: settingsPaper,
				logoUrl: order.receipt?.logoUrl,
				qrUrl: order.receipt?.qrUrl,
				vatRegistered: order.receipt?.vatRegistered,
				vattin: order.receipt?.vattin ?? order.receipt?.taxId,
				show: order.receipt?.show
			},
			{
				paper: settingsPaper,
				taxId: order.receipt?.taxId ?? demo.state.settings.taxId,
				receiptFooter: order.receipt?.footer ?? demo.state.settings.receiptFooter
			}
		)
	);

	const show = $derived({ ...defaultReceiptShow(template.docType), ...template.show });
	const lang = $derived(template.language);
	const isA4 = $derived(template.paper === 'A4');
	const formal = $derived(template.docType === 'COMMERCIAL' || template.docType === 'VAT_TAX');
	const cafeLayout = $derived(!formal && !isA4);
	const paperCss = $derived(paperWidthCss(template.paper));
	/** Designer live preview — show placeholders when media URLs are empty. */
	const isDesigner = $derived(Boolean(templateOverride));
	const tableName = $derived(
		demo.state.tables.find((table) => table.id === order.tableId)?.name ??
			(isDesigner && order.tableId ? 'T1' : '')
	);
	const customer = $derived(demo.state.customers.find((person) => person.id === order.customerId));
	const paidAt = $derived(new Date(order.paidAt ?? order.createdAt));
	const dateLabel = $derived(
		paidAt.toLocaleString(appLocale.current === 'kh' ? 'km-KH' : 'en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			numberingSystem: 'latn'
		})
	);
	const tin = $derived((template.vattin || order.receipt?.taxId || '').trim());
	const refunds = $derived(order.refunds ?? []);
	const tenders = $derived(orderPayments(order));
	const shopBrand = $derived(brandLines(order.receipt?.shopName, lang, { uppercaseEn: true }));
	const seatLine = $derived.by(() => {
		if (show.table && tableName && show.orderType) return `${tableName} · ${orderTypeLabel(order.orderType)}`;
		if (show.table && tableName) return tableName;
		if (show.table && isDesigner) return show.orderType ? `T1 · ${orderTypeLabel(order.orderType)}` : 'T1';
		if (show.orderType) return orderTypeLabel(order.orderType);
		return '';
	});

	function lines(text: LocaleText | undefined): string[] {
		return bilingualLines(text, lang);
	}

	/** Single display line — café sample uses one locale per field, not stacked pairs. */
	function oneLine(text: LocaleText | undefined): string {
		if (!text) return '';
		if (lang === 'kh') return text.kh?.trim() || text.en?.trim() || '';
		return text.en?.trim() || text.kh?.trim() || '';
	}

	function productTitle(text: LocaleText): string {
		return oneLine(text);
	}

	function docTitle(): string {
		if (template.docType === 'RETAIL') return m.receipt_retail_title();
		if (template.docType === 'COMMERCIAL') return m.doc_commercial();
		if (template.docType === 'VAT_TAX') return m.doc_vat_tax();
		return m.receipt_slash_title();
	}

	function itemsHeader(): string {
		return template.docType === 'RETAIL' ? m.item_slash_retail() : m.item_slash_header();
	}
</script>

<article
	id={printId}
	class="receipt-sheet mx-auto bg-white text-ink"
	class:is-58={template.paper === '58'}
	class:is-a4={isA4}
	class:is-formal={formal}
	class:is-cafe={cafeLayout}
	data-paper={template.paper}
	style="--paper: {paperCss}; width: {paperCss}; max-width: {paperCss};"
>
	{#if reprint}
		<p class="receipt-reprint">{m.reprint_banner()}</p>
	{/if}

	<header class="receipt-head">
		{#if show.logo}
			{#if template.logoUrl}
				<img class="receipt-logo" src={template.logoUrl} alt="" />
			{:else if isDesigner}
				<div class="receipt-logo-ph">{m.show_logo()}</div>
			{/if}
		{/if}
		{#if show.businessInfo}
			{#each shopBrand as line, i}
				<p class="receipt-shop" class:is-secondary={i > 0} lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</p>
			{/each}
			{#if !cafeLayout}
				{#each lines(order.receipt?.tagline) as line}
					<p class="receipt-tag" lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</p>
				{/each}
			{/if}
			{#if cafeLayout}
				{@const addr = oneLine(order.receipt?.address)}
				{#if addr}
					<p class="receipt-meta" lang={looksLikeKhmer(addr) ? 'km' : undefined}>{addr}</p>
				{/if}
			{:else}
				{#each lines(order.receipt?.address) as line}
					<p class="receipt-meta" lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</p>
				{/each}
			{/if}
			{#if order.receipt?.phone}
				<p class="receipt-meta">{m.tel_label()}: {order.receipt.phone}</p>
			{/if}
			{#if tin && (!cafeLayout || formal || template.vatRegistered)}
				<p class="receipt-meta">{m.tax_id()}: {tin}</p>
			{/if}
			{#if formal && template.vatRegistered}
				<p class="receipt-meta">{m.vat_registered_label()}</p>
			{/if}
		{/if}
		<p class="receipt-doc-title">{docTitle()}</p>
		{#if order.waitingNumber}
			<div class="receipt-waiting">
				<p class="receipt-waiting-label">{m.waiting_number()}</p>
				<p class="receipt-waiting-num num">{order.waitingNumber}</p>
			</div>
		{/if}
	</header>

	{#if cafeLayout}
		<div class="receipt-meta-block">
			<p>{m.order_word()}: {order.orderNumber}</p>
			<p>{m.date()}: {dateLabel}</p>
			{#if show.cashier}
				<p>{m.cashier()}: {oneLine(order.receipt?.cashierName) || '—'}</p>
			{/if}
			{#if show.branch}
				<p>{m.branch()}: {oneLine(order.receipt?.branchName) || '—'}</p>
			{/if}
			{#if show.customer}
				{@const who = oneLine(customer?.name) || m.guest()}
				<p>{m.customer()}: {who}</p>
			{/if}
			{#if seatLine}
				<p>
					{#if show.table}
						{m.table()}: {seatLine}
					{:else}
						{seatLine}
					{/if}
				</p>
			{/if}
		</div>

		<div class="receipt-rule"></div>
		<p class="receipt-section-label">{itemsHeader()}</p>

		<ul class="receipt-stack">
			{#each order.lines as line (line.id)}
				<li class="receipt-stack-item">
					<div class="receipt-stack-row">
						<span class="receipt-stack-name">{productTitle(line.productName)}</span>
						<span class="receipt-stack-amt num">{formatUsd(line.lineTotal)}</span>
					</div>
					{#if show.sku && line.sku}
						<p class="receipt-mod">{m.sku_label()}: {line.sku}</p>
					{/if}
					{#if show.modifiers && line.selectedModifiers.length}
						<p class="receipt-mod">
							{line.selectedModifiers
								.map((item) => productTitle(item.optionName))
								.filter(Boolean)
								.join(' · ')}
						</p>
					{/if}
					{#if line.specialInstructions}
						<p class="receipt-mod italic">{line.specialInstructions}</p>
					{/if}
					<p class="receipt-mod receipt-qty">{line.quantity} × {formatUsd(line.unitPrice)}</p>
				</li>
			{/each}
		</ul>

		<div class="receipt-rule"></div>

		<dl class="receipt-totals">
			<div><dt>{m.subtotal()}</dt><dd class="num">{formatUsd(order.totals.subtotal)}</dd></div>
			{#if show.discount && order.totals.discount > 0}
				<div><dt>{m.discount()}</dt><dd class="num">−{formatUsd(order.totals.discount)}</dd></div>
			{/if}
			{#if show.tax}
				<div><dt>{m.tax_word()}</dt><dd class="num">{formatUsd(order.totals.tax)}</dd></div>
			{/if}
		</dl>
		<div class="receipt-rule"></div>
		<dl class="receipt-totals">
			<div class="receipt-grand">
				<dt>{m.total()}</dt>
				<dd class="num">{formatUsd(order.totals.total)}</dd>
			</div>
		</dl>

		{#if show.payment && tenders.length}
			<div class="receipt-pay">
				{#each tenders as tender (tender.id)}
					<p class="receipt-pay-method">{payMethodLabel(tender.method)}</p>
					{#if tender.method === 'CASH'}
						{#if show.received}
							<div class="receipt-pay-sub">
								<span>{m.received()}</span>
								<span class="num">{formatUsd(tender.amountReceived ?? 0)}</span>
							</div>
						{/if}
						{#if show.change}
							<div class="receipt-pay-sub">
								<span>{m.change()}</span>
								<span class="num">{formatUsd(tender.changeDue ?? 0)}</span>
							</div>
						{/if}
					{:else}
						<div class="receipt-pay-sub">
							<span>{m.amount_col()}</span>
							<span class="num">{formatUsd(tender.amount)}</span>
						</div>
					{/if}
					{#if tender.demoReference}
						<p class="receipt-ref">{tender.demoReference}</p>
					{/if}
				{/each}
			</div>
		{/if}
	{:else}
		<dl class="receipt-kv">
			{#if order.waitingNumber}
				<div><dt>{m.waiting_number()}</dt><dd class="num receipt-waiting-inline">{order.waitingNumber}</dd></div>
			{/if}
			<div><dt>{formal ? m.invoice_no() : m.receipt_no()}</dt><dd class="num">{order.orderNumber}</dd></div>
			<div><dt>{m.date()}</dt><dd>{dateLabel}</dd></div>
			{#if show.branch}
				{#each lines(order.receipt?.branchName) as line, i}
					<div>
						{#if i === 0}<dt>{m.branch()}</dt>{:else}<dt></dt>{/if}
						<dd lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</dd>
					</div>
				{/each}
			{/if}
			{#if show.cashier}
				{#each lines(order.receipt?.cashierName) as line, i}
					<div>
						{#if i === 0}<dt>{m.cashier()}</dt>{:else}<dt></dt>{/if}
						<dd lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</dd>
					</div>
				{/each}
			{/if}
			{#if show.customer}
				{#each lines(customer?.name ?? { en: m.guest(), kh: m.guest() }) as line, i}
					<div>
						{#if i === 0}<dt>{m.customer()}</dt>{:else}<dt></dt>{/if}
						<dd lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</dd>
					</div>
				{/each}
			{/if}
			{#if show.orderType}
				<div><dt>{m.order_type()}</dt><dd>{orderTypeLabel(order.orderType)}</dd></div>
			{/if}
			{#if show.table}
				<div><dt>{m.table()}</dt><dd>{tableName || (isDesigner ? 'T1' : '—')}</dd></div>
			{/if}
		</dl>

		<table class="receipt-lines">
			<thead>
				<tr>
					<th class="text-left">{m.item()}</th>
					<th class="num">{m.qty()}</th>
					<th class="num">{m.unit_price()}</th>
					<th class="num">{m.amount_col()}</th>
				</tr>
			</thead>
			<tbody>
				{#each order.lines as line (line.id)}
					<tr>
						<td>
							{#each lines(line.productName) as name}
								<span class="font-semibold block" lang={looksLikeKhmer(name) ? 'km' : undefined}>{name}</span>
							{/each}
							{#if show.sku && line.sku}
								<span class="receipt-mod">{m.sku_label()}: {line.sku}</span>
							{/if}
							{#if show.modifiers && line.selectedModifiers.length}
								<span class="receipt-mod">
									{line.selectedModifiers.map((item) => bilingualLines(item.optionName, lang).join(' / ')).join(' · ')}
								</span>
							{/if}
							{#if line.specialInstructions}
								<span class="receipt-mod italic">{line.specialInstructions}</span>
							{/if}
						</td>
						<td class="num">{line.quantity}</td>
						<td class="num">{formatUsd(line.unitPrice)}</td>
						<td class="num">{formatUsd(line.lineTotal)}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<dl class="receipt-totals">
			<div><dt>{m.subtotal()}</dt><dd class="num">{formatUsd(order.totals.subtotal)}</dd></div>
			{#if show.discount && order.totals.discount > 0}
				<div><dt>{m.discount()}</dt><dd class="num">−{formatUsd(order.totals.discount)}</dd></div>
			{/if}
			{#if show.tax}
				<div><dt>{m.taxable()}</dt><dd class="num">{formatUsd(order.totals.taxableAmount)}</dd></div>
				<div>
					<dt>
						{#each lines(order.totals.taxName) as taxName}
							<span lang={looksLikeKhmer(taxName) ? 'km' : undefined}>{taxName}</span>
						{/each}
						{' '}{(order.totals.taxRateBasisPoints / 100).toFixed(0)}%
					</dt>
					<dd class="num">{formatUsd(order.totals.tax)}</dd>
				</div>
			{/if}
			<div class="receipt-grand">
				<dt>{m.total()} (USD)</dt>
				<dd class="num">{formatUsd(order.totals.total)}</dd>
			</div>
			<div class="receipt-grand-khr">
				<dt>{m.total_khr()}</dt>
				<dd class="num">{formatKhr(order.totals.totalKhr)}</dd>
			</div>
			<p class="receipt-rate">{m.rate_demo()}: {formatRate(order.totals.usdToKhr)}</p>
		</dl>

		{#if show.payment && tenders.length}
			<div class="receipt-pay">
				{#each tenders as tender (tender.id)}
					<div class="receipt-pay-row">
						<span>{payMethodLabel(tender.method)}</span>
						<span class="num">{formatUsd(tender.amount)}</span>
					</div>
					{#if tender.method === 'CASH'}
						{#if show.received}
							<div class="receipt-pay-sub">
								<span>{m.received()}</span>
								<span class="num">{formatUsd(tender.amountReceived ?? 0)}</span>
							</div>
						{/if}
						{#if show.change}
							<div class="receipt-pay-sub">
								<span>{m.change()}</span>
								<span class="num">{formatUsd(tender.changeDue ?? 0)}</span>
							</div>
						{/if}
					{/if}
					{#if tender.demoReference}
						<p class="receipt-ref">{tender.demoReference}</p>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}

	{#if refunds.length}
		<div class="receipt-pay receipt-refunds">
			<p class="receipt-pay-row"><span>{m.refund_history()}</span><span></span></p>
			{#each refunds as row (row.id)}
				<div class="receipt-pay-row">
					<span>{payMethodLabel(row.method)} · {row.reason}</span>
					<span class="num">−{formatUsd(row.amount)}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if show.qr}
		<div class="receipt-qr">
			{#if template.qrUrl}
				<img src={template.qrUrl} alt="" />
			{:else if isDesigner}
				<div class="receipt-qr-ph">{m.show_qr()}</div>
			{/if}
		</div>
	{/if}

	{#if show.footer}
		<div class="receipt-rule"></div>
		{#if cafeLayout && lang === 'both' && order.receipt?.footer}
			{@const footEn = order.receipt.footer.en?.trim() ?? ''}
			{@const footKh = order.receipt.footer.kh?.trim() ?? ''}
			{#if footKh || footEn}
				<p class="receipt-footer receipt-thanks">
					{#if footKh}<span lang="km">{footKh}</span>{/if}
					{#if footKh && footEn}<span> </span>{/if}
					{#if footEn}<span>{footEn}</span>{/if}
				</p>
			{/if}
			<p class="receipt-footer-sub">{m.hope_again()}</p>
		{:else}
			{#each lines(order.receipt?.footer) as line}
				<p class="receipt-footer" lang={looksLikeKhmer(line) ? 'km' : undefined}>{line}</p>
			{/each}
		{/if}
	{/if}
</article>
