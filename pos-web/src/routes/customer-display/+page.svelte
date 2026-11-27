<script lang="ts">
	import { subscribeCds, type CdsAd, type CdsPayload } from '$lib/cds/channel';
	import { formatKhr, formatUsd } from '$lib/domain/money';
	import { appLocale } from '$lib/i18n/locale.svelte';
	import * as m from '$paraglide/messages';
	import { onMount } from 'svelte';

	let payload = $state<CdsPayload | null>(null);
	let adIndex = $state(0);
	let clock = $state('');
	const locale = $derived(appLocale.current);

	onMount(() => {
		appLocale.wireClient();
		document.documentElement.classList.add('cds-lock');
		const tick = () => {
			clock = new Date().toLocaleTimeString(locale === 'kh' ? 'km-KH' : 'en-US', {
				hour: '2-digit',
				minute: '2-digit'
			});
		};
		tick();
		const clockId = setInterval(tick, 15_000);
		const unsub = subscribeCds((next) => {
			payload = {
				...next,
				lines: next.lines ?? [],
				queuePreparing: next.queuePreparing ?? [],
				queueReady: next.queueReady ?? [],
				waitingNumber: next.waitingNumber ?? '',
				orderNumber: next.orderNumber ?? '',
				ads: next.ads ?? []
			};
			if (!(payload.ads?.length) || adIndex >= (payload.ads?.length ?? 0)) adIndex = 0;
		});
		const adId = setInterval(() => {
			const ads = payload?.ads ?? [];
			if (ads.length < 2) return;
			adIndex = (adIndex + 1) % ads.length;
		}, 6_000);
		return () => {
			document.documentElement.classList.remove('cds-lock');
			unsub();
			clearInterval(clockId);
			clearInterval(adId);
		};
	});

	const shop = $derived(
		payload ? (locale === 'kh' ? payload.shopKh || payload.shopEn : payload.shopEn || payload.shopKh) : ''
	);
	const tagline = $derived(
		payload
			? locale === 'kh'
				? payload.taglineKh || payload.taglineEn
				: payload.taglineEn || payload.taglineKh
			: ''
	);
	const phase = $derived(payload?.phase ?? 'idle');
	const lines = $derived(payload?.lines ?? []);
	const ads = $derived(payload?.ads ?? []);
	const activeAd = $derived<CdsAd | null>(ads.length ? ads[adIndex % ads.length]! : null);
	const itemCount = $derived(lines.reduce((sum, line) => sum + line.qty, 0));
	const waitingLabel = $derived(payload?.waitingNumber?.trim() || '');
	const orderLabel = $derived(waitingLabel || payload?.orderNumber?.trim() || '');
	const showTicket = $derived(phase === 'cart' || phase === 'pay' || (phase === 'thanks' && lines.length > 0));
	const showKhqrPay = $derived(
		phase === 'pay' && payload?.attemptStatus === 'PENDING' && !!payload?.qrImage
	);
	const preparing = $derived(payload?.queuePreparing ?? []);
	const ready = $derived(payload?.queueReady ?? []);
	const nowReady = $derived(ready.length ? ready[ready.length - 1]! : null);
	const hasQueue = $derived(preparing.length > 0 || ready.length > 0);
	const chipLabel = $derived(
		!showTicket && nowReady
			? m.cds_now_ready()
			: waitingLabel
				? m.waiting_number()
				: m.cds_now_serving()
	);
	const chipValue = $derived(
		!showTicket && nowReady
			? nowReady.waitingNumber
			: orderLabel
				? orderLabel
				: showTicket
					? '—'
					: m.cds_queue_ready()
	);

	function adTitle(ad: CdsAd) {
		return locale === 'kh' ? ad.titleKh || ad.titleEn : ad.titleEn || ad.titleKh;
	}

	function adSubtitle(ad: CdsAd) {
		return locale === 'kh'
			? ad.subtitleKh || ad.subtitleEn || ''
			: ad.subtitleEn || ad.subtitleKh || '';
	}

	function lineName(line: (typeof lines)[number]) {
		return locale === 'kh' ? line.nameKh || line.nameEn : line.nameEn || line.nameKh;
	}

	function lineMods(line: (typeof lines)[number]) {
		return locale === 'kh' ? line.modifiersKh || line.modifiers : line.modifiers;
	}
</script>

<div class="cds-screen">
	<header class="cds-top">
		<div class="cds-brand">
			{#if payload?.logoUrl}
				<img class="cds-logo" src={payload.logoUrl} alt="" />
			{:else}
				<span class="cds-mark" aria-hidden="true"></span>
			{/if}
			<div class="min-w-0">
				<p class="cds-shop">{shop || m.logo()}</p>
				{#if tagline}
					<p class="cds-tag">{tagline}</p>
				{/if}
			</div>
		</div>
		<div class="cds-queue-chip" class:active={!!orderLabel || showTicket || !!nowReady} class:ready={!!nowReady && !showTicket}>
			<p class="cds-queue-label">{chipLabel}</p>
			<p class="cds-queue-num num">{chipValue}</p>
			{#if !showTicket && nowReady}
				<p class="cds-queue-hint">{m.cds_collect()}</p>
			{/if}
		</div>
		<p class="cds-clock num" aria-hidden="true">{clock}</p>
	</header>

	{#if showKhqrPay && payload}
		<section class="cds-khqr-stage cds-khqr-full" aria-label={m.scan_khqr()}>
			<div class="cds-khqr-frame">
				<img
					class="cds-khqr-img"
					src={payload.qrImage}
					alt="ABA KHQR"
					decoding="sync"
					fetchpriority="high"
					draggable="false"
				/>
			</div>
			<p class="cds-khqr-status">
				<span class="cds-khqr-dot" aria-hidden="true"></span>
				{m.cds_waiting_qr()}
				<span class="num cds-khqr-usd">{formatUsd(payload.total)}</span>
				<span class="num cds-khqr-khr">{formatKhr(payload.totalKhr)}</span>
			</p>
		</section>
	{:else}
	<div class="cds-body">
			<section class="cds-ads" aria-label={m.cds_promo()}>
				{#if activeAd}
					{#key activeAd.id}
						<div class="cds-ad-slide">
							<img class="cds-ad-img" src={activeAd.imageUrl} alt="" />
							<div class="cds-ad-shade"></div>
							<div class="cds-ad-copy">
								<p class="cds-ad-kicker">{m.cds_promo()}</p>
								<h2 class="cds-ad-title">{adTitle(activeAd)}</h2>
								{#if adSubtitle(activeAd)}
									<p class="cds-ad-sub">{adSubtitle(activeAd)}</p>
								{/if}
							</div>
						</div>
					{/key}
					{#if ads.length > 1}
						<div class="cds-ad-dots" aria-hidden="true">
							{#each ads as ad, i (ad.id)}
								<span class="cds-dot" class:on={i === adIndex % ads.length}></span>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="cds-ad-empty">
						<p class="cds-ad-kicker">{m.cds_promo()}</p>
						<p class="text-2xl font-semibold text-white/85">{shop || m.logo()}</p>
						{#if tagline}
							<p class="mt-2 text-base text-white/55">{tagline}</p>
						{/if}
					</div>
				{/if}
			</section>

		<section class="cds-ticket">
			{#if phase === 'idle' || (!showTicket && phase !== 'thanks')}
				{#if hasQueue}
					<div class="cds-board">
						<p class="cds-board-title">{m.cds_queue_board()}</p>
						<div class="cds-board-cols">
							<div class="cds-board-col">
								<p class="cds-board-head preparing">{m.cds_preparing()}</p>
								{#if preparing.length}
									<div class="cds-board-nums">
										{#each preparing as item (item.id)}
											<span class="cds-tile preparing num">{item.waitingNumber}</span>
										{/each}
									</div>
								{:else}
									<p class="cds-board-empty">—</p>
								{/if}
							</div>
							<div class="cds-board-col ready-col">
								<p class="cds-board-head ready">{m.cds_ready()}</p>
								{#if ready.length}
									<div class="cds-board-nums">
										{#each ready as item (item.id)}
											<span class="cds-tile ready num" class:pulse={nowReady?.id === item.id}>{item.waitingNumber}</span>
										{/each}
									</div>
								{:else}
									<p class="cds-board-empty">—</p>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="cds-idle">
						<p class="cds-idle-title">{m.cds_idle()}</p>
						<p class="cds-idle-hint">{m.cds_idle_hint()}</p>
						<div class="cds-idle-pulse" aria-hidden="true"></div>
					</div>
				{/if}
			{:else if phase === 'thanks'}
				<div class="cds-thanks">
					<p class="cds-thanks-title">{m.cds_thanks()}</p>
					<p class="cds-thanks-sub">{m.cds_thanks_sub()}</p>
					{#if payload}
						<p class="num cds-thanks-total">{formatUsd(payload.total)}</p>
						<p class="num cds-thanks-khr">{formatKhr(payload.totalKhr)}</p>
					{/if}
					{#if waitingLabel}
						<p class="cds-thanks-order">{m.waiting_number()} {waitingLabel}</p>
					{:else if orderLabel}
						<p class="cds-thanks-order">{orderLabel}</p>
					{/if}
				</div>
			{:else}
				<div class="cds-ticket-head">
					<div>
						<p class="cds-ticket-label">{waitingLabel ? m.waiting_ticket() : m.cds_your_order()}</p>
						{#if orderLabel}
							<p class="cds-ticket-order num">{orderLabel}</p>
						{/if}
					</div>
					<p class="cds-ticket-count num">{itemCount} {m.cds_items()}</p>
				</div>

				<ul class="cds-lines">
					{#each lines as line (line.id)}
						<li class="cds-line">
							{#if line.imageUrl}
								<img class="cds-line-thumb" src={line.imageUrl} alt="" />
							{:else}
								<span class="cds-line-thumb placeholder"></span>
							{/if}
							<div class="cds-line-body">
								<p class="cds-line-name">
									<span class="num cds-line-qty">{line.qty}×</span>
									{lineName(line)}
								</p>
								{#if lineMods(line)}
									<p class="cds-line-mod">{lineMods(line)}</p>
								{/if}
								{#if line.note}
									<p class="cds-line-note">“{line.note}”</p>
								{/if}
							</div>
							<p class="num cds-line-price">{formatUsd(line.lineTotal)}</p>
						</li>
					{/each}
				</ul>

				<div class="cds-totals" class:pay={phase === 'pay' && !showKhqrPay}>
					{#if payload && payload.discount > 0}
						<div class="cds-row muted">
							<span>{m.discount()}</span>
							<span class="num">−{formatUsd(payload.discount)}</span>
						</div>
					{/if}
					{#if payload && payload.tax > 0 && !showKhqrPay}
						<div class="cds-row muted">
							<span>{m.tax()}</span>
							<span class="num">{formatUsd(payload.tax)}</span>
						</div>
					{/if}
					<div class="cds-row total">
						<span>{m.total()}</span>
						<span class="text-right">
							<span class="num cds-total-usd">{formatUsd(payload?.total ?? 0)}</span>
							<span class="num cds-total-khr">{formatKhr(payload?.totalKhr ?? 0)}</span>
						</span>
					</div>
					{#if phase === 'pay' && !showKhqrPay}
						<div class="cds-pay-banner">
							<p class="cds-pay-title">{m.cds_pay_now()}</p>
							<p class="cds-pay-sub">{m.cds_please_pay()}</p>
							{#if payload?.attemptStatus === 'PENDING'}
								<p class="cds-pay-wait">{m.cds_waiting_qr()} {payload.attemptLabel ?? ''}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</section>
	</div>
	{/if}

	<footer class="cds-queue-bar" class:khqr-hide={showKhqrPay} aria-label={m.cds_queue_board()}>
		<div class="cds-queue-lane preparing">
			<p class="cds-lane-label">{m.cds_preparing()}</p>
			<div class="cds-lane-nums">
				{#if preparing.length}
					{#each preparing as item (item.id)}
						<span class="cds-pill preparing num">{item.waitingNumber}</span>
					{/each}
				{:else}
					<span class="cds-lane-empty">{m.cds_queue_empty()}</span>
				{/if}
			</div>
		</div>
		<div class="cds-queue-lane ready">
			<p class="cds-lane-label">{m.cds_ready()}</p>
			<div class="cds-lane-nums">
				{#if ready.length}
					{#each ready as item (item.id)}
						<span class="cds-pill ready num" class:pulse={nowReady?.id === item.id}>{item.waitingNumber}</span>
					{/each}
				{:else}
					<span class="cds-lane-empty">—</span>
				{/if}
			</div>
		</div>
	</footer>
</div>

<style>
	:global(html.cds-lock),
	:global(html.cds-lock body) {
		height: 100%;
		overflow: hidden;
	}

	.cds-screen {
		display: flex;
		height: 100dvh;
		max-height: 100dvh;
		flex-direction: column;
		background:
			radial-gradient(ellipse 80% 60% at 10% 0%, rgba(32, 180, 90, 0.28), transparent 55%),
			radial-gradient(ellipse 70% 50% at 100% 100%, rgba(7, 92, 53, 0.55), transparent 50%),
			linear-gradient(145deg, #064528 0%, #0a3d24 42%, #052818 100%);
		color: #fff;
		overflow: hidden;
	}

	.cds-top {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.18);
	}

	.cds-brand {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.cds-logo {
		height: 3rem;
		width: 3rem;
		border-radius: 0.65rem;
		object-fit: cover;
		background: #fff;
	}

	.cds-mark {
		height: 3rem;
		width: 3rem;
		border-radius: 0.65rem;
		background: linear-gradient(135deg, #20b45a, #07883f);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.25);
	}

	.cds-shop {
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cds-tag {
		margin-top: 0.15rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.58);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cds-queue-chip {
		min-width: 11rem;
		padding: 0.55rem 1.1rem;
		border-radius: 0.85rem;
		text-align: center;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		transition:
			background 0.35s ease,
			border-color 0.35s ease,
			box-shadow 0.35s ease;
	}

	.cds-queue-chip.active {
		background: rgba(32, 180, 90, 0.22);
		border-color: rgba(32, 180, 90, 0.55);
		box-shadow: 0 0 0 1px rgba(32, 180, 90, 0.2);
	}

	.cds-queue-chip.ready {
		background: linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(32, 180, 90, 0.3));
		border-color: rgba(250, 204, 21, 0.65);
		animation: cds-glow 1.8s ease-in-out infinite;
	}

	.cds-queue-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.62);
	}

	.cds-queue-num {
		margin-top: 0.15rem;
		font-size: 1.55rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.cds-queue-hint {
		margin-top: 0.15rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 248, 200, 0.9);
	}

	.cds-clock {
		font-size: 1.15rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		min-width: 4.5rem;
		text-align: right;
	}

	.cds-body {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(22rem, 0.85fr);
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.cds-khqr-stage {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		gap: 0.45rem;
		min-height: 0;
		overflow: hidden;
		padding: 0.25rem 0.5rem 0.4rem;
		/* Same forest atmosphere as .cds-screen — no flat bright green */
		background:
			radial-gradient(ellipse 70% 55% at 50% 40%, rgba(32, 180, 90, 0.2), transparent 58%),
			radial-gradient(ellipse 50% 40% at 90% 85%, rgba(7, 92, 53, 0.4), transparent 55%),
			linear-gradient(145deg, #064528 0%, #0a3d24 45%, #052818 100%);
		animation: cds-fade 0.55s ease;
	}

	.cds-khqr-full {
		flex: 1 1 auto;
		height: auto;
		min-height: 0;
	}

	.cds-khqr-frame {
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		justify-content: center;
		min-height: 0;
		width: 100%;
	}

	.cds-khqr-img {
		display: block;
		/* Fill stage height — ABA frame is portrait; width follows aspect */
		height: 100%;
		width: auto;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		object-position: center;
		background: transparent;
		image-rendering: auto;
	}

	.cds-khqr-status {
		display: inline-flex;
		align-self: center;
		flex-shrink: 0;
		align-items: center;
		gap: 0.5rem 0.75rem;
		padding: 0.4rem 0.95rem;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 650;
		color: #ecf8f0;
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.cds-khqr-usd {
		margin-left: 0.35rem;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.cds-khqr-khr {
		font-size: 0.8rem;
		font-weight: 650;
		color: rgba(255, 255, 255, 0.7);
	}

	.cds-khqr-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: #20b45a;
		box-shadow: 0 0 0 0 rgba(32, 180, 90, 0.55);
		animation: cds-dot 1.4s ease-out infinite;
	}

	.cds-ads {
		position: relative;
		min-height: 0;
		overflow: hidden;
		background: #03180e;
	}

	.cds-ad-slide {
		position: absolute;
		inset: 0;
		animation: cds-fade 0.7s ease;
	}

	.cds-ad-img {
		height: 100%;
		width: 100%;
		object-fit: cover;
		transform: scale(1.04);
		animation: cds-ken 6s ease-out forwards;
	}

	.cds-ad-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(3, 24, 14, 0.15) 0%,
			rgba(3, 24, 14, 0.25) 45%,
			rgba(3, 24, 14, 0.88) 100%
		);
	}

	.cds-ad-copy {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 2rem 2.25rem 2.5rem;
	}

	.cds-ad-kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #9be4b6;
	}

	.cds-ad-title {
		margin-top: 0.4rem;
		font-size: clamp(1.75rem, 3.2vw, 2.75rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
	}

	.cds-ad-sub {
		margin-top: 0.45rem;
		max-width: 28rem;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.72);
	}

	.cds-ad-dots {
		position: absolute;
		top: 1.1rem;
		right: 1.25rem;
		display: flex;
		gap: 0.4rem;
		z-index: 2;
	}

	.cds-dot {
		height: 0.45rem;
		width: 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.35);
		transition:
			width 0.3s ease,
			background 0.3s ease;
	}

	.cds-dot.on {
		width: 1.15rem;
		background: #fff;
	}

	.cds-ad-empty {
		display: flex;
		height: 100%;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 2.5rem;
		background:
			radial-gradient(circle at 30% 20%, rgba(32, 180, 90, 0.35), transparent 45%),
			linear-gradient(160deg, #0a4a2a, #042016);
	}

	.cds-ticket {
		display: flex;
		min-height: 0;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.06);
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
	}

	.cds-ticket.compact .cds-line-thumb {
		height: 2.35rem;
		width: 2.35rem;
	}

	.cds-ticket.compact .cds-line-name {
		font-size: 0.92rem;
	}

	.cds-ticket.compact .cds-total-usd {
		font-size: clamp(1.45rem, 2.4vw, 1.85rem);
	}

	.cds-idle,
	.cds-thanks,
	.cds-board {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		padding: 1.35rem 1.25rem;
		min-height: 0;
	}

	.cds-idle,
	.cds-thanks {
		align-items: center;
		text-align: center;
		padding: 2rem;
	}

	.cds-board-title {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 0.85rem;
		text-align: center;
	}

	.cds-board-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
		flex: 1;
		min-height: 0;
	}

	.cds-board-col {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-radius: 1rem;
		padding: 0.85rem 0.75rem;
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cds-board-col.ready-col {
		background: rgba(32, 180, 90, 0.14);
		border-color: rgba(32, 180, 90, 0.35);
	}

	.cds-board-head {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.cds-board-head.preparing {
		color: rgba(255, 255, 255, 0.7);
	}

	.cds-board-head.ready {
		color: #b7f0c8;
	}

	.cds-board-nums {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		justify-content: center;
		align-content: flex-start;
		overflow: auto;
		flex: 1;
	}

	.cds-tile {
		display: grid;
		place-items: center;
		min-width: 3.4rem;
		height: 3.4rem;
		padding: 0 0.55rem;
		border-radius: 0.75rem;
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.cds-tile.preparing {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.14);
	}

	.cds-tile.ready {
		background: #20b45a;
		color: #fff;
		box-shadow: 0 8px 20px rgba(7, 92, 53, 0.35);
	}

	.cds-tile.ready.pulse,
	.cds-pill.ready.pulse {
		animation: cds-pop 1.4s ease-in-out infinite;
	}

	.cds-board-empty {
		text-align: center;
		color: rgba(255, 255, 255, 0.35);
		font-size: 1.25rem;
		margin-top: 1.5rem;
	}

	.cds-queue-bar {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.35);
		min-height: 5.5rem;
		flex-shrink: 0;
	}

	/* Free vertical room for a scannable KHQR */
	.cds-screen:has(.cds-khqr-full) .cds-top {
		padding: 0.45rem 1rem;
	}

	.cds-screen:has(.cds-khqr-full) .cds-logo,
	.cds-screen:has(.cds-khqr-full) .cds-mark {
		height: 2.15rem;
		width: 2.15rem;
	}

	.cds-screen:has(.cds-khqr-full) .cds-shop {
		font-size: 1.1rem;
	}

	.cds-screen:has(.cds-khqr-full) .cds-tag {
		display: none;
	}

	.cds-queue-bar.khqr-hide {
		display: none;
	}

	.cds-queue-lane {
		padding: 0.75rem 1.1rem 0.9rem;
		min-width: 0;
	}

	.cds-queue-lane.preparing {
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}

	.cds-queue-lane.ready {
		background: rgba(32, 180, 90, 0.12);
	}

	.cds-lane-label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
		margin-bottom: 0.45rem;
	}

	.cds-queue-lane.ready .cds-lane-label {
		color: #b7f0c8;
	}

	.cds-lane-nums {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		max-height: 3.6rem;
		overflow: hidden;
	}

	.cds-pill {
		display: inline-grid;
		place-items: center;
		min-width: 2.55rem;
		height: 2.35rem;
		padding: 0 0.45rem;
		border-radius: 0.55rem;
		font-size: 1.15rem;
		font-weight: 800;
	}

	.cds-pill.preparing {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.14);
	}

	.cds-pill.ready {
		background: #20b45a;
		color: #fff;
	}

	.cds-lane-empty {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.cds-idle-title,
	.cds-thanks-title {
		font-size: clamp(2rem, 3.5vw, 2.75rem);
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.cds-idle-hint,
	.cds-thanks-sub {
		margin-top: 0.75rem;
		max-width: 18rem;
		font-size: 1rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.62);
	}

	.cds-idle-pulse {
		margin-top: 2rem;
		height: 0.55rem;
		width: 5rem;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, #20b45a, transparent);
		background-size: 200% 100%;
		animation: cds-pulse 2.2s ease-in-out infinite;
	}

	.cds-thanks-total {
		margin-top: 1.75rem;
		font-size: 2.5rem;
		font-weight: 800;
		color: #c8f0d6;
	}

	.cds-thanks-khr {
		margin-top: 0.25rem;
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.cds-thanks-order {
		margin-top: 1.25rem;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.1);
	}

	.cds-ticket-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1.35rem 0.85rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.cds-ticket-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}

	.cds-ticket-order {
		margin-top: 0.2rem;
		font-size: 1.35rem;
		font-weight: 800;
	}

	.cds-ticket-count {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
		padding-top: 0.15rem;
	}

	.cds-lines {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.75rem 1.1rem;
		list-style: none;
		margin: 0;
	}

	.cds-line {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.7rem 0.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}

	.cds-line:last-child {
		border-bottom: 0;
	}

	.cds-line-thumb {
		height: 3rem;
		width: 3rem;
		border-radius: 0.55rem;
		object-fit: cover;
		background: rgba(255, 255, 255, 0.08);
	}

	.cds-line-thumb.placeholder {
		display: block;
		background: linear-gradient(135deg, rgba(32, 180, 90, 0.25), rgba(255, 255, 255, 0.08));
	}

	.cds-line-name {
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.25;
	}

	.cds-line-qty {
		margin-right: 0.2rem;
		color: rgba(255, 255, 255, 0.55);
		font-weight: 700;
	}

	.cds-line-mod,
	.cds-line-note {
		margin-top: 0.15rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.cds-line-note {
		font-style: italic;
	}

	.cds-line-price {
		font-size: 1.05rem;
		font-weight: 700;
		padding-top: 0.1rem;
	}

	.cds-totals {
		padding: 1rem 1.35rem 1.35rem;
		background: #fff;
		color: #122018;
		box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.18);
	}

	.cds-totals.pay {
		background: linear-gradient(180deg, #f3faf5 0%, #fff 40%);
	}

	.cds-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}

	.cds-row.muted {
		font-size: 0.85rem;
		color: #5b6b62;
		margin-bottom: 0.25rem;
	}

	.cds-row.total {
		margin-top: 0.15rem;
		align-items: flex-end;
		font-weight: 700;
		font-size: 1.05rem;
	}

	.cds-total-usd {
		display: block;
		font-size: clamp(1.85rem, 3vw, 2.35rem);
		font-weight: 800;
		line-height: 1.05;
		color: #07883f;
	}

	.cds-total-khr {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #5b6b62;
	}

	.cds-pay-banner {
		margin-top: 0.9rem;
		padding: 0.85rem 1rem;
		border-radius: 0.85rem;
		text-align: center;
		background: #eaf6ee;
		border: 1px solid #b7e4c6;
		animation: cds-glow 1.8s ease-in-out infinite;
	}

	.cds-pay-title {
		font-size: 1.15rem;
		font-weight: 800;
		color: #075c35;
		letter-spacing: -0.02em;
	}

	.cds-pay-sub {
		margin-top: 0.15rem;
		font-size: 0.85rem;
		color: #08723b;
	}

	.cds-pay-wait {
		margin-top: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #07883f;
	}

	@keyframes cds-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes cds-ken {
		from {
			transform: scale(1.04);
		}
		to {
			transform: scale(1.1);
		}
	}

	@keyframes cds-pulse {
		0%,
		100% {
			background-position: 100% 0;
			opacity: 0.45;
		}
		50% {
			background-position: 0 0;
			opacity: 1;
		}
	}

	@keyframes cds-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(32, 180, 90, 0.15);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(32, 180, 90, 0.08);
		}
	}

	@keyframes cds-dot {
		0% {
			box-shadow: 0 0 0 0 rgba(32, 180, 90, 0.55);
		}
		70% {
			box-shadow: 0 0 0 10px rgba(32, 180, 90, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(32, 180, 90, 0);
		}
	}

	@keyframes cds-pop {
		0%,
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
		50% {
			transform: scale(1.06);
			filter: brightness(1.12);
		}
	}

	@media (max-width: 900px) {
		.cds-top {
			grid-template-columns: 1fr auto;
		}

		.cds-clock {
			display: none;
		}

		.cds-body {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(38vh, 42vh) minmax(0, 1fr);
		}

		.cds-ticket {
			border-left: 0;
			border-top: 1px solid rgba(255, 255, 255, 0.1);
		}

		.cds-ads {
			min-height: 32vh;
		}

		.cds-queue-bar {
			grid-template-columns: 1fr;
		}

		.cds-queue-lane.preparing {
			border-right: 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		.cds-board-cols {
			grid-template-columns: 1fr;
		}
	}
</style>
