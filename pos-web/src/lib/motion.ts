/** Short durations for cashier UI. Zero when the user prefers reduced motion. */
export function motionMs(ms: number): number {
	if (typeof window === 'undefined') return ms;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

/**
 * CSS cubic-bezier(x1,y1,x2,y2) as a Svelte easing function.
 * Used for drawer / category transitions that should match design tokens.
 */
export function cssCubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;

	const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
	const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

	const solveT = (x: number) => {
		let t = x;
		for (let i = 0; i < 8; i++) {
			const xEst = sampleX(t) - x;
			const d = sampleDX(t);
			if (Math.abs(xEst) < 1e-6 || Math.abs(d) < 1e-6) break;
			t -= xEst / d;
		}
		let lo = 0;
		let hi = 1;
		t = x;
		for (let i = 0; i < 12; i++) {
			const xEst = sampleX(t);
			if (Math.abs(xEst - x) < 1e-6) return t;
			if (x > xEst) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return t;
	};

	return (t: number) => sampleY(solveT(Math.min(1, Math.max(0, t))));
}

/** Suggested drawer curve: cubic-bezier(0.22, 1, 0.36, 1). */
export const easeOutDrawer = cssCubicBezier(0.22, 1, 0.36, 1);

/** Category / content ease-out. */
export const easeOutSoft = cssCubicBezier(0.22, 1, 0.36, 1);
