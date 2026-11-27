import { motionMs } from '$lib/motion';

/** Soft outer ring blink (ទឹករលក) — shared by `.field`, number-field, checkbox. */
export const UI_INK_WAVE_MS = 850;

const SKIP_INPUT_TYPES = new Set([
	'file',
	'checkbox',
	'radio',
	'range',
	'color',
	'button',
	'submit',
	'reset',
	'hidden',
	'date',
	'time',
	'datetime-local',
	'month',
	'week'
]);

export function isTextboxField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
	if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false;
	if (!el.classList.contains('field')) return false;
	if (el.disabled) return false;
	if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) return false;
	return true;
}

/** Restart CSS ring animation on an element (safe for rapid re-clicks). */
export function playInkWave(el: HTMLElement) {
	if (motionMs(1) === 0) return;
	el.classList.remove('is-wave');
	void el.offsetWidth;
	el.classList.add('is-wave');
}

/**
 * App-wide: ring click on textboxes (`.field` input/textarea) only.
 * Install once from Shell — not page by page.
 */
export function installFieldInkWave(root: ParentNode = document): () => void {
	const onDown = (event: Event) => {
		const e = event as PointerEvent;
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		const target = e.target;
		if (!(target instanceof Element)) return;
		const field = target.closest('input.field, textarea.field');
		if (!isTextboxField(field)) return;
		playInkWave(field);
	};

	const onAnimEnd = (event: Event) => {
		const e = event as AnimationEvent;
		if (e.animationName !== 'ui-ink-wave') return;
		const el = e.target;
		if (el instanceof HTMLElement) el.classList.remove('is-wave');
	};

	root.addEventListener('pointerdown', onDown, true);
	root.addEventListener('animationend', onAnimEnd, true);
	return () => {
		root.removeEventListener('pointerdown', onDown, true);
		root.removeEventListener('animationend', onAnimEnd, true);
	};
}
