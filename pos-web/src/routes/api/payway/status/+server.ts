import { json } from '@sveltejs/kit';
import { checkTransaction, isPaywayConfigured } from '$lib/server/payway';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!isPaywayConfigured()) {
		return json({ configured: false, error: 'payway_not_configured' }, { status: 503 });
	}

	let body: { tranId?: string };
	try {
		body = await request.json();
	} catch {
		return json({ configured: true, error: 'invalid_json' }, { status: 400 });
	}

	const tranId = String(body.tranId ?? '').trim();
	if (!tranId) {
		return json({ configured: true, error: 'missing_tran_id' }, { status: 400 });
	}

	try {
		const result = await checkTransaction(tranId);
		return json({
			configured: true,
			tranId,
			status: result.status,
			paymentStatus: result.paymentStatus,
			paymentStatusCode: result.paymentStatusCode
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'payway_error';
		return json({ configured: true, error: message }, { status: 502 });
	}
};
