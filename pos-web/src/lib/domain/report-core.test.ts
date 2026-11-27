import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	allocateOrderLines,
	filterSaleOrders,
	isSaleOrder,
	orderMoney,
	sumMoney,
	type ReportFilters
} from './report-core.ts';
import type { Order } from './types.ts';

function baseOrder(overrides: Partial<Order> = {}): Order {
	const now = '2026-11-18T10:00:00.000Z';
	return {
		id: 'o1',
		orderNumber: 'CP-1',
		posTransactionId: 't1',
		branchId: 'b1',
		warehouseId: 'w1',
		terminalId: 'term1',
		cashierId: 'c1',
		orderType: 'TAKEAWAY',
		lines: [
			{
				id: 'l1',
				productId: 'p1',
				sku: 'SKU1',
				erpItemId: 'e1',
				productName: { en: 'Latte', kh: 'ឡាតេ' },
				categoryId: 'cat1',
				preparesInKitchen: true,
				baseUnitPrice: 300,
				selectedModifiers: [
					{
						groupId: 'g1',
						groupName: { en: 'Size', kh: 'ទំហំ' },
						optionId: 'opt1',
						optionName: { en: 'Large', kh: 'ធំ' },
						priceDelta: 50
					}
				],
				quantity: 2,
				unitPrice: 350,
				lineTotal: 700
			},
			{
				id: 'l2',
				productId: 'p2',
				sku: 'SKU2',
				erpItemId: 'e2',
				productName: { en: 'Muffin', kh: 'ម៉ាហ្វីន' },
				categoryId: 'cat2',
				preparesInKitchen: false,
				baseUnitPrice: 300,
				selectedModifiers: [],
				quantity: 1,
				unitPrice: 300,
				lineTotal: 300
			}
		],
		totals: {
			subtotal: 1000,
			discount: 100,
			taxableAmount: 900,
			tax: 90,
			total: 990,
			currency: 'USD',
			taxName: { en: 'VAT', kh: 'អាករ' },
			taxRateBasisPoints: 1000,
			taxMode: 'EXCLUSIVE',
			usdToKhr: 4100,
			totalKhr: 40590
		},
		discountMode: 'FIXED',
		discountValue: 100,
		orderStatus: 'COMPLETED',
		paymentStatus: 'PAID',
		syncStatus: 'SYNCED',
		createdAt: now,
		paidAt: now,
		timeline: [],
		source: 'DEMO_SEED',
		refundedTotal: 0,
		...overrides
	};
}

test('cancelled orders are not sale orders', () => {
	assert.equal(isSaleOrder(baseOrder({ orderStatus: 'CANCELLED' })), false);
	assert.equal(isSaleOrder(baseOrder({ paymentStatus: 'REFUNDED' })), true);
});

test('collected nets refunds on the ticket', () => {
	const money = orderMoney(baseOrder({ paymentStatus: 'PARTIAL_REFUND', refundedTotal: 200 }));
	assert.equal(money.ticketTotal, 990);
	assert.equal(money.refunds, 200);
	assert.equal(money.collected, 790);
});

test('line allocation splits discount by line share', () => {
	const lines = allocateOrderLines(baseOrder());
	assert.equal(lines[0].gross, 700);
	assert.equal(lines[0].discount, 70);
	assert.equal(lines[1].gross, 300);
	assert.equal(lines[1].discount, 30);
	assert.equal(lines[0].discount + lines[1].discount, 100);
});

test('filters respect branch and cashier', () => {
	const orders = [
		baseOrder({ id: 'a', branchId: 'b1', cashierId: 'c1' }),
		baseOrder({ id: 'b', branchId: 'b2', cashierId: 'c1', paidAt: '2026-11-18T11:00:00.000Z' }),
		baseOrder({ id: 'c', branchId: 'b1', cashierId: 'c2', paidAt: '2026-11-18T12:00:00.000Z' })
	];
	const filters: ReportFilters = {
		range: 'custom',
		from: '2026-11-18',
		to: '2026-11-18',
		branchId: 'b1',
		cashierId: 'c1'
	};
	const filtered = filterSaleOrders(orders, filters, new Date('2026-11-18T15:00:00.000Z'));
	assert.equal(filtered.length, 1);
	assert.equal(filtered[0].id, 'a');
});

test('sumMoney averages from collected', () => {
	const totals = sumMoney([
		orderMoney(baseOrder()),
		orderMoney(baseOrder({ id: 'o2', refundedTotal: 90 }))
	]);
	assert.equal(totals.orderCount, 2);
	assert.equal(totals.collected, 990 + 900);
	assert.equal(totals.average, Math.round(totals.collected / 2));
});
