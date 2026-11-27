import type {
	LocaleText,
	Order,
	ReceiptPaper,
	ReceiptShowFlags,
	ReceiptSnapshot,
	ReceiptTemplateSettings,
	ShopSettings
} from './types';

const KHMER_RE = /[\u1780-\u17FF]/

export function looksLikeKhmer(text: string): boolean {
	return KHMER_RE.test(text);
}

export function receiptDocTitleKey(docType: ReceiptTemplateSettings['docType']): string {
	if (docType === 'RETAIL') return 'doc_retail';
	if (docType === 'COMMERCIAL') return 'doc_commercial';
	if (docType === 'VAT_TAX') return 'doc_vat_tax';
	return 'doc_cafe';
}

/** Merge draft template onto an order’s frozen receipt for live preview only. */
export function previewOrderWithTemplate(order: Order, template: ReceiptTemplateSettings): Order {
	const snap = order.receipt;
	const nextSnap: ReceiptSnapshot = {
		shopName: snap?.shopName ?? { en: '', kh: '' },
		tagline: snap?.tagline ?? { en: '', kh: '' },
		address: snap?.address ?? { en: '', kh: '' },
		phone: snap?.phone ?? '',
		taxId: template.vattin || snap?.taxId,
		footer: snap?.footer ?? { en: '', kh: '' },
		branchName: snap?.branchName ?? { en: '', kh: '' },
		cashierName: snap?.cashierName ?? { en: '', kh: '' },
		paper: template.paper,
		docType: template.docType,
		language: template.language,
		logoUrl: template.logoUrl || undefined,
		qrUrl: template.qrUrl || undefined,
		vatRegistered: template.vatRegistered,
		vattin: template.vattin || undefined,
		show: { ...template.show }
	};
	return { ...order, receipt: nextSnap };
}

/** Minimal sample ticket when no paid order exists yet (designer only). */
export function buildSamplePreviewOrder(
	settings: Pick<ShopSettings, 'shopName' | 'tagline' | 'address' | 'phone' | 'taxId' | 'receiptFooter' | 'usdToKhr' | 'tax'>,
	template: ReceiptTemplateSettings,
	ctx: {
		branchName: LocaleText;
		cashierName: LocaleText;
		/** Real table id so ReceiptView can resolve the name for live field toggles. */
		tableId?: string;
		customerId?: string;
	}
): Order {
	const unit = 350;
	const qty = 1;
	const subtotal = unit * qty;
	const tax = Math.round((subtotal * settings.tax.rateBasisPoints) / 10000);
	const total = settings.tax.calculationMode === 'EXCLUSIVE' ? subtotal + tax : subtotal;
	const now = new Date().toISOString();
	return {
		id: 'preview_sample',
		orderNumber: 'CP-PREVIEW',
		posTransactionId: 'preview',
		branchId: 'preview',
		warehouseId: 'preview',
		terminalId: 'preview',
		cashierId: 'preview',
		customerId: ctx.customerId,
		orderType: 'DINE_IN',
		tableId: ctx.tableId,
		lines: [
			{
				id: 'preview_line',
				productId: 'preview',
				sku: 'LATTE-L',
				erpItemId: 'preview',
				productName: { en: 'Iced Latte (Large)', kh: 'ឡាតេទឹកកក (ធំ)' },
				categoryId: 'preview',
				preparesInKitchen: true,
				baseUnitPrice: unit,
				selectedModifiers: [
					{
						groupId: 'g',
						groupName: { en: 'Milk', kh: 'ទឹកដោះគោ' },
						optionId: 'o',
						optionName: { en: 'Oat milk', kh: 'ទឹកដោះគោស្រូវសាលី' },
						priceDelta: 50
					}
				],
				quantity: qty,
				unitPrice: unit,
				lineTotal: subtotal
			}
		],
		totals: {
			subtotal,
			discount: 0,
			taxableAmount: subtotal,
			tax,
			total,
			currency: 'USD',
			taxName: settings.tax.name,
			taxRateBasisPoints: settings.tax.rateBasisPoints,
			taxMode: settings.tax.calculationMode,
			usdToKhr: settings.usdToKhr,
			totalKhr: Math.round(total * settings.usdToKhr)
		},
		discountMode: 'NONE',
		discountValue: 0,
		orderStatus: 'COMPLETED',
		paymentStatus: 'PAID',
		syncStatus: 'SYNCED',
		payments: [
			{
				id: 'preview_pay',
				method: 'CASH',
				status: 'PAID',
				amount: total,
				amountReceived: total + 100,
				changeDue: 100,
				createdAt: now,
				demoReference: ''
			}
		],
		createdAt: now,
		paidAt: now,
		receipt: {
			shopName: { ...settings.shopName },
			tagline: { ...settings.tagline },
			address: { ...settings.address },
			phone: settings.phone,
			taxId: template.vattin || settings.taxId,
			footer: { ...settings.receiptFooter },
			branchName: { ...ctx.branchName },
			cashierName: { ...ctx.cashierName },
			paper: template.paper,
			docType: template.docType,
			language: template.language,
			logoUrl: template.logoUrl || undefined,
			qrUrl: template.qrUrl || undefined,
			vatRegistered: template.vatRegistered,
			vattin: template.vattin || undefined,
			show: { ...template.show }
		},
		timeline: [],
		source: 'DEMO_SEED'
	};
}

export const defaultReceiptShow = (docType: ReceiptTemplateSettings['docType'] = 'CAFE'): ReceiptShowFlags => {
	const cafe = docType === 'CAFE';
	const retail = docType === 'RETAIL';
	const formal = docType === 'COMMERCIAL' || docType === 'VAT_TAX';
	return {
		logo: true,
		businessInfo: true,
		cashier: true,
		branch: retail || formal,
		table: cafe,
		orderType: cafe,
		customer: formal,
		sku: retail || formal,
		modifiers: cafe,
		discount: true,
		tax: true,
		serviceCharge: false,
		payment: !formal,
		received: !formal,
		change: !formal,
		qr: false,
		footer: true
	};
};

export function defaultReceiptTemplate(): ReceiptTemplateSettings {
	return {
		docType: 'CAFE',
		language: 'both',
		paper: '80',
		logoUrl: '',
		qrUrl: '',
		vatRegistered: false,
		vattin: '',
		show: defaultReceiptShow('CAFE')
	};
}

export function normalizeReceiptTemplate(
	raw: Partial<ReceiptTemplateSettings> | undefined,
	settings: Pick<ShopSettings, 'paper' | 'taxId' | 'receiptFooter'>
): ReceiptTemplateSettings {
	const base = defaultReceiptTemplate();
	const docType = raw?.docType ?? base.docType;
	const mergedShow = { ...defaultReceiptShow(docType), ...(raw?.show ?? {}) };
	const paper = (raw?.paper ?? settings.paper ?? '80') as ReceiptPaper;
	return {
		docType,
		language: raw?.language ?? base.language,
		paper: paper === 'A4' || paper === '58' || paper === '80' ? paper : '80',
		logoUrl: raw?.logoUrl?.trim() ?? '',
		qrUrl: raw?.qrUrl?.trim() ?? '',
		vatRegistered: raw?.vatRegistered === true,
		vattin: (raw?.vattin ?? settings.taxId ?? '').trim(),
		show: mergedShow
	};
}

export function bilingualLines(text: LocaleText | undefined, mode: ReceiptTemplateSettings['language']): string[] {
	if (!text) return [];
	const en = text.en?.trim() ?? '';
	const kh = text.kh?.trim() ?? '';
	if (mode === 'en') return en ? [en] : kh ? [kh] : [];
	if (mode === 'kh') return kh ? [kh] : en ? [en] : [];
	/** Khmer above English when both exist (Cambodian formal practice). */
	if (kh && en && kh !== en) return [kh, en];
	return [kh || en].filter(Boolean);
}

/** Café brand lockup: English (display) then Khmer — matches Coffee Plus sample. */
export function brandLines(
	text: LocaleText | undefined,
	mode: ReceiptTemplateSettings['language'],
	opts: { uppercaseEn?: boolean } = {}
): string[] {
	if (!text) return [];
	const enRaw = text.en?.trim() ?? '';
	const en = opts.uppercaseEn && enRaw ? enRaw.toUpperCase() : enRaw;
	const kh = text.kh?.trim() ?? '';
	if (mode === 'en') return en ? [en] : kh ? [kh] : [];
	if (mode === 'kh') return kh ? [kh] : en ? [en] : [];
	if (en && kh && en.toLowerCase() !== kh.toLowerCase()) return [en, kh];
	return [en || kh].filter(Boolean);
}

export type ReceiptCompliance = {
	ok: boolean;
	warnings: string[];
};

/** Soft gates — never invent VATTIN or buyer TIN. */
export function receiptCompliance(
	template: ReceiptTemplateSettings,
	ctx: { hasBuyerTin?: boolean; hasBuyerName?: boolean } = {}
): ReceiptCompliance {
	const warnings: string[] = [];
	if (template.docType === 'VAT_TAX') {
		if (!template.vatRegistered) {
			warnings.push('vat_not_registered');
		}
		if (!template.vattin.trim()) {
			warnings.push('vattin_missing');
		}
		if (!ctx.hasBuyerName) {
			warnings.push('buyer_name_missing');
		}
		if (!ctx.hasBuyerTin) {
			warnings.push('buyer_tin_missing');
		}
	}
	if (template.docType === 'COMMERCIAL' && !template.vattin.trim() && template.vatRegistered) {
		warnings.push('vattin_missing');
	}
	return { ok: warnings.length === 0 || template.docType === 'CAFE' || template.docType === 'RETAIL', warnings };
}

/** Build a preview order from a real paid order, or a minimal placeholder shape. */
export function pickPreviewOrder(orders: Order[]): Order | null {
	return (
		orders.find((order) => order.receipt && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL_REFUND')) ??
		orders.find((order) => order.receipt) ??
		null
	);
}
