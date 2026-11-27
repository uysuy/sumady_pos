<script lang="ts">
	import ReceiptView from '$lib/components/receipt-view.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import {
		buildSamplePreviewOrder,
		defaultReceiptShow,
		defaultReceiptTemplate,
		normalizeReceiptTemplate,
		pickPreviewOrder,
		previewOrderWithTemplate,
		receiptCompliance
	} from '$lib/domain/receipt-template';
	import type { ReceiptDocType, ReceiptLangMode, ReceiptPaper, ReceiptShowFlags, ReceiptTemplateSettings } from '$lib/domain/types';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';
	import { untrack } from 'svelte';

	let { locked = false }: { locked?: boolean } = $props();

	function cloneTemplate(value: ReceiptTemplateSettings): ReceiptTemplateSettings {
		return JSON.parse(JSON.stringify(value)) as ReceiptTemplateSettings;
	}

	let draft = $state<ReceiptTemplateSettings>(
		cloneTemplate(normalizeReceiptTemplate(demo.state.settings.receiptTemplate, demo.state.settings))
	);
	let footEn = $state(demo.state.settings.receiptFooter.en);
	let footKh = $state(demo.state.settings.receiptFooter.kh);
	let panel = $state<'layout' | 'fields' | 'brand'>('layout');
	let dirty = $state(false);

	/** Re-sync from saved settings only when not mid-edit (avoids wiping checkbox toggles). */
	$effect(() => {
		const template = demo.state.settings.receiptTemplate;
		const footer = demo.state.settings.receiptFooter;
		const settings = demo.state.settings;
		if (untrack(() => dirty)) return;
		draft = cloneTemplate(normalizeReceiptTemplate(template, settings));
		footEn = footer.en;
		footKh = footer.kh;
	});

	const compliance = $derived(
		receiptCompliance(draft, {
			hasBuyerName: Boolean(
				pickPreviewOrder(demo.state.orders)?.customerId ||
					demo.state.customers.some((person) => person.active)
			),
			hasBuyerTin: false
		})
	);

	const previewOrder = $derived.by(() => {
		const sampleTable = demo.state.tables.find(
			(table) => table.active && table.branchId === demo.state.activeBranchId
		);
		const sampleCustomer = demo.state.customers.find((person) => person.active);
		const real = pickPreviewOrder(demo.state.orders);
		/** Always attach table/customer so Fields toggles are visible in preview. */
		const enrichedReal = real
			? {
					...previewOrderWithTemplate(real, draft),
					tableId: real.tableId || sampleTable?.id,
					customerId: real.customerId || sampleCustomer?.id,
					orderType: real.tableId || sampleTable ? ('DINE_IN' as const) : real.orderType
				}
			: null;
		const base =
			enrichedReal ??
			buildSamplePreviewOrder(demo.state.settings, draft, {
				branchName: demo.branch.name,
				cashierName: demo.staff.name,
				tableId: sampleTable?.id,
				customerId: sampleCustomer?.id
			});
		if (!base.receipt) return base;
		return {
			...base,
			receipt: {
				...base.receipt,
				footer: { en: footEn, kh: footKh },
				show: { ...draft.show },
				docType: draft.docType,
				language: draft.language,
				paper: draft.paper,
				logoUrl: draft.logoUrl || undefined,
				qrUrl: draft.qrUrl || undefined,
				vatRegistered: draft.vatRegistered,
				vattin: draft.vattin || undefined,
				taxId: draft.vattin || base.receipt.taxId
			}
		};
	});

	const fieldGroups: { title: () => string; keys: (keyof ReceiptShowFlags)[] }[] = [
		{ title: () => m.show_group_header(), keys: ['logo', 'businessInfo', 'cashier', 'branch'] },
		{ title: () => m.show_group_order(), keys: ['table', 'orderType', 'customer'] },
		{ title: () => m.show_group_lines(), keys: ['sku', 'modifiers', 'discount', 'tax'] },
		{ title: () => m.show_group_pay(), keys: ['payment', 'received', 'change', 'qr', 'footer'] }
	];

	const fieldLabel: Record<keyof ReceiptShowFlags, () => string> = {
		logo: () => m.show_logo(),
		businessInfo: () => m.show_business(),
		cashier: () => m.show_cashier(),
		branch: () => m.show_branch(),
		table: () => m.show_table(),
		orderType: () => m.show_order_type(),
		customer: () => m.show_customer(),
		sku: () => m.show_sku(),
		modifiers: () => m.show_modifiers(),
		discount: () => m.show_discount(),
		tax: () => m.show_tax(),
		serviceCharge: () => m.show_service_charge(),
		payment: () => m.show_payment(),
		received: () => m.show_received(),
		change: () => m.show_change(),
		qr: () => m.show_qr(),
		footer: () => m.show_footer()
	};

	const docTypeOptions = $derived([
		{ value: 'CAFE', label: m.doc_cafe() },
		{ value: 'RETAIL', label: m.doc_retail() },
		{ value: 'COMMERCIAL', label: m.doc_commercial() },
		{ value: 'VAT_TAX', label: m.doc_vat_tax() }
	]);
	const paperOptions = $derived([
		{ value: '80', label: '80mm' },
		{ value: '58', label: '58mm' },
		{ value: 'A4', label: 'A4' }
	]);
	const languageOptions = $derived([
		{ value: 'both', label: m.lang_both_short() },
		{ value: 'kh', label: 'KH' },
		{ value: 'en', label: 'EN' }
	]);

	function markDirty() {
		dirty = true;
	}

	function setDocType(docType: ReceiptDocType) {
		if (locked || draft.docType === docType) return;
		draft = {
			...draft,
			docType,
			/** Fresh defaults so café / retail / invoice layouts actually differ. */
			show: defaultReceiptShow(docType)
			/** Keep the configured paper (58 / 80 / A4) — do not force A4 for invoices. */
		};
		markDirty();
	}

	function setPaper(paper: ReceiptPaper) {
		if (locked || draft.paper === paper) return;
		draft = { ...draft, paper };
		markDirty();
	}

	function setLanguage(language: ReceiptLangMode) {
		if (locked || draft.language === language) return;
		draft = { ...draft, language };
		markDirty();
	}

	function setShow(key: keyof ReceiptShowFlags, on: boolean) {
		draft = { ...draft, show: { ...draft.show, [key]: on } };
		markDirty();
	}

	function onLogo(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 350000) {
			demo.flash(m.image_large());
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				draft = { ...draft, logoUrl: reader.result };
				markDirty();
			}
		};
		reader.readAsDataURL(file);
	}

	function restoreDefaults() {
		const next = defaultReceiptTemplate();
		next.vattin = demo.state.settings.taxId;
		draft = next;
		footEn = 'Thank You!';
		footKh = 'សូមអរគុណ!';
		markDirty();
	}

	function cancel() {
		draft = cloneTemplate(normalizeReceiptTemplate(demo.state.settings.receiptTemplate, demo.state.settings));
		footEn = demo.state.settings.receiptFooter.en;
		footKh = demo.state.settings.receiptFooter.kh;
		dirty = false;
	}

	function save() {
		if (locked) return;
		const okTemplate = demo.updateReceiptTemplate(draft);
		const okFooter = demo.updateSettings({
			receiptFooter: { en: footEn, kh: footKh },
			taxId: draft.vattin || demo.state.settings.taxId,
			paper: draft.paper
		});
		if (okTemplate && okFooter) {
			dirty = false;
			demo.flash(m.settings_saved());
		} else {
			demo.flash(m.permission_denied());
		}
	}

	function warnLabel(code: string): string {
		if (code === 'vat_not_registered') return m.warn_vat_not_registered();
		if (code === 'vattin_missing') return m.warn_vattin_missing();
		if (code === 'buyer_name_missing') return m.warn_buyer_name_missing();
		if (code === 'buyer_tin_missing') return m.warn_buyer_tin_missing();
		return code;
	}
</script>

<div class="rd">
	<header class="rd-toolbar">
		<div class="rd-toolbar-main">
			<label class="rd-select rd-select-type">
				<span class="rd-select-label">{m.doc_type()}</span>
				<SelectMenu
					value={draft.docType}
					options={docTypeOptions}
					disabled={locked}
					ariaLabel={m.doc_type()}
					onchange={(value) => setDocType(value as ReceiptDocType)}
				/>
			</label>
			<label class="rd-select rd-select-paper">
				<span class="rd-select-label">{m.paper_preview()}</span>
				<SelectMenu
					value={draft.paper}
					options={paperOptions}
					disabled={locked}
					ariaLabel={m.paper_preview()}
					onchange={(value) => setPaper(value as ReceiptPaper)}
				/>
			</label>
			<label class="rd-select rd-select-lang">
				<span class="rd-select-label">{m.receipt_language()}</span>
				<SelectMenu
					value={draft.language}
					options={languageOptions}
					disabled={locked}
					ariaLabel={m.receipt_language()}
					onchange={(value) => setLanguage(value as ReceiptLangMode)}
				/>
			</label>
		</div>
		<div class="rd-toolbar-actions">
			<button class="btn btn-secondary btn-sm" type="button" disabled={locked} onclick={restoreDefaults}>{m.restore_defaults()}</button>
			<button class="btn btn-secondary btn-sm" type="button" disabled={!dirty} onclick={cancel}>{m.cancel()}</button>
			<button class="btn btn-primary btn-sm" type="button" disabled={locked || !dirty} onclick={save}>{m.save_settings()}</button>
		</div>
	</header>

	<div class="rd-body">
		<section class="rd-controls" aria-label={m.receipt_printing()}>
			<div class="rd-tabs" role="tablist">
				<button class="rd-tab" type="button" role="tab" aria-selected={panel === 'layout'} onclick={() => (panel = 'layout')}>{m.rd_tab_layout()}</button>
				<button class="rd-tab" type="button" role="tab" aria-selected={panel === 'fields'} onclick={() => (panel = 'fields')}>{m.rd_tab_fields()}</button>
				<button class="rd-tab" type="button" role="tab" aria-selected={panel === 'brand'} onclick={() => (panel = 'brand')}>{m.rd_tab_brand()}</button>
			</div>

			<div class="rd-panel">
				{#if panel === 'layout'}
					<p class="rd-hint">{m.rd_layout_hint_split()}</p>
					<div class="rd-choice-grid">
						<button class="rd-choice" type="button" aria-pressed={draft.docType === 'CAFE'} disabled={locked} onclick={() => setDocType('CAFE')}>
							<span class="rd-choice-title">{m.doc_cafe()}</span>
							<span class="rd-choice-desc">{m.doc_cafe_desc()}</span>
						</button>
						<button class="rd-choice" type="button" aria-pressed={draft.docType === 'RETAIL'} disabled={locked} onclick={() => setDocType('RETAIL')}>
							<span class="rd-choice-title">{m.doc_retail()}</span>
							<span class="rd-choice-desc">{m.doc_retail_desc()}</span>
						</button>
						<button class="rd-choice" type="button" aria-pressed={draft.docType === 'COMMERCIAL'} disabled={locked} onclick={() => setDocType('COMMERCIAL')}>
							<span class="rd-choice-title">{m.doc_commercial()}</span>
							<span class="rd-choice-desc">{m.doc_commercial_desc()}</span>
						</button>
						<button class="rd-choice" type="button" aria-pressed={draft.docType === 'VAT_TAX'} disabled={locked} onclick={() => setDocType('VAT_TAX')}>
							<span class="rd-choice-title">{m.doc_vat_tax()}</span>
							<span class="rd-choice-desc">{m.doc_vat_desc()}</span>
						</button>
					</div>
					{#if compliance.warnings.length}
						<ul class="rd-warn">
							{#each compliance.warnings as code}
								<li>{warnLabel(code)}</li>
							{/each}
						</ul>
					{/if}
				{:else if panel === 'fields'}
					<p class="rd-hint">{m.rd_fields_hint()}</p>
					{#each fieldGroups as group}
						<div class="rd-field-group">
							<p class="rd-field-title">{group.title()}</p>
							<div class="rd-field-grid">
								{#each group.keys as key (key)}
									<UiCheckbox
										checked={Boolean(draft.show[key])}
										disabled={locked}
										label={fieldLabel[key]()}
										onchange={(on) => setShow(key, on)}
									/>
								{/each}
							</div>
						</div>
					{/each}
				{:else}
					<div class="rd-brand">
						<label class="text-sm font-semibold"
							>{m.tax_id()}
							<input
								class="field mt-1 font-mono"
								value={draft.vattin}
								disabled={locked}
								placeholder="K001-234567890"
								oninput={(e) => {
									draft = { ...draft, vattin: (e.currentTarget as HTMLInputElement).value };
									markDirty();
								}}
							/>
						</label>
						<div class="mt-3">
							<UiCheckbox
								checked={draft.vatRegistered}
								disabled={locked}
								label={m.vat_registered_toggle()}
								onchange={(on) => {
									draft = { ...draft, vatRegistered: on };
									markDirty();
								}}
							/>
						</div>
						<div class="mt-3">
							<p class="text-sm font-semibold">{m.receipt_logo()}</p>
							<div class="mt-1 flex flex-wrap items-center gap-2">
								<label class="btn btn-secondary btn-sm">
									{m.upload_logo()}
									<input class="sr-only" type="file" accept="image/*" disabled={locked} onchange={onLogo} />
								</label>
								{#if draft.logoUrl}
									<button
										class="btn btn-secondary btn-sm"
										type="button"
										disabled={locked}
										onclick={() => {
											draft = { ...draft, logoUrl: '' };
											markDirty();
										}}>{m.remove_image()}</button
									>
								{/if}
							</div>
						</div>
						<label class="mt-3 block text-sm font-semibold"
							>{m.qr_url()}
							<input
								class="field mt-1"
								value={draft.qrUrl}
								disabled={locked}
								placeholder="https://"
								oninput={(e) => {
									draft = { ...draft, qrUrl: (e.currentTarget as HTMLInputElement).value };
									markDirty();
								}}
							/>
						</label>
						<label class="mt-3 block text-sm font-semibold"
							>{m.footer_en()}
							<textarea
								class="field mt-1 min-h-16"
								value={footEn}
								disabled={locked}
								oninput={(e) => {
									footEn = (e.currentTarget as HTMLTextAreaElement).value;
									markDirty();
								}}
							></textarea>
						</label>
						<label class="mt-3 block text-sm font-semibold"
							>{m.footer_kh()}
							<textarea
								class="field mt-1 min-h-16"
								value={footKh}
								disabled={locked}
								oninput={(e) => {
									footKh = (e.currentTarget as HTMLTextAreaElement).value;
									markDirty();
								}}
							></textarea>
						</label>
					</div>
				{/if}
			</div>
		</section>

		<aside class="rd-preview" aria-label={m.receipt_title()}>
			<div class="rd-preview-bar">
				<p class="rd-preview-label">{m.live_preview()} · {draft.paper === 'A4' ? 'A4' : `${draft.paper}mm`}</p>
			</div>
			<div class="rd-preview-scroll">
				<div class="rd-preview-frame" data-paper={draft.paper} data-doc={draft.docType}>
					{#if previewOrder.receipt}
						<ReceiptView order={previewOrder} templateOverride={draft} printId="receipt-preview" />
					{:else}
						<p class="rd-preview-note">{m.receipt_preview_hint()}</p>
					{/if}
				</div>
				<p class="rd-preview-note">{m.receipt_preview_hint()}</p>
			</div>
		</aside>
	</div>
</div>
