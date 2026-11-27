import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';

export type PaywayNormalizedStatus = 'PENDING' | 'APPROVED' | 'FAILED' | 'EXPIRED';

type PaywayConfig = {
	merchantId: string;
	apiKey: string;
	baseUrl: string;
};

function trimSlash(url: string) {
	return url.replace(/\/+$/, '');
}

export function getPaywayConfig(): PaywayConfig | null {
	const merchantId = env.PAYWAY_MERCHANT_ID?.trim();
	const apiKey = env.PAYWAY_API_KEY?.trim();
	const baseUrl = env.PAYWAY_BASE_URL?.trim();
	if (!merchantId || !apiKey || !baseUrl) return null;
	return { merchantId, apiKey, baseUrl: trimSlash(baseUrl) };
}

export function isPaywayConfigured(): boolean {
	return getPaywayConfig() !== null;
}

/** UTC `YYYYMMDDHHmmss` as required by PayWay. */
export function paywayReqTime(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		date.getUTCFullYear().toString() +
		pad(date.getUTCMonth() + 1) +
		pad(date.getUTCDate()) +
		pad(date.getUTCHours()) +
		pad(date.getUTCMinutes()) +
		pad(date.getUTCSeconds())
	);
}

/** Max 20 chars; unique enough for POS sandbox attempts. */
export function newPaywayTranId(): string {
	return (`CP${Date.now()}`).slice(0, 20);
}

export function paywayHash(apiKey: string, parts: Array<string | number | undefined | null>): string {
	const concatenated = parts.map((part) => (part == null ? '' : String(part))).join('');
	return createHmac('sha512', apiKey).update(concatenated).digest('base64');
}

export type GenerateKhqrInput = {
	tranId: string;
	amountUsd: string;
	firstname?: string;
	lastname?: string;
	email?: string;
	phone?: string;
	lifetimeMinutes?: number;
};

export type GenerateKhqrResult = {
	tranId: string;
	qrImage: string;
	qrString: string;
	lifetime: number;
	amount: number;
	currency: string;
};

export async function generateKhqr(input: GenerateKhqrInput): Promise<GenerateKhqrResult> {
	const config = getPaywayConfig();
	if (!config) throw new Error('payway_not_configured');

	const req_time = paywayReqTime();
	const lifetime = Math.max(3, Math.min(60 * 24 * 30, input.lifetimeMinutes ?? 10));
	const first_name = input.firstname ?? 'POS';
	const last_name = input.lastname ?? 'Customer';
	const email = input.email ?? '';
	const phone = input.phone ?? '';
	const items = '';
	const purchase_type = '';
	const payment_option = 'abapay_khqr';
	const callback_url = '';
	const return_deeplink = '';
	const currency = 'USD';
	const custom_fields = '';
	const return_params = '';
	const payout = '';
	const qr_image_template = 'template3_color';
	const amount = input.amountUsd;

	const hash = paywayHash(config.apiKey, [
		req_time,
		config.merchantId,
		input.tranId,
		amount,
		items,
		first_name,
		last_name,
		email,
		phone,
		purchase_type,
		payment_option,
		callback_url,
		return_deeplink,
		currency,
		custom_fields,
		return_params,
		payout,
		lifetime,
		qr_image_template
	]);

	const body = {
		req_time,
		merchant_id: config.merchantId,
		tran_id: input.tranId,
		first_name,
		last_name,
		amount,
		currency,
		payment_option,
		lifetime,
		qr_image_template,
		hash
	};

	const res = await fetch(`${config.baseUrl}/api/payment-gateway/v1/payments/generate-qr`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
	const status = json?.status as { code?: string; message?: string } | undefined;
	const ok = res.ok && (status?.code === '0' || status?.code === '00');
	if (!ok || !json) {
		const message = status?.message || `PayWay generate-qr failed (${res.status})`;
		throw new Error(message);
	}

	const qrImage = String(json.qrImage ?? '');
	const qrString = String(json.qrString ?? '');
	if (!qrImage && !qrString) throw new Error('PayWay generate-qr returned no QR');

	return {
		tranId: input.tranId,
		qrImage,
		qrString,
		lifetime,
		amount: Number(json.amount ?? amount),
		currency: String(json.currency ?? currency)
	};
}

export async function checkTransaction(tranId: string): Promise<{
	status: PaywayNormalizedStatus;
	paymentStatus: string;
	paymentStatusCode: number | null;
}> {
	const config = getPaywayConfig();
	if (!config) throw new Error('payway_not_configured');

	const req_time = paywayReqTime();
	const hash = paywayHash(config.apiKey, [req_time, config.merchantId, tranId]);

	const res = await fetch(`${config.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			req_time,
			merchant_id: config.merchantId,
			tran_id: tranId,
			hash
		})
	});

	const json = (await res.json().catch(() => null)) as {
		data?: { payment_status?: string; payment_status_code?: number };
		status?: { code?: string; message?: string };
	} | null;

	if (!res.ok || !json?.data) {
		const message = json?.status?.message || `PayWay check-transaction failed (${res.status})`;
		throw new Error(message);
	}

	const paymentStatus = String(json.data.payment_status ?? '').toUpperCase();
	const paymentStatusCode = json.data.payment_status_code ?? null;
	return {
		status: normalizePaywayStatus(paymentStatus, paymentStatusCode),
		paymentStatus,
		paymentStatusCode
	};
}

function normalizePaywayStatus(paymentStatus: string, code: number | null): PaywayNormalizedStatus {
	if (paymentStatus === 'APPROVED' || paymentStatus === 'PRE-AUTH' || code === 0) return 'APPROVED';
	if (paymentStatus === 'PENDING' || code === 2) return 'PENDING';
	if (paymentStatus === 'EXPIRED' || code === 5) return 'EXPIRED';
	if (
		paymentStatus === 'DECLINED' ||
		paymentStatus === 'CANCELLED' ||
		paymentStatus === 'REFUNDED' ||
		code === 3 ||
		code === 4 ||
		code === 7
	) {
		return 'FAILED';
	}
	return 'PENDING';
}
