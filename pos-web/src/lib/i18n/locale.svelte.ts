import {
	deLocalizeUrl,
	getLocale,
	getLocaleForUrl,
	localizeHref,
	overwriteGetLocale,
	setLocale
} from '$paraglide/runtime';

export type AppLocale = 'en' | 'kh';

function asAppLocale(value: string | undefined): AppLocale {
	return value === 'kh' ? 'kh' : 'en';
}

function readLocale(): AppLocale {
	try {
		if (typeof window !== 'undefined' && window.location?.href) {
			return asAppLocale(getLocaleForUrl(window.location.href));
		}
		return asAppLocale(getLocale());
	} catch {
		return 'en';
	}
}

/** Sync the address bar locale prefix without SvelteKit navigation (no page remount). */
function replaceLocalizedUrl(next: AppLocale) {
	if (typeof window === 'undefined') return;
	const bare = deLocalizeUrl(new URL(window.location.href));
	const target = localizeHref(`${bare.pathname}${bare.search}${bare.hash}`, { locale: next });
	const url = new URL(target, window.location.origin);
	const nextHref = `${url.pathname}${url.search}${url.hash}`;
	const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (nextHref !== cur) {
		history.replaceState(history.state, '', nextHref);
	}
}

/** Reactive locale so Paraglide message calls re-run without a full page reload. */
class LocaleStore {
	current = $state<AppLocale>(readLocale());
	#wired = false;

	/** Call once on the client so message helpers read this store. */
	wireClient() {
		if (this.#wired || typeof window === 'undefined') return;
		this.syncFromEnvironment();
		overwriteGetLocale(() => this.current);
		this.#wired = true;
		document.documentElement.lang = this.current === 'kh' ? 'km' : 'en';
	}

	/** Keep store aligned after URL-driven navigation (back/forward, deep links). */
	syncFromEnvironment() {
		const next = readLocale();
		if (next !== this.current) {
			this.current = next;
			if (typeof document !== 'undefined') {
				document.documentElement.lang = next === 'kh' ? 'km' : 'en';
			}
		}
	}

	set(next: AppLocale) {
		if (next === this.current) return;
		this.wireClient();
		// Cookie/localStorage only — no document reload.
		setLocale(next, { reload: false });
		this.current = next;
		document.documentElement.lang = next === 'kh' ? 'km' : 'en';
		replaceLocalizedUrl(next);
	}
}

export const appLocale = new LocaleStore();
