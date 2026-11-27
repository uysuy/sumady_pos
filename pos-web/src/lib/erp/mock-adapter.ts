/**
 * Demo stand-in for a future SumadyERPAdapter.
 * Screens must call the store, and the store calls this adapter.
 * A repeated posTransactionId returns the original ERP reference.
 */
export interface SubmitResult {
	ok: boolean;
	code: 'offline' | 'synced' | 'duplicate';
	erpTransactionId?: string;
}

const accepted = new Map<string, string>();

export function resetMockErp() {
	accepted.clear();
}

export function submitToMockErp(input: {
	posTransactionId: string;
	orderNumber: string;
	eventType: 'SALE_FINALIZED' | 'REFUND_REQUESTED';
	offline: boolean;
	existingErpId?: string;
}): SubmitResult {
	if (input.offline) return { ok: false, code: 'offline' };
	const known = input.existingErpId || accepted.get(input.posTransactionId);
	if (known) {
		accepted.set(input.posTransactionId, known);
		return { ok: true, code: 'duplicate', erpTransactionId: known };
	}
	const erpTransactionId = `SI-${input.orderNumber}${input.eventType === 'REFUND_REQUESTED' ? '-R' : ''}`;
	accepted.set(input.posTransactionId, erpTransactionId);
	return { ok: true, code: 'synced', erpTransactionId };
}
