import type { ReceiptPaper, ShopSettings } from '$lib/domain/types';
import { normalizeReceiptTemplate } from '$lib/domain/receipt-template';

const STYLE_ID = 'pos-print-page-size';
const ROOT_ID = 'receipt-print-root';
const SOURCE_ID = 'receipt-print-source';

/** Map configured receipt paper to a printable @page size (thermal roll or A4). */
function pageSize(paper: ReceiptPaper, heightMm?: number): string {
	if (paper === 'A4') return 'A4 portrait';
	const width = paper === '58' ? '58mm' : '80mm';
	/* Fit thermal roll to content — avoid a full 297mm page of blank height. */
	if (heightMm && heightMm > 0) return `${width} ${heightMm}mm`;
	return `${width} auto`;
}

/** CSS px → mm at 96dpi, plus small margin for @page margins / rounding. */
function contentHeightMm(el: HTMLElement): number {
	const px = Math.max(el.scrollHeight, el.getBoundingClientRect().height);
	return Math.max(40, Math.ceil((px * 25.4) / 96) + 6);
}

export function paperWidthCss(paper: ReceiptPaper): string {
	if (paper === 'A4') return '210mm';
	if (paper === '58') return '58mm';
	return '80mm';
}

/** Paper size from Settings → Receipt template (source of truth for preview/print). */
export function configuredReceiptPaper(
	settings: Pick<ShopSettings, 'paper' | 'taxId' | 'receiptFooter' | 'receiptTemplate'>
): ReceiptPaper {
	return normalizeReceiptTemplate(settings.receiptTemplate, settings).paper;
}

/**
 * Print the on-screen `#receipt-print` sheet.
 * Clones it onto `document.body` so dialog overflow/transform does not break layout
 * (Orders reprint nests the sheet inside stacked dialogs).
 */
export function printReceipt(paper: ReceiptPaper = '80') {
	if (typeof document === 'undefined') return;
	const source = document.getElementById('receipt-print') ?? document.getElementById(SOURCE_ID);
	if (!source) return;

	document.getElementById(STYLE_ID)?.remove();
	document.getElementById(ROOT_ID)?.remove();
	if (source.id === SOURCE_ID) source.id = 'receipt-print';

	const width = paperWidthCss(paper);
	const root = document.createElement('div');
	root.id = ROOT_ID;
	root.setAttribute('aria-hidden', 'true');
	const clone = source.cloneNode(true) as HTMLElement;
	clone.id = 'receipt-print';
	source.id = SOURCE_ID;
	root.appendChild(clone);
	document.body.appendChild(root);

	/* Lay out off-screen at real paper width so we can size @page to content. */
	root.style.cssText = `position:fixed;left:-10000px;top:0;width:${width};pointer-events:none;`;
	const thermalHeight = paper === 'A4' ? undefined : contentHeightMm(clone);

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		#${ROOT_ID} {
			position: fixed;
			left: -10000px;
			top: 0;
			width: ${width};
			pointer-events: none;
		}
		@page {
			size: ${pageSize(paper, thermalHeight)};
			margin: 2mm;
		}
		@media print {
			body > *:not(#${ROOT_ID}) {
				display: none !important;
			}
			html, body {
				width: ${width} !important;
				height: auto !important;
				margin: 0 !important;
				padding: 0 !important;
				background: #fff !important;
			}
			#${ROOT_ID} {
				position: static !important;
				left: auto !important;
				width: ${width} !important;
				height: auto !important;
				pointer-events: auto !important;
				display: block !important;
			}
			#${ROOT_ID} #receipt-print {
				display: block !important;
				position: static !important;
				width: ${width} !important;
				max-width: ${width} !important;
				min-width: ${width} !important;
				height: auto !important;
				min-height: 0 !important;
				margin: 0 !important;
				box-shadow: none !important;
				border: none !important;
				border-radius: 0 !important;
				background: #fff !important;
				color: #000 !important;
			}
		}
	`;
	document.head.appendChild(style);
	document.documentElement.dataset.printPaper = paper;

	let cleaned = false;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		style.remove();
		root.remove();
		const original = document.getElementById(SOURCE_ID);
		if (original) original.id = 'receipt-print';
		delete document.documentElement.dataset.printPaper;
		window.removeEventListener('afterprint', cleanup);
		try {
			mql.removeEventListener('change', onPrintChange);
		} catch {
			/* older browsers */
		}
	};

	const mql = window.matchMedia('print');
	const onPrintChange = () => {
		if (!mql.matches) cleanup();
	};
	try {
		mql.addEventListener('change', onPrintChange);
	} catch {
		/* ignore */
	}
	window.addEventListener('afterprint', cleanup);
	window.setTimeout(cleanup, 60_000);

	window.print();
}
