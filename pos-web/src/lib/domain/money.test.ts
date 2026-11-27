import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcTax, priceCart, settleMixedCash, toKhr } from './money.ts';
import type { TaxSetting } from './types.ts';

const vat: TaxSetting = {
	id: 'tax_vat',
	name: { en: 'VAT', kh: 'អាករ' },
	rateBasisPoints: 1000,
	calculationMode: 'EXCLUSIVE',
	active: true
};

test('exclusive VAT matches the SuMady 10% invoice shape', () => {
	const result = calcTax(1000, 1000, 'EXCLUSIVE');
	assert.equal(result.net, 1000);
	assert.equal(result.tax, 100);
	assert.equal(result.total, 1100);
});

test('inclusive VAT backs out the same 10%', () => {
	const result = calcTax(1100, 1000, 'INCLUSIVE');
	assert.equal(result.total, 1100);
	assert.equal(result.net, 1000);
	assert.equal(result.tax, 100);
});

test('client demo: large iced oat latte, extra shot, two muffins', () => {
	const latte = 350 + 100 + 50 + 50;
	const muffins = 300 * 2;
	const priced = priceCart(latte + muffins, 'NONE', 0, vat, 4100);
	assert.equal(priced.subtotal, 1150);
	assert.equal(priced.discount, 0);
	assert.equal(priced.tax, 115);
	assert.equal(priced.total, 1265);
	assert.equal(priced.totalKhr, toKhr(1265, 4100));
	assert.equal(priced.totalKhr, 51865);
});

test('discount is applied before tax and cannot exceed the subtotal', () => {
	const priced = priceCart(1000, 'PERCENT', 10, vat, 4100);
	assert.equal(priced.discount, 100);
	assert.equal(priced.tax, 90);
	assert.equal(priced.total, 990);
	const capped = priceCart(500, 'FIXED', 900, vat, 4100);
	assert.equal(capped.discount, 500);
	assert.equal(capped.total, 0);
});

test('settleMixedCash accepts USD+KHR and returns change', () => {
	const short = settleMixedCash({
		appliedUsdCents: 750,
		receivedUsdCents: 500,
		receivedKhr: 0,
		usdToKhr: 4100
	});
	assert.equal(short.ok, false);
	const ok = settleMixedCash({
		appliedUsdCents: 750,
		receivedUsdCents: 500,
		receivedKhr: 12000,
		usdToKhr: 4100
	});
	assert.equal(ok.ok, true);
	assert.ok(ok.receivedUsdEquivalent >= 750);
});
