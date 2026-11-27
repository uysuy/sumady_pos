<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { barePath, href, label, msg } from '$lib/i18n/label';
	import { appLocale } from '$lib/i18n/locale.svelte';
	import { pendingSyncCount } from '$lib/state/demo.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import Dialog from '$lib/components/dialog.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import * as m from '$paraglide/messages';
	import {
		Banknote,
		BarChart3,
		ChefHat,
		ClipboardList,
		Coffee,
		Layers,
		Menu,
		MonitorSmartphone,
		Settings,
		RefreshCw,
		ShoppingCart,
		SlidersHorizontal,
		UserRound,
		Users,
		Wallet,
		X
	} from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { motionMs } from '$lib/motion';
	import { installFieldInkWave } from '$lib/ui/ink-wave';

	let { children }: { children: Snippet } = $props();
	let now = $state(new Date());
	let menuOpen = $state(false);
	/** hidden → in → out → hidden (CSS slide like Sonner / MUI Joy top snackbar). */
	let toastPhase = $state<'hidden' | 'in' | 'out'>('hidden');
	let toastId = $state(0);
	let toastText = $state('');
	let confirmClose = $state<(() => void) | null>(null);
	const path = $derived(barePath(page.url));
	const pending = $derived(pendingSyncCount());
	const locale = $derived(appLocale.current);
	const branchOptions = $derived(demo.staffBranches().map((item) => ({ value: item.id, label: label(item.name) })));

	/** Wire before children render so message helpers track reactive locale (smooth EN↔KH). */
	if (typeof window !== 'undefined') {
		appLocale.wireClient();
	}

	onMount(() => {
		appLocale.wireClient();
		const stopInk = installFieldInkWave(document);
		// Header shows hour:minute only — avoid re-rendering the whole app every second.
		const timer = setInterval(() => (now = new Date()), 30000);
		return () => {
			stopInk();
			clearInterval(timer);
		};
	});

	$effect(() => {
		// Stay in sync if the URL locale changes outside the language toggle.
		page.url.href;
		appLocale.syncFromEnvironment();
	});

	$effect(() => {
		const id = demo.flashId;
		const raw = demo.flashMsg;
		if (raw) {
			toastId = id;
			toastText = raw === 'storage_full' ? msg(m.storage_full) : raw;
			toastPhase = 'in';
			return;
		}
		if (toastPhase === 'in') toastPhase = 'out';
	});

	$effect(() => {
		if (toastPhase !== 'out') return;
		const ms = motionMs(250);
		const timer = window.setTimeout(() => {
			toastPhase = 'hidden';
		}, ms);
		return () => clearTimeout(timer);
	});

	function active(target: string) {
		if (target === '/') return path === '/';
		return path === target || path.startsWith(`${target}/`);
	}

	const links = $derived([
		{ href: '/', label: msg(m.nav_pos), icon: ShoppingCart },
		{ href: '/orders', label: msg(m.nav_orders), icon: ClipboardList },
		{ href: '/kitchen', label: msg(m.nav_kitchen), icon: ChefHat },
		{ href: '/products', label: msg(m.nav_products), icon: Coffee },
		{ href: '/categories', label: msg(m.nav_categories), icon: Layers },
		{ href: '/modifiers', label: msg(m.nav_modifiers), icon: SlidersHorizontal },
		{ href: '/customers', label: msg(m.nav_customers), icon: Users },
		{ href: '/reports', label: msg(m.nav_reports), icon: BarChart3 },
		{ href: '/shifts', label: msg(m.nav_shifts), icon: Wallet },
		{ href: '/money', label: msg(m.nav_money), icon: Banknote },
		{ href: '/staff', label: msg(m.nav_staff), icon: UserRound },
		{ href: '/settings', label: msg(m.nav_settings), icon: Settings }
	]);

	const staffName = $derived(label(demo.staff.name));
	const staffInitials = $derived.by(() => {
		const parts = staffName.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
	});
</script>

<div class="flex h-dvh overflow-hidden bg-page text-ink">
	{#if menuOpen}
		<button class="ui-overlay fixed inset-0 z-30 bg-ink/40 xl:hidden" type="button" aria-label={msg(m.close)} onclick={() => (menuOpen = false)}></button>
	{/if}
	<aside
		class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-white transition-transform duration-200 ease-out xl:static xl:w-72 xl:translate-x-0 motion-reduce:transition-none {menuOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<div class="flex items-center gap-3 px-4 py-4">
			<div class="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand-700">
				<Coffee size={22} />
			</div>
			<div class="min-w-0">
				<p class="truncate text-base font-bold leading-normal">{msg(m.logo)}</p>
				<p class="truncate text-xs leading-normal text-white/70">{label(demo.state.settings.tagline)}</p>
			</div>
		</div>
		<nav class="min-h-0 flex-1 space-y-0.5 overflow-auto px-3 pb-2">
			{#each links as link (link.href)}
				{@const Icon = link.icon}
				{@const on = active(link.href)}
				<a
					href={href(link.href)}
					class="nav-link flex items-center gap-2.5 rounded px-2.5 text-sm {on ? 'bg-brand-700 font-semibold text-white' : 'font-medium text-white/90 hover:bg-white/10'}"
					onclick={() => (menuOpen = false)}
				>
					<span class="grid h-7 w-7 shrink-0 place-items-center rounded {on ? 'bg-white text-brand-700' : ''}">
						<Icon size={16} />
					</span>
					<span class="leading-normal">{link.label}</span>
				</a>
			{/each}
		</nav>
		<div class="shrink-0 space-y-2 border-t border-white/10 px-3 py-3">
			<div class="flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2">
				<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{staffInitials}</span>
				<span class="min-w-0 flex-1 text-left">
					<span class="block truncate text-sm font-semibold leading-normal">{staffName}</span>
					<span class="block truncate text-xs font-medium leading-normal text-white/70">{demo.role ? label(demo.role.name) : ''}</span>
				</span>
			</div>
			<div class="grid grid-cols-2 gap-1.5">
				<button
					class="btn btn-sm border-0 bg-white/10 text-white hover:bg-white/15"
					type="button"
					title={msg(m.login_lock)}
					onclick={() => {
						demo.logout();
						void goto(href('/login'));
					}}
				>
					{msg(m.login_lock)}
				</button>
				<button
					class="btn btn-sm border-0 bg-white/10 text-white hover:bg-white/15"
					type="button"
					title={msg(m.login_switch_user)}
					onclick={() => {
						demo.logout();
						void goto(href('/login'));
					}}
				>
					{msg(m.login_switch_user)}
				</button>
			</div>
		</div>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3">
			<button class="btn btn-secondary btn-sm px-2.5 xl:hidden" type="button" aria-label={msg(m.nav_pos)} onclick={() => (menuOpen = !menuOpen)}>
				{#if menuOpen}<X size={18} />{:else}<Menu size={18} />{/if}
			</button>
			<SelectMenu
				id="branch"
				class="w-40 shrink-0 xl:w-48"
				ariaLabel={msg(m.branch)}
				value={demo.state.activeBranchId}
				options={branchOptions}
				onchange={(id) => demo.setBranch(id)}
			/>
			<p class="num hidden truncate text-xs text-muted min-[1400px]:block">
				{now.toLocaleString(locale === 'kh' ? 'km-KH' : 'en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', numberingSystem: 'latn' })}
			</p>
			<div class="ml-auto flex min-w-0 items-center gap-1.5">
				<div class="inline-flex shrink-0 rounded border border-line bg-white p-0.5">
					<button
						class="h-8 cursor-pointer rounded px-2.5 text-xs font-bold {locale === 'en' ? 'bg-brand-700 text-white' : 'text-muted hover:bg-brand-50'}"
						type="button"
						aria-pressed={locale === 'en'}
						onclick={() => appLocale.set('en')}
					>EN</button>
					<button
						class="h-8 cursor-pointer rounded px-2.5 text-xs font-bold {locale === 'kh' ? 'bg-brand-700 text-white' : 'text-muted hover:bg-brand-50'}"
						type="button"
						aria-pressed={locale === 'kh'}
						onclick={() => appLocale.set('kh')}
					>ខ្មែរ</button>
				</div>
				<button
					class="btn btn-secondary btn-sm shrink-0"
					type="button"
					title={msg(m.open_customer_screen)}
					aria-label={msg(m.open_customer_screen)}
					onclick={() => demo.openCustomerScreen()}
				>
					<MonitorSmartphone size={15} />
					<span class="hidden min-[1400px]:inline">{msg(m.open_customer_screen)}</span>
				</button>
				<button
					class="btn btn-sm shrink-0 {demo.state.demoLink === 'online' ? 'btn-secondary' : 'bg-warning text-white'}"
					type="button"
					title={msg(m.toggle_offline)}
					onclick={() => demo.setLink(demo.state.demoLink === 'online' ? 'offline' : 'online')}
				>
					{demo.state.demoLink === 'online' ? msg(m.link_online) : msg(m.link_offline)}
				</button>
				<a class="btn btn-secondary btn-sm shrink-0" href={href('/sync')} title={pending > 0 ? `${msg(m.sync_pending)} (${pending})` : msg(m.sync_badge_synced)}>
					<RefreshCw size={15} />
					<span class="hidden min-[1400px]:inline">{pending > 0 ? msg(m.sync_pending) : msg(m.sync_badge_synced)}</span>
					{#if pending > 0}<span class="badge badge-warn">{pending}</span>{/if}
				</a>
			</div>
		</header>
		{#if demo.restoredNotice}
			<div class="flex items-start justify-between gap-3 bg-warning/15 px-4 py-2 text-sm text-warning">
				<p>{msg(m.restored_notice)}</p>
				<button
					class="shrink-0 font-semibold underline decoration-warning/50 underline-offset-2 hover:decoration-warning"
					type="button"
					onclick={() => (demo.restoredNotice = false)}
				>
					{msg(m.close)}
				</button>
			</div>
		{/if}
		<main class="min-h-0 flex-1 overflow-hidden">
			{@render children()}
		</main>
	</div>
</div>

{#if toastPhase !== 'hidden'}
	{#key toastId}
		<div
			class="ui-toast"
			class:is-in={toastPhase === 'in'}
			class:is-out={toastPhase === 'out'}
			role="status"
			aria-live="polite"
		>
			{toastText}
		</div>
	{/key}
{/if}

{#if demo.confirm}
	{@const confirm = demo.confirm}
	<Dialog alert title={confirm.title} onclose={() => demo.dismissConfirm()} bind:close={confirmClose}>
		<p class="text-sm text-muted">{confirm.body}</p>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => confirmClose?.()}>{msg(m.cancel)}</button>
				<button class="btn {confirm.danger ? 'btn-danger' : 'btn-primary'}" type="button" onclick={() => demo.acceptConfirm()}>
					{confirm.confirmLabel}
				</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
