<script lang="ts">
	import AdminSection from '$lib/components/admin-section.svelte';
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import NumberField from '$lib/components/number-field.svelte';
	import ReceiptDesigner from '$lib/components/receipt-designer.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { demo } from '$lib/state/demo.svelte';
	import { label } from '$lib/i18n/label';
	import type { Branch, PaymentMethodSetting, Table, TaxSetting } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Check, Pencil, Plus } from 'lucide-svelte';

	let tab = $state<'shop' | 'branch' | 'tax' | 'pay' | 'receipt' | 'tables' | 'demo'>('shop');
	const locked = $derived(!demo.can('settings'));
	const gridTab = $derived(tab === 'branch' || tab === 'tax' || tab === 'pay' || tab === 'tables');

	let shopEn = $state(demo.state.settings.shopName.en);
	let shopKh = $state(demo.state.settings.shopName.kh);
	let tagEn = $state(demo.state.settings.tagline.en);
	let tagKh = $state(demo.state.settings.tagline.kh);
	let addrEn = $state(demo.state.settings.address.en);
	let addrKh = $state(demo.state.settings.address.kh);
	let phone = $state(demo.state.settings.phone);
	let orderType = $state(demo.state.settings.defaultOrderType);
	let methods = $state(demo.state.settings.paymentMethods.map((item) => ({ ...item, label: { ...item.label } })));

	let editingBranch = $state<Branch | null>(null);
	let editingTable = $state<Table | null>(null);
	let editingPay = $state<PaymentMethodSetting | null>(null);
	let editingTaxCat = $state<TaxSetting | null>(null);

	const branchTables = $derived(
		demo.state.tables.filter((table) => table.branchId === demo.state.activeBranchId)
	);

	function saveShop() {
		const ok = demo.updateSettings({
			shopName: { en: shopEn, kh: shopKh },
			tagline: { en: tagEn, kh: tagKh },
			address: { en: addrEn, kh: addrKh },
			phone,
			defaultOrderType: orderType
		});
		demo.flash(ok ? m.settings_saved() : m.permission_denied());
	}

	function setDefaultTax(tax: TaxSetting) {
		const result = demo.setDefaultTaxCategory(tax.id);
		if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'invalid') demo.flash(m.tax_default_needs_active());
		else demo.flash(m.default_tax_set());
	}

	function savePay() {
		if (!methods.some((item) => item.enabled)) {
			demo.flash(m.at_least_one_tender());
			return;
		}
		const ok = demo.updateSettings({ paymentMethods: methods.map((item) => ({ ...item, label: { ...item.label } })) });
		demo.flash(ok ? m.settings_saved() : m.permission_denied());
	}

	function togglePay(method: PaymentMethodSetting['method'], enabled: boolean) {
		methods = methods.map((item) => (item.method === method ? { ...item, enabled } : item));
		if (!methods.some((item) => item.enabled)) {
			methods = methods.map((item) => (item.method === method ? { ...item, enabled: true } : item));
			demo.flash(m.at_least_one_tender());
			return;
		}
		savePay();
	}

	function openBranch(branch?: Branch) {
		editingBranch = branch
			? {
					...branch,
					name: { ...branch.name },
					address: { ...branch.address }
				}
			: {
					id: crypto.randomUUID(),
					name: { en: '', kh: '' },
					address: { en: '', kh: '' },
					phone: '',
					warehouseId: '',
					active: true
				};
	}

	function saveBranchDialog() {
		if (!editingBranch) return;
		const ok = demo.saveBranch(editingBranch);
		if (!ok) {
			demo.flash(
				!editingBranch.name.en.trim() || !editingBranch.name.kh.trim()
					? m.branch_name_required()
					: editingBranch.id === demo.state.activeBranchId && !editingBranch.active
						? m.cannot_disable_active_branch()
						: m.permission_denied()
			);
			return;
		}
		editingBranch = null;
		demo.flash(m.branch_saved());
	}

	function toggleBranchActive(branch: Branch, active: boolean) {
		const ok = demo.saveBranch({ ...branch, active });
		demo.flash(ok ? m.branch_saved() : m.cannot_disable_active_branch());
	}

	function openTable(table?: Table) {
		editingTable = table
			? { ...table }
			: {
					id: crypto.randomUUID(),
					branchId: demo.state.activeBranchId,
					name: `T${demo.state.tables.filter((t) => t.branchId === demo.state.activeBranchId).length + 1}`,
					capacity: 2,
					status: 'AVAILABLE',
					active: true
				};
	}

	function saveTableDialog() {
		if (!editingTable || locked) return;
		const capacity = Math.max(1, Math.round(Number(editingTable.capacity)) || 1);
		demo.saveTable({ ...editingTable, name: editingTable.name.trim() || editingTable.name, capacity });
		editingTable = null;
		demo.flash(m.table_saved());
	}

	function toggleTableActive(table: Table, active: boolean) {
		if (locked) return;
		demo.saveTable({ ...table, active });
		demo.flash(m.table_saved());
	}

	function openPay(item: PaymentMethodSetting) {
		editingPay = { ...item, label: { ...item.label } };
	}

	function savePayLabels() {
		if (!editingPay) return;
		methods = methods.map((item) =>
			item.method === editingPay!.method
				? { ...item, label: { en: editingPay!.label.en.trim(), kh: editingPay!.label.kh.trim() } }
				: item
		);
		editingPay = null;
		savePay();
	}

	function openTaxCat(tax?: TaxSetting) {
		editingTaxCat = tax
			? { ...tax, name: { ...tax.name } }
			: {
					id: crypto.randomUUID(),
					name: { en: '', kh: '' },
					rateBasisPoints: 1000,
					calculationMode: 'EXCLUSIVE',
					active: true
				};
	}

	function saveTaxCatDialog() {
		if (!editingTaxCat) return;
		const result = demo.saveTaxCategory({
			...editingTaxCat,
			rateBasisPoints: Math.round(Number(editingTaxCat.rateBasisPoints)) || 0
		});
		if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'name') demo.flash(m.both_names());
		else {
			editingTaxCat = null;
			demo.flash(m.tax_category_saved());
		}
	}
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden p-3 md:p-4">
	<div class="shrink-0">
		<h1 class="text-xl font-semibold md:text-2xl">{m.settings_title()}</h1>
		{#if locked}<p class="mt-2 text-sm">{m.switch_to_manager()}</p>{/if}
		<div class="mt-2 flex flex-wrap gap-2">
			<button class="chip" type="button" aria-pressed={tab === 'shop'} onclick={() => (tab = 'shop')}>{m.shop()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'branch'} onclick={() => (tab = 'branch')}>{m.branches()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'tax'} onclick={() => (tab = 'tax')}>{m.tax_settings()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'pay'} onclick={() => (tab = 'pay')}>{m.payments()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'receipt'} onclick={() => (tab = 'receipt')}>{m.receipt_printing()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'tables'} onclick={() => (tab = 'tables')}>{m.tables()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'demo'} onclick={() => (tab = 'demo')}>{m.reset_section()}</button>
		</div>
	</div>

	{#if tab === 'receipt'}
		<div class="mt-2 min-h-0 flex-1 overflow-hidden">
			<ReceiptDesigner {locked} />
		</div>
	{:else}
	<div class="mt-4 min-h-0 flex-1 {gridTab ? 'flex flex-col overflow-hidden' : 'overflow-auto'}">
		{#if tab === 'shop'}
			<AdminSection title={m.shop()}>
				{#snippet actions()}
					<button class="btn btn-primary" type="button" disabled={locked} onclick={saveShop}>{m.save_settings()}</button>
				{/snippet}
				<div class="grid max-w-3xl gap-3 md:grid-cols-2">
					<label class="text-sm font-semibold">{m.shop_en()}<input class="field mt-1" bind:value={shopEn} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.shop_kh()}<input class="field mt-1" bind:value={shopKh} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.tagline_en()}<input class="field mt-1" bind:value={tagEn} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.tagline_kh()}<input class="field mt-1" bind:value={tagKh} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.address_en()}<input class="field mt-1" bind:value={addrEn} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.address_kh()}<input class="field mt-1" bind:value={addrKh} disabled={locked} /></label>
					<label class="text-sm font-semibold">{m.phone_label()}<input class="field mt-1" bind:value={phone} disabled={locked} /></label>
					<label class="text-sm font-semibold"
						>{m.default_order()}
						<SelectMenu
							class="mt-1"
							disabled={locked}
							bind:value={orderType}
							options={[
								{ value: 'TAKEAWAY', label: m.takeaway() },
								{ value: 'DINE_IN', label: m.dine_in() },
								{ value: 'DELIVERY', label: m.delivery() }
							]}
						/>
					</label>
					<div class="md:col-span-2">
						<UiCheckbox
							checked={demo.state.settings.persistOpenOrdersEnabled !== false}
							disabled={locked}
							label={m.persist_open_orders()}
							onchange={(on) => {
								const ok = demo.updateSettings({ persistOpenOrdersEnabled: on });
								demo.flash(ok ? m.settings_saved() : m.permission_denied());
							}}
						/>
						<p class="mt-1 text-xs text-muted">{m.persist_open_orders_hint()}</p>
					</div>
					<div class="md:col-span-2">
						<UiCheckbox
							checked={demo.state.settings.managerPinEnabled}
							disabled={locked}
							label={m.manager_pin_enable()}
							onchange={(on) => {
								const ok = demo.updateSettings({ managerPinEnabled: on });
								demo.flash(ok ? m.settings_saved() : m.permission_denied());
							}}
						/>
						<label class="mt-2 block max-w-xs text-sm font-semibold"
							>{m.manager_pin()}
							<input
								class="field mt-1"
								type="password"
								inputmode="numeric"
								autocomplete="off"
								disabled={locked || !demo.state.settings.managerPinEnabled}
								value={demo.state.settings.managerPin ?? ''}
								onchange={(event) => {
									const pin = (event.target as HTMLInputElement).value.trim();
									if (!pin) {
										(event.target as HTMLInputElement).value = demo.state.settings.managerPin ?? '';
										return;
									}
									const ok = demo.updateSettings({ managerPin: pin });
									demo.flash(ok ? m.settings_saved() : m.permission_denied());
								}}
							/>
						</label>
					</div>
				</div>
			</AdminSection>
		{:else if tab === 'branch'}
			<AdminSection
				title={m.branches()}
				hint={`${m.shown_on_sync()} ${m.business_id()}: ${demo.state.settings.businessId} · ${m.terminal_id()}: ${demo.state.settings.terminalId}`}
				pad={false}
				fill
			>
				{#snippet actions()}
					<IconAction label={m.add_branch()} icon={Plus} tone="solid" disabled={locked} onclick={() => openBranch()} />
				{/snippet}
				<table class="config-table">
					<thead>
						<tr>
							<th>{m.name_en()}</th>
							<th>{m.name_kh()}</th>
							<th>{m.phone_label()}</th>
							<th>{m.warehouse_id()}</th>
							<th>{m.active()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each demo.state.branches as branch (branch.id)}
							<tr class={branch.id === demo.state.activeBranchId ? 'is-selected' : ''}>
								<td class="font-medium">{branch.name.en}</td>
								<td>{branch.name.kh}</td>
								<td>{branch.phone || '—'}</td>
								<td class="font-mono text-xs">{branch.warehouseId || '—'}</td>
								<td>
									<UiCheckbox
										checked={branch.active}
										disabled={locked || branch.id === demo.state.activeBranchId}
										label={m.active()}
										onchange={(on) => toggleBranchActive(branch, on)}
									/>
								</td>
								<td>
									<div class="icon-action-group">
										<IconAction label={m.edit()} icon={Pencil} disabled={locked} onclick={() => openBranch(branch)} />
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="6"><div class="config-empty"><strong>{m.empty_config()}</strong></div></td></tr>
						{/each}
					</tbody>
				</table>
			</AdminSection>
		{:else if tab === 'tax'}
			<AdminSection
				title={m.tax_categories()}
				hint={`${m.tax_categories_hint()} ${m.inclusive_hint()} ${m.tax_demo_label()}`}
				pad={false}
				fill
			>
				{#snippet actions()}
					<IconAction label={m.add_tax_category()} icon={Plus} tone="solid" disabled={locked} onclick={() => openTaxCat()} />
				{/snippet}
				<table class="config-table">
					<thead>
						<tr>
							<th>{m.name_en()}</th>
							<th>{m.name_kh()}</th>
							<th class="text-right">{m.tax_rate()}</th>
							<th>{m.tax_settings()}</th>
							<th>{m.active()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each demo.state.taxCategories as tax (tax.id)}
							{@const isDefault = tax.id === demo.state.settings.tax.id}
							<tr class={isDefault ? 'is-selected' : ''}>
								<td class="font-medium">
									{tax.name.en}
									{#if isDefault}<span class="badge badge-ok ml-2">{m.default_tax_badge()}</span>{/if}
								</td>
								<td>{tax.name.kh}</td>
								<td class="num text-right">{(tax.rateBasisPoints / 100).toFixed(tax.rateBasisPoints % 100 === 0 ? 0 : 2)}%</td>
								<td>{tax.calculationMode === 'EXCLUSIVE' ? m.exclusive() : m.inclusive()}</td>
								<td>{tax.active ? m.active() : m.inactive()}</td>
								<td>
									<div class="icon-action-group">
										{#if !isDefault}
											<IconAction
												label={m.set_default_tax()}
												icon={Check}
												disabled={locked || !tax.active}
												onclick={() => setDefaultTax(tax)}
											/>
										{/if}
										<IconAction label={m.edit()} icon={Pencil} disabled={locked} onclick={() => openTaxCat(tax)} />
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="6"><div class="config-empty"><strong>{m.empty_config()}</strong></div></td></tr>
						{/each}
					</tbody>
				</table>
			</AdminSection>
		{:else if tab === 'pay'}
			<AdminSection title={m.payments()} hint={m.at_least_one_tender()} pad={false} fill>
				{#snippet actions()}
					<button class="btn btn-primary" type="button" disabled={locked} onclick={savePay}>{m.save_settings()}</button>
				{/snippet}
				<table class="config-table">
					<thead>
						<tr>
							<th>{m.payment()}</th>
							<th>{m.label_en()}</th>
							<th>{m.label_kh()}</th>
							<th>{m.enabled()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each methods as item (item.method)}
							<tr>
								<td class="font-mono text-xs font-semibold">{item.method}</td>
								<td>{item.label.en}</td>
								<td>{item.label.kh}</td>
								<td>
									<UiCheckbox
										checked={item.enabled}
										disabled={locked}
										label={m.enabled()}
										onchange={(on) => togglePay(item.method, on)}
									/>
								</td>
								<td>
									<div class="icon-action-group">
										<IconAction label={m.edit()} icon={Pencil} disabled={locked} onclick={() => openPay(item)} />
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</AdminSection>
		{:else if tab === 'tables'}
			<AdminSection
				title={m.tables()}
				hint={label(demo.state.branches.find((b) => b.id === demo.state.activeBranchId)?.name)}
				pad={false}
				fill
			>
				{#snippet actions()}
					<IconAction label={m.new_table()} icon={Plus} tone="solid" disabled={locked} onclick={() => openTable()} />
				{/snippet}
				<table class="config-table">
					<thead>
						<tr>
							<th>{m.table_name()}</th>
							<th class="text-right">{m.capacity()}</th>
							<th>{m.status()}</th>
							<th>{m.active()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each branchTables as table (table.id)}
							<tr>
								<td class="font-medium">{table.name}</td>
								<td class="num text-right">{table.capacity}</td>
								<td>
									{table.status === 'AVAILABLE' ? m.available() : table.status === 'RESERVED' ? m.reserved() : m.occupied()}
								</td>
								<td>
									<UiCheckbox checked={table.active} disabled={locked} label={m.active()} onchange={(on) => toggleTableActive(table, on)} />
								</td>
								<td>
									<div class="icon-action-group">
										<IconAction label={m.edit()} icon={Pencil} disabled={locked} onclick={() => openTable(table)} />
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5"><div class="config-empty"><strong>{m.empty_config()}</strong></div></td></tr>
						{/each}
					</tbody>
				</table>
			</AdminSection>
		{:else}
			<AdminSection title={m.reset_demo()} hint={`${m.reset_hint()} ${m.local_demo()}`}>
				<button
					class="btn btn-danger"
					type="button"
					onclick={() =>
						demo.ask({
							title: m.reset_demo(),
							body: m.reset_body(),
							confirmLabel: m.reset_demo(),
							danger: true,
							onYes: () => {
								demo.reset();
							}
						})}
				>{m.reset_demo()}</button>
			</AdminSection>
		{/if}
	</div>
	{/if}
</div>

{#if editingBranch}
	{@const draft = editingBranch}
	{@const isNew = !demo.state.branches.some((item) => item.id === draft.id)}
	<Dialog title={isNew ? m.add_branch() : m.edit_branch()} onclose={() => (editingBranch = null)}>
		<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={draft.name.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={draft.name.kh} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.address_en()}<input class="field mt-1" bind:value={draft.address.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.address_kh()}<input class="field mt-1" bind:value={draft.address.kh} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.phone_label()}<input class="field mt-1" bind:value={draft.phone} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.warehouse_id()}<input class="field mt-1" bind:value={draft.warehouseId} /></label>
		<div class="mt-3">
			<UiCheckbox
				bind:checked={draft.active}
				disabled={draft.id === demo.state.activeBranchId}
				label={m.active_branch()}
			/>
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingBranch = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={saveBranchDialog}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if editingTable}
	{@const draft = editingTable}
	{@const isNew = !demo.state.tables.some((item) => item.id === draft.id)}
	<Dialog title={isNew ? m.new_table() : m.save_table()} onclose={() => (editingTable = null)}>
		<label class="text-sm font-semibold">{m.table_name()}<input class="field mt-1" bind:value={draft.name} /></label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.capacity()}
			<NumberField class="mt-1" min={1} step={1} bind:intValue={draft.capacity} ariaLabel={m.capacity()} />
		</label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.status()}
			<SelectMenu
				class="mt-1"
				bind:value={draft.status}
				options={[
					{ value: 'AVAILABLE', label: m.available() },
					{ value: 'RESERVED', label: m.reserved() },
					{ value: 'OCCUPIED', label: m.occupied() }
				]}
			/>
		</label>
		<div class="mt-3">
			<UiCheckbox bind:checked={draft.active} label={m.active()} />
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingTable = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={saveTableDialog}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if editingPay}
	{@const draft = editingPay}
	<Dialog title={m.edit_payment()} onclose={() => (editingPay = null)}>
		<p class="text-sm text-muted">{draft.method}</p>
		<label class="mt-3 block text-sm font-semibold">{m.label_en()}<input class="field mt-1" bind:value={draft.label.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.label_kh()}<input class="field mt-1" bind:value={draft.label.kh} /></label>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingPay = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={savePayLabels}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if editingTaxCat}
	{@const draft = editingTaxCat}
	{@const isNew = !demo.state.taxCategories.some((item) => item.id === draft.id)}
	<Dialog title={isNew ? m.add_tax_category() : m.edit_tax_category()} onclose={() => (editingTaxCat = null)}>
		<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={draft.name.en} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={draft.name.kh} /></label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.tax_rate()}
			<NumberField
				class="mt-1"
				min={0}
				step={0.01}
				ariaLabel={m.tax_rate()}
				value={(draft.rateBasisPoints / 100).toFixed(draft.rateBasisPoints % 100 === 0 ? 0 : 2)}
				onchange={(next) => {
					if (!editingTaxCat) return;
					editingTaxCat = {
						...editingTaxCat,
						rateBasisPoints: Math.round(Number(next) * 100) || 0
					};
				}}
			/>
		</label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.tax_settings()}
			<SelectMenu
				class="mt-1"
				bind:value={draft.calculationMode}
				options={[
					{ value: 'EXCLUSIVE', label: m.exclusive() },
					{ value: 'INCLUSIVE', label: m.inclusive() }
				]}
			/>
		</label>
		<div class="mt-3">
			<UiCheckbox bind:checked={draft.active} label={m.active()} />
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingTaxCat = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" onclick={saveTaxCatDialog}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
