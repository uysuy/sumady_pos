/** Customer display sync — cashier → second window via BroadcastChannel. */

export type CdsPhase = 'idle' | 'cart' | 'pay' | 'thanks';

export type CdsLine = {
	id: string;
	nameEn: string;
	nameKh: string;
	qty: number;
	unitPrice: number;
	lineTotal: number;
	modifiers: string;
	modifiersKh?: string;
	note?: string;
	imageUrl?: string;
};

export type CdsAd = {
	id: string;
	imageUrl: string;
	titleEn: string;
	titleKh: string;
	subtitleEn?: string;
	subtitleKh?: string;
};

export type CdsQueueItem = {
	id: string;
	waitingNumber: string;
	orderNumber?: string;
	status: 'preparing' | 'ready';
};

export type CdsPayload = {
	v: 1;
	at: number;
	phase: CdsPhase;
	shopEn: string;
	shopKh: string;
	taglineEn: string;
	taglineKh: string;
	logoUrl?: string;
	orderNumber?: string;
	/** Short café waiting / pickup token shown on the queue chip. */
	waitingNumber?: string;
	lines: CdsLine[];
	subtotal: number;
	discount: number;
	tax: number;
	total: number;
	totalKhr: number;
	usdToKhr: number;
	attemptLabel?: string;
	attemptStatus?: 'PENDING' | 'CONFIRMED' | 'FAILED' | '';
	/** ABA PayWay KHQR image (data URL) — cashier UI; CDS prefers qrString. */
	qrImage?: string;
	/** Raw KHQR payload for rendering a compact QR on the green CDS stage. */
	qrString?: string;
	ads?: CdsAd[];
	/** Live KDS queue — preparing (NEW/PREPARING) vs ready for pickup. */
	queuePreparing?: CdsQueueItem[];
	queueReady?: CdsQueueItem[];
};

const CHANNEL = 'pos-cds';
const STORAGE_KEY = 'coffee-plus-cds.v1';

export function publishCds(payload: CdsPayload) {
	if (typeof window === 'undefined') return;
	const body = { ...payload, v: 1 as const, at: Date.now() };
	try {
		/** Replace large prior payloads (e.g. KHQR) so reset/idle always wins. */
		localStorage.removeItem(STORAGE_KEY);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
	} catch {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
		} catch {
			/* ignore quota */
		}
	}
	try {
		const bc = new BroadcastChannel(CHANNEL);
		bc.postMessage(body);
		bc.close();
	} catch {
		/* BroadcastChannel unavailable */
	}
}

export function readCdsSnapshot(): CdsPayload | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as CdsPayload;
	} catch {
		return null;
	}
}

export function subscribeCds(onMessage: (payload: CdsPayload) => void): () => void {
	if (typeof window === 'undefined') return () => {};
	const snap = readCdsSnapshot();
	if (snap) onMessage(snap);
	let bc: BroadcastChannel | null = null;
	try {
		bc = new BroadcastChannel(CHANNEL);
		bc.onmessage = (event) => {
			if (event.data?.v === 1) onMessage(event.data as CdsPayload);
		};
	} catch {
		/* ignore */
	}
	const onStorage = (event: StorageEvent) => {
		if (event.key !== STORAGE_KEY || !event.newValue) return;
		try {
			onMessage(JSON.parse(event.newValue) as CdsPayload);
		} catch {
			/* ignore */
		}
	};
	window.addEventListener('storage', onStorage);
	return () => {
		bc?.close();
		window.removeEventListener('storage', onStorage);
	};
}

export function openCustomerDisplayWindow() {
	if (typeof window === 'undefined') return;
	const url = `${window.location.origin}/customer-display`;
	window.open(url, 'coffee-plus-cds', 'noopener,noreferrer');
}

/** Wipe CDS ticket + queue board (reset demo / idle). */
export function clearCds(shop?: {
	shopEn?: string;
	shopKh?: string;
	taglineEn?: string;
	taglineKh?: string;
	logoUrl?: string;
}) {
	publishCds({
		v: 1,
		at: Date.now(),
		phase: 'idle',
		shopEn: shop?.shopEn || '',
		shopKh: shop?.shopKh || '',
		taglineEn: shop?.taglineEn || '',
		taglineKh: shop?.taglineKh || '',
		logoUrl: shop?.logoUrl,
		orderNumber: '',
		waitingNumber: '',
		lines: [],
		subtotal: 0,
		discount: 0,
		tax: 0,
		total: 0,
		totalKhr: 0,
		usdToKhr: 0,
		attemptLabel: '',
		attemptStatus: '',
		qrImage: '',
		qrString: '',
		ads: [],
		queuePreparing: [],
		queueReady: []
	});
}

/**
 * Patch only the KDS queue lists onto the latest CDS snapshot.
 * Avoids wiping an active cart ticket when kitchen advances in another window.
 */
export function publishCdsQueueBoard(queue: {
	preparing: CdsQueueItem[];
	ready: CdsQueueItem[];
	shopEn?: string;
	shopKh?: string;
	taglineEn?: string;
	taglineKh?: string;
	logoUrl?: string;
	ads?: CdsAd[];
}) {
	const snap = readCdsSnapshot();
	publishCds({
		v: 1,
		at: Date.now(),
		phase: snap?.phase ?? 'idle',
		shopEn: snap?.shopEn || queue.shopEn || '',
		shopKh: snap?.shopKh || queue.shopKh || '',
		taglineEn: snap?.taglineEn || queue.taglineEn || '',
		taglineKh: snap?.taglineKh || queue.taglineKh || '',
		logoUrl: snap?.logoUrl || queue.logoUrl,
		orderNumber: snap?.orderNumber,
		waitingNumber: snap?.waitingNumber,
		lines: snap?.lines ?? [],
		subtotal: snap?.subtotal ?? 0,
		discount: snap?.discount ?? 0,
		tax: snap?.tax ?? 0,
		total: snap?.total ?? 0,
		totalKhr: snap?.totalKhr ?? 0,
		usdToKhr: snap?.usdToKhr ?? 0,
		attemptLabel: snap?.attemptLabel,
		attemptStatus: snap?.attemptStatus ?? '',
		qrImage: snap?.qrImage ?? '',
		qrString: snap?.qrString ?? '',
		ads: snap?.ads?.length ? snap.ads : queue.ads,
		queuePreparing: queue.preparing,
		queueReady: queue.ready
	});
}
