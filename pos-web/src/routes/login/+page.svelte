<script lang="ts">
	import { goto } from '$app/navigation';
	import { href, label } from '$lib/i18n/label';
	import { appLocale } from '$lib/i18n/locale.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import * as m from '$paraglide/messages';
	import { Coffee, Delete } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let selectedId = $state<string | null>(null);
	let pin = $state('');
	let error = $state('');
	let shake = $state(false);
	let featureIndex = $state(0);

	const locale = $derived(appLocale.current);
	const staff = $derived(demo.state.staff.filter((person) => person.active));
	const selected = $derived(staff.find((person) => person.id === selectedId) ?? null);
	const shop = $derived(label(demo.state.settings.shopName));
	const tagline = $derived(label(demo.state.settings.tagline));
	const features = $derived([m.login_power_checkout(), m.login_power_money(), m.login_power_kitchen()]);
	const feature = $derived(features[featureIndex % features.length] ?? '');

	onMount(() => {
		appLocale.wireClient();
		if (demo.loggedIn) void goto(href('/'), { replaceState: true });
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;
		const timer = window.setInterval(() => {
			featureIndex = (featureIndex + 1) % 3;
		}, 4200);
		return () => clearInterval(timer);
	});

	function initials(name: string) {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (!parts.length) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
	}

	function roleName(roleId: string) {
		return label(demo.state.roles.find((role) => role.id === roleId)?.name);
	}

	function pickStaff(id: string) {
		selectedId = id;
		pin = '';
		error = '';
	}

	function press(digit: string) {
		if (pin.length >= 4) return;
		pin += digit;
		error = '';
		if (!selectedId) return;
		if (pin.length === 4) tryLogin();
	}

	function backspace() {
		pin = pin.slice(0, -1);
		error = '';
	}

	function clearPin() {
		pin = '';
		error = '';
	}

	function tryLogin() {
		if (!selectedId) {
			error = m.login_pick_staff();
			return;
		}
		const result = demo.login(selectedId, pin);
		if (!result.ok) {
			error = result.code === 'pin' ? m.login_wrong_pin() : m.login_pick_staff();
			pin = '';
			shake = true;
			window.setTimeout(() => (shake = false), 420);
			return;
		}
		demo.flash(`${m.login_welcome()}, ${label(demo.staff.name)}`);
		void goto(href('/'), { replaceState: true });
	}

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;
</script>

<div class="login-screen">
	<section class="login-brand">
		<div class="login-lang">
			<button
				class="login-lang-btn"
				class:on={locale === 'en'}
				type="button"
				onclick={() => appLocale.set('en')}>EN</button
			>
			<button
				class="login-lang-btn"
				class:on={locale === 'kh'}
				type="button"
				onclick={() => appLocale.set('kh')}>ខ្មែរ</button
			>
		</div>

		<div class="login-brand-inner">
			<div class="login-mark" aria-hidden="true">
				<Coffee size={36} />
			</div>
			<p class="login-kicker">{m.logo()}</p>
			<h1 class="login-shop">{shop}</h1>
			{#if tagline}
				<p class="login-tag">{tagline}</p>
			{/if}

			<div class="login-art" aria-hidden="true">
				<svg class="login-svg" viewBox="0 0 560 360" fill="none" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<linearGradient id="posGlass" x1="80" y1="40" x2="320" y2="320" gradientUnits="userSpaceOnUse">
							<stop stop-color="#1a9a52" />
							<stop offset="1" stop-color="#0b5c34" />
						</linearGradient>
						<linearGradient id="posScreen" x1="120" y1="70" x2="300" y2="260" gradientUnits="userSpaceOnUse">
							<stop stop-color="#eaf6ee" />
							<stop offset="1" stop-color="#c8edd4" />
						</linearGradient>
						<filter id="posSoft" x="-20%" y="-20%" width="140%" height="140%">
							<feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#012214" flood-opacity="0.35" />
						</filter>
					</defs>

					<!-- ambient orbs -->
					<circle class="orb orb-a" cx="460" cy="70" r="54" fill="#20b45a" opacity="0.18" />
					<circle class="orb orb-b" cx="70" cy="290" r="70" fill="#9be4b6" opacity="0.12" />

					<!-- counter desk -->
					<path
						d="M40 292h480c8 0 14 6 14 14v18H26v-18c0-8 6-14 14-14Z"
						fill="#0a4a2a"
						opacity="0.9"
					/>
					<path d="M54 292h452v8H54Z" fill="#20b45a" opacity="0.35" />

					<!-- POS terminal -->
					<g class="terminal" filter="url(#posSoft)">
						<rect x="96" y="58" width="230" height="176" rx="22" fill="url(#posGlass)" />
						<rect x="112" y="74" width="198" height="128" rx="12" fill="url(#posScreen)" />
						<!-- menu rows -->
						<rect class="row row-1" x="128" y="92" width="120" height="14" rx="7" fill="#07883f" opacity="0.55" />
						<rect class="row row-2" x="128" y="116" width="148" height="14" rx="7" fill="#07883f" opacity="0.4" />
						<rect class="row row-3" x="128" y="140" width="96" height="14" rx="7" fill="#07883f" opacity="0.32" />
						<!-- total chip -->
						<rect class="total-chip" x="128" y="168" width="110" height="22" rx="11" fill="#075c35" />
						<text x="146" y="183" fill="#eaf6ee" font-size="12" font-weight="700" font-family="ui-sans-serif, system-ui">$12.50</text>
						<!-- paid flash -->
						<g class="paid-badge">
							<circle cx="278" cy="102" r="18" fill="#20b45a" />
							<path d="M270 102.5l5.2 5.2 10.5-11" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
						</g>
						<!-- stand -->
						<path d="M178 234h66l10 28H168l10-28Z" fill="#064528" />
						<rect x="156" y="260" width="110" height="12" rx="6" fill="#0a4a2a" />
					</g>

					<!-- KHQR card -->
					<g class="qr-card" filter="url(#posSoft)">
						<rect x="360" y="96" width="132" height="148" rx="18" fill="#ffffff" />
						<rect x="382" y="118" width="88" height="88" rx="8" fill="#122018" />
						<rect class="qr-scan" x="382" y="118" width="88" height="8" fill="#20b45a" opacity="0.85" />
						<rect x="392" y="128" width="22" height="22" rx="3" fill="#eaf6ee" />
						<rect x="438" y="128" width="22" height="22" rx="3" fill="#eaf6ee" />
						<rect x="392" y="174" width="22" height="22" rx="3" fill="#eaf6ee" />
						<rect x="420" y="156" width="28" height="28" rx="3" fill="#9be4b6" />
						<text x="426" y="228" text-anchor="middle" fill="#075c35" font-size="11" font-weight="800" font-family="ui-sans-serif, system-ui">KHQR</text>
					</g>

					<!-- waiting ticket -->
					<g class="ticket" filter="url(#posSoft)">
						<rect x="348" y="250" width="118" height="64" rx="14" fill="#0f6a3b" />
						<text x="366" y="274" fill="#9be4b6" font-size="10" font-weight="700" letter-spacing="1.5" font-family="ui-sans-serif, system-ui">QUEUE</text>
						<text class="ticket-num" x="366" y="298" fill="#ffffff" font-size="22" font-weight="800" font-family="ui-monospace, monospace">07</text>
						<circle class="ticket-pulse" cx="440" cy="282" r="8" fill="#20b45a" />
					</g>

					<!-- rising sales bars -->
					<g class="bars">
						<rect class="bar b1" x="48" y="210" width="16" height="48" rx="6" fill="#20b45a" opacity="0.55" />
						<rect class="bar b2" x="70" y="188" width="16" height="70" rx="6" fill="#9be4b6" opacity="0.7" />
						<rect class="bar b3" x="92" y="168" width="16" height="90" rx="6" fill="#20b45a" opacity="0.85" />
					</g>

					<!-- steam / speed lines -->
					<path class="speed s1" d="M330 70c18-10 34-10 52 0" stroke="#9be4b6" stroke-width="3" stroke-linecap="round" opacity="0.55" />
					<path class="speed s2" d="M338 86c14-7 28-7 42 0" stroke="#20b45a" stroke-width="3" stroke-linecap="round" opacity="0.4" />
				</svg>
			</div>

			<div class="login-feature" aria-live="polite">
				{#key featureIndex}
					<p class="login-feature-text">{feature}</p>
				{/key}
				<div class="login-feature-dots" aria-hidden="true">
					{#each features as _, i}
						<span class="login-feature-dot" class:on={i === featureIndex % features.length}></span>
					{/each}
				</div>
			</div>

			<p class="login-hint">{m.login_pin_hint()}</p>
		</div>
	</section>

	<section class="login-panel">
		<header class="login-panel-head">
			<h2 class="login-title">{m.login_title()}</h2>
			<p class="login-sub">{m.login_subtitle()}</p>
		</header>

		<div class="login-staff" role="list">
			{#each staff as person (person.id)}
				<button
					class="login-staff-card"
					class:selected={selectedId === person.id}
					type="button"
					role="listitem"
					onclick={() => pickStaff(person.id)}
				>
					<span class="login-avatar">{initials(label(person.name))}</span>
					<span class="login-staff-meta">
						<span class="login-staff-name">{label(person.name)}</span>
						<span class="login-staff-role">{roleName(person.roleId)}</span>
					</span>
				</button>
			{/each}
		</div>

		<div class="login-dock">
			<div class="login-pin-block" class:shake>
				<p class="login-pin-label">{m.login_pin()}</p>
				<div class="login-dots" aria-hidden="true">
					{#each [0, 1, 2, 3] as i}
						<span class="login-dot" class:on={pin.length > i}></span>
					{/each}
				</div>
				{#if error}
					<p class="login-error">{error}</p>
				{:else if selected}
					<p class="login-selected">{label(selected.name)}</p>
				{:else}
					<p class="login-selected muted">{m.login_pick_staff()}</p>
				{/if}
			</div>

			<div class="login-pad" aria-label={m.login_pin()}>
				{#each keys as key}
					{#if key === 'clear'}
						<button class="login-key muted" type="button" onclick={clearPin}>{m.login_clear_pin()}</button>
					{:else if key === 'back'}
						<button class="login-key muted" type="button" aria-label={m.login_clear_pin()} onclick={backspace}>
							<Delete size={22} />
						</button>
					{:else}
						<button class="login-key" type="button" onclick={() => press(key)}>{key}</button>
					{/if}
				{/each}
			</div>

			<button
				class="btn btn-primary login-submit"
				type="button"
				disabled={!selectedId || pin.length < 4}
				onclick={tryLogin}
			>
				{m.login_sign_in()}
			</button>
		</div>
	</section>
</div>

<style>
	.login-screen {
		display: grid;
		height: 100dvh;
		min-height: 100dvh;
		grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
		overflow: hidden;
		background:
			radial-gradient(ellipse 70% 55% at 15% 10%, rgba(32, 180, 90, 0.28), transparent 55%),
			radial-gradient(ellipse 50% 40% at 90% 90%, rgba(7, 92, 53, 0.45), transparent 50%),
			linear-gradient(145deg, #064528 0%, #0a3d24 45%, #052818 100%);
		color: #fff;
	}

	.login-brand {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 2.5rem clamp(1.35rem, 3.5vw, 3.5rem) 2rem;
		overflow: hidden;
	}

	.login-brand-inner {
		position: relative;
		z-index: 1;
		max-width: 34rem;
	}

	.login-mark {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		border-radius: 1rem;
		background: linear-gradient(135deg, #20b45a, #07883f);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
		margin-bottom: 1rem;
		animation: mark-float 4.5s ease-in-out infinite;
	}

	.login-kicker {
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #9be4b6;
	}

	.login-shop {
		margin-top: 0.45rem;
		font-size: clamp(2.2rem, 4.6vw, 3.4rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1.05;
	}

	.login-tag {
		margin-top: 0.65rem;
		font-size: 1.05rem;
		color: rgba(255, 255, 255, 0.7);
		max-width: 24rem;
		line-height: 1.45;
	}

	.login-art {
		margin-top: 1.35rem;
		width: min(100%, 34rem);
	}

	.login-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.orb-a {
		animation: orb-drift 9s ease-in-out infinite;
	}

	.orb-b {
		animation: orb-drift 11s ease-in-out infinite reverse;
	}

	.terminal {
		transform-origin: 210px 230px;
		animation: terminal-breathe 5.5s ease-in-out infinite;
	}

	.row-1 {
		animation: row-in 3.6s ease-in-out infinite;
	}

	.row-2 {
		animation: row-in 3.6s ease-in-out infinite 0.25s;
	}

	.row-3 {
		animation: row-in 3.6s ease-in-out infinite 0.5s;
	}

	.total-chip {
		animation: chip-pop 3.6s ease-in-out infinite 0.8s;
	}

	.paid-badge {
		transform-origin: 278px 102px;
		animation: paid-pop 3.6s ease-in-out infinite 1.4s;
	}

	.qr-card {
		transform-origin: 426px 170px;
		animation: qr-float 4.8s ease-in-out infinite;
	}

	.qr-scan {
		animation: qr-scan 2.4s linear infinite;
	}

	.ticket {
		animation: ticket-slide 5.2s ease-in-out infinite;
	}

	.ticket-pulse {
		animation: pulse-dot 1.6s ease-in-out infinite;
	}

	.bar {
		transform-box: fill-box;
		transform-origin: bottom;
	}

	.b1 {
		animation: bar-grow 3.2s ease-in-out infinite;
	}

	.b2 {
		animation: bar-grow 3.2s ease-in-out infinite 0.2s;
	}

	.b3 {
		animation: bar-grow 3.2s ease-in-out infinite 0.4s;
	}

	.speed {
		animation: speed-dash 2.8s ease-in-out infinite;
	}

	.s2 {
		animation-delay: 0.35s;
	}

	.login-feature {
		margin-top: 0.85rem;
		min-height: 3.1rem;
	}

	.login-feature-text {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		color: #c8f0d6;
		animation: feature-in 0.55s ease;
	}

	.login-feature-dots {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.55rem;
	}

	.login-feature-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.28);
		transition:
			width 0.25s ease,
			background 0.25s ease;
	}

	.login-feature-dot.on {
		width: 1.15rem;
		background: #9be4b6;
	}

	.login-hint {
		margin-top: 1.1rem;
		display: inline-block;
		padding: 0.45rem 0.75rem;
		border-radius: 0.65rem;
		font-size: 0.85rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.75);
	}

	@keyframes mark-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	@keyframes orb-drift {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(12px, -10px);
		}
	}

	@keyframes terminal-breathe {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	@keyframes row-in {
		0%,
		12% {
			opacity: 0.15;
			transform: translateX(-8px);
		}
		28%,
		70% {
			opacity: 0.7;
			transform: translateX(0);
		}
		88%,
		100% {
			opacity: 0.2;
		}
	}

	@keyframes chip-pop {
		0%,
		35% {
			opacity: 0.25;
			transform: scale(0.92);
		}
		50%,
		78% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0.35;
		}
	}

	@keyframes paid-pop {
		0%,
		45% {
			opacity: 0;
			transform: scale(0.4);
		}
		58%,
		82% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.8);
		}
	}

	@keyframes qr-float {
		0%,
		100% {
			transform: translateY(0) rotate(-1.5deg);
		}
		50% {
			transform: translateY(-8px) rotate(1deg);
		}
	}

	@keyframes qr-scan {
		0% {
			transform: translateY(0);
			opacity: 0.2;
		}
		15% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(80px);
			opacity: 0.15;
		}
	}

	@keyframes ticket-slide {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(8px);
		}
	}

	@keyframes pulse-dot {
		0%,
		100% {
			opacity: 0.45;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1.15);
		}
	}

	@keyframes bar-grow {
		0%,
		100% {
			transform: scaleY(0.45);
		}
		50% {
			transform: scaleY(1);
		}
	}

	@keyframes speed-dash {
		0%,
		100% {
			opacity: 0.15;
			stroke-dashoffset: 24;
		}
		50% {
			opacity: 0.7;
			stroke-dashoffset: 0;
		}
	}

	@keyframes feature-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.login-mark,
		.orb-a,
		.orb-b,
		.terminal,
		.row-1,
		.row-2,
		.row-3,
		.total-chip,
		.paid-badge,
		.qr-card,
		.qr-scan,
		.ticket,
		.ticket-pulse,
		.b1,
		.b2,
		.b3,
		.speed,
		.login-feature-text {
			animation: none !important;
		}
	}

	.login-lang {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.2rem;
		border-radius: 0.55rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.login-lang-btn {
		height: 2rem;
		padding: 0 0.7rem;
		border-radius: 0.4rem;
		border: 0;
		background: transparent;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.75rem;
		font-weight: 800;
		cursor: pointer;
	}

	.login-lang-btn.on {
		background: #fff;
		color: #075c35;
	}

	.login-panel {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		min-height: 0;
		padding: 1.5rem 1.35rem 0;
		background: rgba(255, 255, 255, 0.97);
		color: #122018;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.login-panel-head {
		flex-shrink: 0;
		margin-bottom: 0.85rem;
	}

	.login-title {
		font-size: 1.55rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.login-sub {
		margin-top: 0.25rem;
		font-size: 0.92rem;
		color: #5b6b62;
	}

	.login-staff {
		display: grid;
		grid-template-columns: 1fr;
		align-content: start;
		gap: 0.55rem;
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
		padding-right: 0.15rem;
		padding-bottom: 0.75rem;
	}

	.login-dock {
		flex-shrink: 0;
		margin-top: auto;
		padding: 0.85rem 0 1.25rem;
		border-top: 1px solid #e7eee8;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, #fff 28%);
	}

	.login-staff-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.7rem 0.8rem;
		border-radius: 0.85rem;
		border: 1px solid #dce5de;
		background: #fff;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			background 0.15s ease;
	}

	.login-staff-card:hover {
		border-color: #20b45a;
	}

	.login-staff-card.selected {
		border-color: #07883f;
		background: #f3faf5;
		box-shadow: 0 0 0 1px rgba(7, 136, 63, 0.25);
	}

	.login-avatar {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		background: #075c35;
		color: #fff;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.login-staff-meta {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.login-staff-name {
		font-size: 0.95rem;
		font-weight: 700;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.login-staff-role {
		font-size: 0.78rem;
		color: #5b6b62;
	}

	.login-pin-block {
		margin-top: 0.15rem;
		text-align: center;
	}

	.login-pin-block.shake {
		animation: login-shake 0.4s ease;
	}

	.login-pin-label {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #5b6b62;
	}

	.login-dots {
		display: flex;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 0.65rem;
	}

	.login-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		border: 2px solid #c5d2c9;
		background: transparent;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			opacity 0.12s ease;
	}

	.login-dot.on {
		background: #07883f;
		border-color: #07883f;
	}

	.login-error {
		margin-top: 0.55rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: #b42318;
	}

	.login-selected {
		margin-top: 0.45rem;
		font-size: 0.88rem;
		font-weight: 600;
		color: #075c35;
	}

	.login-selected.muted {
		color: #5b6b62;
		font-weight: 500;
	}

	.login-pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.55rem;
		margin-top: 0.85rem;
	}

	.login-key {
		display: grid;
		place-items: center;
		height: 3.35rem;
		border-radius: 0.85rem;
		border: 1px solid #dce5de;
		background: #fff;
		font-size: 1.35rem;
		font-weight: 700;
		color: #122018;
		cursor: pointer;
		transition:
			background 0.12s ease,
			border-color 0.12s ease;
	}

	.login-key:hover {
		background: #f3faf5;
		border-color: #20b45a;
	}

	.login-key:active {
		background: #eaf6ee;
	}

	.login-key.muted {
		font-size: 0.85rem;
		font-weight: 700;
		color: #5b6b62;
	}

	.login-submit {
		margin-top: 0.85rem;
		width: 100%;
		height: 3rem;
		font-size: 1rem;
	}

	@keyframes login-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(6px);
		}
	}

	@media (max-width: 900px) {
		.login-screen {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(0, 1fr);
			height: 100dvh;
			overflow: hidden;
		}

		.login-brand {
			min-height: auto;
			max-height: 38dvh;
			overflow: auto;
			padding: 1.35rem 1.15rem 0.75rem;
		}

		.login-shop {
			font-size: 1.85rem;
		}

		.login-art {
			margin-top: 0.85rem;
			max-width: 22rem;
		}

		.login-feature {
			min-height: 2.6rem;
		}

		.login-feature-text {
			font-size: 0.92rem;
		}

		.login-panel {
			height: auto;
			min-height: 0;
			border-left: 0;
			border-radius: 1.25rem 1.25rem 0 0;
			flex: 1;
		}

		.login-lang {
			top: 0.85rem;
			right: 0.85rem;
		}
	}
</style>
