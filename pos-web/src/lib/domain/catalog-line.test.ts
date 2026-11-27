import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lineIdentity, lineKey } from './catalog.ts';
import type { CartLine } from './types.ts';

function line(optionIds: string[], note = ''): CartLine {
	return {
		id: 'x',
		productId: 'prd_latte',
		sku: 'L',
		erpItemId: 'e',
		productName: { en: 'Latte', kh: 'Latte' },
		categoryId: 'cat',
		preparesInKitchen: true,
		baseUnitPrice: 300,
		selectedModifiers: optionIds.map((optionId) => ({
			groupId: 'mod_size',
			groupName: { en: 'Size', kh: 'Size' },
			optionId,
			optionName: { en: optionId, kh: optionId },
			priceDelta: 0
		})),
		specialInstructions: note || undefined,
		quantity: 1,
		unitPrice: 300,
		lineTotal: 300
	};
}

describe('lineIdentity', () => {
	it('treats Size L and Size S as different lines', () => {
		assert.notEqual(lineIdentity(line(['size_l'])), lineIdentity(line(['size_s'])));
	});

	it('treats same product + same modifiers as the same line', () => {
		assert.equal(lineIdentity(line(['size_l', 'temp_hot'])), lineIdentity(line(['size_l', 'temp_hot'])));
		assert.equal(lineKey('prd_latte', ['temp_hot', 'size_l'], ''), lineKey('prd_latte', ['size_l', 'temp_hot'], ''));
	});

	it('treats different notes as different lines', () => {
		assert.notEqual(lineIdentity(line(['size_l'], 'less ice')), lineIdentity(line(['size_l'], '')));
	});
});
