import type { DiscountMode, LocaleText, OrderTotals, TaxMode, TaxSetting } from './types';

export function applyDiscount(subtotal: number, mode: DiscountMode, value: number): number {
	if (subtotal <= 0 || mode === 'NONE') return 0;
	if (mode === 'FIXED') return Math.min(subtotal, Math.max(0, Math.round(value)));
	const pct = Math.min(100, Math.max(0, value));
	return Math.min(subtotal, Math.round((subtotal * pct) / 100));
}

export function calcTax(
	amount: number,
	rateBasisPoints: number,
	mode: TaxMode
): { tax: number; total: number; net: number } {
	const base = Math.max(0, Math.round(amount));
	const rate = Math.max(0, Math.round(rateBasisPoints));
	if (base === 0 || rate === 0) return { tax: 0, total: base, net: base };
	if (mode === 'INCLUSIVE') {
		const net = Math.round((base * 10000) / (10000 + rate));
		return { tax: base - net, total: base, net };
	}
	const tax = Math.round((base * rate) / 10000);
	return { tax, total: base + tax, net: base };
}

/** Whole riel. Rate is KHR per 1 USD, matching SuMady `1 USD = 4,100 KHR`. */
export function toKhr(usdCents: number, usdToKhr: number): number {
	if (usdToKhr <= 0) return 0;
	return Math.round((usdCents / 100) * usdToKhr);
}

export function priceCart(
	subtotal: number,
	discountMode: DiscountMode,
	discountValue: number,
	tax: TaxSetting,
	usdToKhr: number
): OrderTotals {
	const safeSubtotal = Math.max(0, Math.round(subtotal));
	const discount = applyDiscount(safeSubtotal, discountMode, discountValue);
	const after = safeSubtotal - discount;
	const rate = tax.active ? tax.rateBasisPoints : 0;
	const result = calcTax(after, rate, tax.calculationMode);
	return {
		subtotal: safeSubtotal,
		discount,
		taxableAmount: tax.calculationMode === 'INCLUSIVE' ? result.net : after,
		tax: result.tax,
		total: result.total,
		currency: 'USD',
		taxName: tax.name,
		taxRateBasisPoints: rate,
		taxMode: tax.calculationMode,
		usdToKhr,
		totalKhr: toKhr(result.total, usdToKhr)
	};
}

export function formatUsd(cents: number): string {
	const sign = cents < 0 ? '-' : '';
	return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function formatKhr(riel: number): string {
	const sign = riel < 0 ? '-' : '';
	return `${sign}៛${Math.abs(Math.round(riel)).toLocaleString('en-US')}`;
}

export function formatRate(usdToKhr: number): string {
	return `1 USD = ${Math.round(usdToKhr).toLocaleString('en-US')} KHR`;
}

/** Round KHR to nearest 100 in the guest's favor (never overcharge change). */
export function roundKhrFavorGuest(riel: number): number {
	if (riel <= 0) return 0;
	return Math.floor(riel / 100) * 100;
}

export function khrToUsdCents(riel: number, usdToKhr: number): number {
	if (usdToKhr <= 0) return 0;
	return Math.round((riel / usdToKhr) * 100);
}

/**
 * Mixed cash tender: guest hands USD cents + KHR riel toward an applied USD amount.
 * Change prefers whole USD first, remainder in KHR rounded favor guest.
 */
export function settleMixedCash(input: {
	appliedUsdCents: number;
	receivedUsdCents: number;
	receivedKhr: number;
	usdToKhr: number;
}): {
	ok: boolean;
	receivedUsdEquivalent: number;
	changeDueUsd: number;
	changeDueKhr: number;
} {
	const applied = Math.max(0, Math.round(input.appliedUsdCents));
	const recvUsd = Math.max(0, Math.round(input.receivedUsdCents));
	const recvKhr = Math.max(0, Math.round(input.receivedKhr));
	const rate = input.usdToKhr > 0 ? input.usdToKhr : 4100;
	const fromKhr = khrToUsdCents(recvKhr, rate);
	const totalRecv = recvUsd + fromKhr;
	if (totalRecv < applied) {
		return { ok: false, receivedUsdEquivalent: totalRecv, changeDueUsd: 0, changeDueKhr: 0 };
	}
	let leftover = totalRecv - applied;
	const changeDueUsd = Math.floor(leftover / 100) * 100;
	leftover -= changeDueUsd;
	const changeDueKhr = roundKhrFavorGuest(toKhr(leftover, rate));
	return { ok: true, receivedUsdEquivalent: totalRecv, changeDueUsd, changeDueKhr };
}

export function taxLabel(name: LocaleText, rateBasisPoints: number): string {
	return `${(rateBasisPoints / 100).toFixed(rateBasisPoints % 100 === 0 ? 0 : 2)}%`;
}
