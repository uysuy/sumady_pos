import { json } from '@sveltejs/kit';
import { generateKhqr, isPaywayConfigured, newPaywayTranId } from '$lib/server/payway';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!isPaywayConfigured()) {
		return json({ configured: false, error: 'payway_not_configured' }, { status: 503 });
	}

	let body: { amountCents?: number; firstname?: string; lastname?: string };
	try {
		body = await request.json();
	} catch {
		return json({ configured: true, error: 'invalid_json' }, { status: 400 });
	}

	const amountCents = Math.round(Number(body.amountCents) || 0);
	if (amountCents < 1) {
		return json({ configured: true, error: 'invalid_amount' }, { status: 400 });
	}

	const amountUsd = (amountCents / 100).toFixed(2);
	const tranId = newPaywayTranId();

	try {
		const result = await generateKhqr({
			tranId,
			amountUsd,
			firstname: body.firstname,
			lastname: body.lastname,
			lifetimeMinutes: 10
		});
		return json({
			configured: true,
			tranId: result.tranId,
			qrImage: result.qrImage,
			qrString: result.qrString,
			lifetime: result.lifetime,
			amount: result.amount,
			currency: result.currency
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'payway_error';
		return json({ configured: true, error: message }, { status: 502 });
	}
};
