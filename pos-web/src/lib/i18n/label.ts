import { appLocale } from '$lib/i18n/locale.svelte';
import { deLocalizeUrl, localizeHref } from '$paraglide/runtime';
import type { LocaleText } from '$lib/domain/types';

export function label(text: LocaleText | undefined, fallback = ''): string {
	if (!text) return fallback;
	// Depend on reactive locale so catalog names update when language switches.
	const locale = appLocale.current;
	return locale === 'kh' ? text.kh || text.en : text.en || text.kh;
}

export function href(path: string): string {
	return localizeHref(path, { locale: appLocale.current });
}

export function barePath(url: URL): string {
	return deLocalizeUrl(url).pathname;
}

export function formatWhen(iso: string): string {
	return new Date(iso).toLocaleString(appLocale.current === 'kh' ? 'km-KH' : 'en-GB', {
		dateStyle: 'medium',
		timeStyle: 'short',
		numberingSystem: 'latn'
	});
}

export function currentLocale(): 'en' | 'kh' {
	return appLocale.current;
}

/** Call Paraglide messages with a reactive locale dependency so UI updates live. */
export function msg(message: () => string): string {
	void appLocale.current;
	return message();
}
