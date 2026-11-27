<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Shell from '$lib/components/shell.svelte';
	import { barePath, href } from '$lib/i18n/label';
	import { appLocale } from '$lib/i18n/locale.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';

	let { children } = $props();
	const path = $derived(barePath(page.url));
	const isCds = $derived(path === '/customer-display' || path.startsWith('/customer-display/'));
	const isLogin = $derived(path === '/login' || path.startsWith('/login/'));
	const isPublic = $derived(isCds || isLogin);
	const locale = $derived(appLocale.current);

	const docTitle = $derived.by(() => {
		locale;
		const brand = m.logo();
		if (isLogin) return `${m.login_title()} · ${brand}`;
		if (isCds) return `${m.cds_title()} · ${brand}`;
		if (path === '/' || path === '') return `${m.nav_pos()} · ${brand}`;
		if (path.startsWith('/orders')) return `${m.nav_orders()} · ${brand}`;
		if (path.startsWith('/kitchen')) return `${m.kitchen_page()} · ${brand}`;
		if (path.startsWith('/products')) return `${m.nav_products()} · ${brand}`;
		if (path.startsWith('/categories')) return `${m.nav_categories()} · ${brand}`;
		if (path.startsWith('/modifiers')) return `${m.nav_modifiers()} · ${brand}`;
		if (path.startsWith('/customers')) return `${m.nav_customers()} · ${brand}`;
		if (path.startsWith('/reports')) return `${m.nav_reports()} · ${brand}`;
		if (path.startsWith('/shifts')) return `${m.nav_shifts()} · ${brand}`;
		if (path.startsWith('/money')) return `${m.nav_money()} · ${brand}`;
		if (path.startsWith('/staff')) return `${m.nav_staff()} · ${brand}`;
		if (path.startsWith('/settings')) return `${m.nav_settings()} · ${brand}`;
		if (path.startsWith('/sync')) return `${m.sync_title()} · ${brand}`;
		return brand;
	});

	if (typeof window !== 'undefined') {
		appLocale.wireClient();
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		path;
		demo.loggedIn;
		if (isCds) return;
		if (!demo.loggedIn && !isLogin) {
			void goto(href('/login'), { replaceState: true });
			return;
		}
		if (demo.loggedIn && isLogin) {
			void goto(href('/'), { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>{docTitle}</title>
</svelte:head>

{#if isPublic}
	{@render children()}
{:else if demo.loggedIn}
	<Shell>
		{@render children()}
	</Shell>
{/if}
