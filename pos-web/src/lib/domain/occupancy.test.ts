import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tableOccupancy } from './reports.ts';
import type { Order, OrderStatus, PaymentStatus } from './types.ts';

function order(partial: {
	tableId?: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
}): Order {
	return {
		id: 'ord_test',
		orderNumber: 'CP-1',
		posTransactionId: 'pos_1',
		branchId: 'br_main',
		warehouseId: 'wh_main',
		terminalId: 'term_1',
		cashierId: 'stf_1',
		orderType: 'DINE_IN',
		tableId: partial.tableId ?? 'tbl_1',
		lines: [],
		totals: {
			subtotal: 100,
			discount: 0,
			taxableAmount: 100,
			tax: 0,
			total: 100,
			currency: 'USD',
			taxName: { en: 'VAT', kh: 'VAT' },
			taxRateBasisPoints: 0,
			taxMode: 'EXCLUSIVE',
			usdToKhr: 4100,
			totalKhr: 4100
		},
		discountMode: 'NONE',
		discountValue: 0,
		orderStatus: partial.orderStatus,
		paymentStatus: partial.paymentStatus,
		syncStatus: 'LOCAL_ONLY',
		createdAt: new Date().toISOString(),
		timeline: [],
		source: 'POS'
	};
}

describe('tableOccupancy', () => {
	it('occupies for OPEN unpaid', () => {
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'OPEN', paymentStatus: 'UNPAID' })]), true);
	});

	it('occupies for PAID but still IN_PROGRESS / CONFIRMED', () => {
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'CONFIRMED', paymentStatus: 'PAID' })]), true);
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'IN_PROGRESS', paymentStatus: 'PAID' })]), true);
	});

	it('does not free table on payment alone (COMPLETED required)', () => {
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'OPEN', paymentStatus: 'PAID' })]), true);
	});

	it('frees on COMPLETED or CANCELLED', () => {
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'COMPLETED', paymentStatus: 'PAID' })]), false);
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'CANCELLED', paymentStatus: 'CANCELLED' })]), false);
	});

	it('HELD does not occupy (U1 default)', () => {
		assert.equal(tableOccupancy('tbl_1', [order({ orderStatus: 'HELD', paymentStatus: 'PENDING' })]), false);
	});
});
