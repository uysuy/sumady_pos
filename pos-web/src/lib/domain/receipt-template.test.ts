import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	bilingualLines,
	brandLines,
	defaultReceiptTemplate,
	normalizeReceiptTemplate,
	receiptCompliance
} from './receipt-template.ts';

test('normalize fills café defaults and keeps paper', () => {
	const next = normalizeReceiptTemplate(undefined, {
		paper: '58',
		taxId: 'K001-234567890',
		receiptFooter: { en: 'Thanks', kh: 'អរគុណ' }
	});
	assert.equal(next.docType, 'CAFE');
	assert.equal(next.paper, '58');
	assert.equal(next.vattin, 'K001-234567890');
	assert.equal(next.show.table, true);
	assert.equal(next.show.sku, false);
});

test('retail defaults hide table and show sku', () => {
	const next = normalizeReceiptTemplate({ docType: 'RETAIL' }, {
		paper: '80',
		taxId: '',
		receiptFooter: { en: '', kh: '' }
	});
	assert.equal(next.show.table, false);
	assert.equal(next.show.sku, true);
});

test('bilingual puts Khmer above English', () => {
	assert.deepEqual(bilingualLines({ en: 'Coffee Plus', kh: 'កាហ្វេ ផ្លឹស' }, 'both'), [
		'កាហ្វេ ផ្លឹស',
		'Coffee Plus'
	]);
	assert.deepEqual(bilingualLines({ en: 'Coffee Plus', kh: 'កាហ្វេ ផ្លឹស' }, 'en'), ['Coffee Plus']);
	assert.deepEqual(bilingualLines({ en: 'Coffee Plus', kh: 'កាហ្វេ ផ្លឹស' }, 'kh'), ['កាហ្វេ ផ្លឹស']);
});

test('café brand lockup puts English above Khmer', () => {
	assert.deepEqual(brandLines({ en: 'Coffee Plus', kh: 'កាហ្វេ ផ្លឹស' }, 'both', { uppercaseEn: true }), [
		'COFFEE PLUS',
		'កាហ្វេ ផ្លឹស'
	]);
});

test('VAT tax invoice compliance warns; never invents VATTIN', () => {
	const base = defaultReceiptTemplate();
	const gated = receiptCompliance(
		{ ...base, docType: 'VAT_TAX', vatRegistered: false, vattin: '' },
		{}
	);
	assert.ok(gated.warnings.includes('vat_not_registered'));
	assert.ok(gated.warnings.includes('vattin_missing'));
	assert.ok(!gated.warnings.includes('gdt_not_certified'));
	assert.equal(gated.ok, false);
});
