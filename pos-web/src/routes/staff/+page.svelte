<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import IconAction from '$lib/components/icon-action.svelte';
	import MultiSelectMenu from '$lib/components/multi-select-menu.svelte';
	import SelectMenu from '$lib/components/select-menu.svelte';
	import UiCheckbox from '$lib/components/ui-checkbox.svelte';
	import { label } from '$lib/i18n/label';
	import { demo } from '$lib/state/demo.svelte';
	import type { Role, StaffMember } from '$lib/domain/types';
	import * as m from '$paraglide/messages';
	import { Pencil, Plus, UserRound } from 'lucide-svelte';

	let tab = $state<'users' | 'roles'>('users');
	let editingStaff = $state<StaffMember | null>(null);
	let editingRole = $state<Role | null>(null);
	let query = $state('');

	const canEdit = $derived(demo.can('staff'));
	const perms = ['pos', 'orders', 'kitchen', 'refund', 'products', 'reports', 'shifts', 'settings', 'customers', 'staff'];
	const permLabel: Record<string, () => string> = {
		pos: m.perm_pos,
		orders: m.perm_orders,
		kitchen: m.perm_kitchen,
		refund: m.perm_refund,
		products: m.perm_products,
		reports: m.perm_reports,
		shifts: m.perm_shifts,
		settings: m.perm_settings,
		customers: m.perm_customers,
		staff: m.perm_staff
	};

	const staffRows = $derived(
		[...demo.state.staff]
			.sort((a, b) => label(a.name).localeCompare(label(b.name)))
			.filter((person) => {
				if (!query.trim()) return true;
				const q = query.trim().toLowerCase();
				const roleName = label(demo.state.roles.find((role) => role.id === person.roleId)?.name);
				const branchNames = person.branchIds
					.map((id) => label(demo.state.branches.find((branch) => branch.id === id)?.name))
					.join(' ');
				return `${person.name.en} ${person.name.kh} ${person.phone ?? ''} ${roleName} ${branchNames}`
					.toLowerCase()
					.includes(q);
			})
	);

	const roleRows = $derived(
		[...demo.state.roles].sort((a, b) => label(a.name).localeCompare(label(b.name))).filter((role) => {
			if (!query.trim()) return true;
			const q = query.trim().toLowerCase();
			return `${role.name.en} ${role.name.kh}`.toLowerCase().includes(q);
		})
	);

	function branchLabels(branchIds: string[]) {
		const names = branchIds
			.map((id) => label(demo.state.branches.find((branch) => branch.id === id)?.name))
			.filter(Boolean);
		return names.length ? names.join(', ') : '—';
	}

	function cloneStaff(person: StaffMember): StaffMember {
		return {
			...person,
			name: { ...person.name },
			branchIds: [...(person.branchIds ?? [])],
			phone: person.phone ?? '',
			loginPin: person.loginPin ?? '1234'
		};
	}

	function cloneRole(role: Role): Role {
		return {
			...role,
			name: { ...role.name },
			permissions: [...role.permissions]
		};
	}

	function openNewStaff() {
		editingStaff = {
			id: crypto.randomUUID(),
			name: { en: '', kh: '' },
			roleId: demo.state.roles[0]?.id ?? 'role_cashier',
			branchIds: [demo.state.activeBranchId],
			phone: '',
			loginPin: '1234',
			active: true
		};
	}

	function openEditStaff(person: StaffMember) {
		editingStaff = cloneStaff(person);
	}

	function openNewRole() {
		editingRole = {
			id: crypto.randomUUID(),
			name: { en: '', kh: '' },
			permissions: ['pos', 'orders']
		};
	}

	function openEditRole(role: Role) {
		editingRole = cloneRole(role);
	}

	function usersOnRole(roleId: string) {
		return demo.state.staff.filter((person) => person.roleId === roleId).length;
	}

	const branchOptions = $derived(
		demo.state.branches.map((branch) => ({
			value: branch.id,
			label: label(branch.name),
			disabled: !branch.active
		}))
	);

	function saveStaff() {
		if (!editingStaff) return;
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const result = demo.saveStaff(editingStaff);
		if (result === 'ok') {
			editingStaff = null;
			demo.flash(m.staff_saved());
			return;
		}
		if (result === 'permission') demo.flash(m.permission_denied());
		else if (result === 'branch') demo.flash(m.branch_required());
		else demo.flash(m.name_required());
	}

	function saveRole() {
		if (!editingRole) return;
		if (!canEdit) {
			demo.flash(m.permission_denied());
			return;
		}
		const result = demo.saveRole(editingRole);
		if (result !== 'ok') demo.flash(result === 'permission' ? m.permission_denied() : m.name_required());
		else {
			editingRole = null;
			demo.flash(m.role_saved());
		}
	}

	function togglePerm(permission: string, on: boolean) {
		if (!editingRole) return;
		editingRole = {
			...editingRole,
			permissions: on
				? [...new Set([...editingRole.permissions, permission])]
				: editingRole.permissions.filter((item) => item !== permission)
		};
	}

	const isNewStaff = $derived(!!editingStaff && !demo.state.staff.some((item) => item.id === editingStaff!.id));
	const isNewRole = $derived(!!editingRole && !demo.state.roles.some((item) => item.id === editingRole!.id));
</script>

<div class="page-list">
	<div class="page-list-head">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">{m.staff_title()}</h1>
				<p class="mt-1 text-sm text-muted">{m.perm_note()} {m.password_never()}</p>
			</div>
			{#if tab === 'users'}
				<IconAction
					label={canEdit ? m.add_staff() : m.permission_denied()}
					icon={Plus}
					tone="solid"
					disabled={!canEdit}
					onclick={openNewStaff}
				/>
			{:else}
				<IconAction
					label={canEdit ? m.add_role() : m.permission_denied()}
					icon={Plus}
					tone="solid"
					disabled={!canEdit}
					onclick={openNewRole}
				/>
			{/if}
		</div>
		{#if !canEdit}<p class="mt-2 text-sm text-muted">{m.permission_denied()}</p>{/if}

		<div class="mt-4 flex flex-wrap gap-2">
			<button class="chip" type="button" aria-pressed={tab === 'users'} onclick={() => { tab = 'users'; query = ''; }}>{m.staff_users_tab()}</button>
			<button class="chip" type="button" aria-pressed={tab === 'roles'} onclick={() => { tab = 'roles'; query = ''; }}>{m.staff_roles_tab()}</button>
		</div>

		<div class="mt-4">
			<input class="field max-w-md" placeholder={m.search()} aria-label={m.search()} bind:value={query} />
		</div>
	</div>

	{#if tab === 'users'}
		<div class="card page-list-grid">
			<table class="w-full min-w-[720px] text-left text-sm">
				<thead class="text-xs uppercase text-muted">
					<tr>
						<th class="px-3 py-3">{m.staff_name()}</th>
						<th class="px-3 py-3">{m.role()}</th>
						<th class="px-3 py-3">{m.status()}</th>
						<th class="px-3 py-3">{m.contact()}</th>
						<th class="px-3 py-3">{m.assigned()}</th>
						<th class="px-3 py-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each staffRows as person (person.id)}
						<tr class="border-t border-line">
							<td class="px-3 py-3">
								<div class="flex items-center gap-3">
									<span class="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
										<UserRound size={22} />
									</span>
									<div>
										<p class="font-semibold">{label(person.name)}</p>
										<p class="text-xs text-muted">{person.name.en} · {person.name.kh}</p>
									</div>
								</div>
							</td>
							<td class="px-3 py-3">{label(demo.state.roles.find((role) => role.id === person.roleId)?.name)}</td>
							<td class="px-3 py-3">
								<span class="badge {person.active ? 'badge-ok' : 'badge-neutral'}">
									{person.active ? m.active() : m.inactive()}
								</span>
							</td>
							<td class="px-3 py-3">{person.phone || '—'}</td>
							<td class="px-3 py-3">{branchLabels(person.branchIds)}</td>
							<td class="px-3 py-3 text-right">
								<div class="icon-action-group">
									<IconAction label={m.edit()} icon={Pencil} onclick={() => openEditStaff(person)} />
								</div>
							</td>
						</tr>
					{:else}
						<tr><td class="px-3 py-8 text-muted" colspan="6">{m.no_results()}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="card page-list-grid">
			<table class="w-full min-w-[640px] text-left text-sm">
				<thead class="text-xs uppercase text-muted">
					<tr>
						<th class="px-3 py-3">{m.role()}</th>
						<th class="px-3 py-3 text-right">{m.users_count()}</th>
						<th class="px-3 py-3">{m.permissions()}</th>
						<th class="px-3 py-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each roleRows as role (role.id)}
						<tr class="border-t border-line">
							<td class="px-3 py-3">
								<p class="font-semibold">{label(role.name)}</p>
								<p class="text-xs text-muted">{role.name.en} · {role.name.kh}</p>
							</td>
							<td class="num px-3 py-3 text-right">{usersOnRole(role.id)}</td>
							<td class="px-3 py-3">
								<div class="flex flex-wrap gap-1">
									{#each role.permissions as permission (permission)}
										<span class="badge badge-neutral">{permLabel[permission]?.() ?? permission}</span>
									{:else}
										<span class="text-muted">—</span>
									{/each}
								</div>
							</td>
							<td class="px-3 py-3 text-right">
								<div class="icon-action-group">
									<IconAction label={m.edit()} icon={Pencil} onclick={() => openEditRole(role)} />
								</div>
							</td>
						</tr>
					{:else}
						<tr><td class="px-3 py-8 text-muted" colspan="4">{m.no_results()}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if editingStaff}
	{@const draft = editingStaff}
	<Dialog title={isNewStaff ? m.add_staff() : m.edit_staff()} onclose={() => (editingStaff = null)}>
		<label class="text-sm font-semibold">{m.name_en()}<input class="field mt-1" bind:value={draft.name.en} disabled={!canEdit} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.name_kh()}<input class="field mt-1" bind:value={draft.name.kh} disabled={!canEdit} /></label>
		<label class="mt-3 block text-sm font-semibold">{m.phone()}<input class="field mt-1" bind:value={draft.phone} disabled={!canEdit} /></label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.staff_login_pin()}
			<input
				class="field mt-1"
				type="password"
				inputmode="numeric"
				autocomplete="off"
				maxlength="4"
				bind:value={draft.loginPin}
				disabled={!canEdit}
			/>
		</label>
		<p class="mt-1 text-xs text-muted">{m.staff_login_pin_hint()}</p>
		<label class="mt-3 block text-sm font-semibold"
			>{m.role()}
			<SelectMenu
				class="mt-1"
				disabled={!canEdit}
				bind:value={draft.roleId}
				options={demo.state.roles.map((role) => ({ value: role.id, label: label(role.name) }))}
			/>
		</label>
		<label class="mt-3 block text-sm font-semibold"
			>{m.assigned()}
			<p class="mt-1 text-xs font-normal text-muted">{m.assigned_hint()}</p>
			<MultiSelectMenu
				class="mt-2"
				disabled={!canEdit}
				ariaLabel={m.assigned()}
				placeholder={m.assigned_hint()}
				options={branchOptions}
				bind:value={draft.branchIds}
			/>
		</label>
		<div class="mt-3">
			<UiCheckbox bind:checked={draft.active} disabled={!canEdit} label={m.active()} />
		</div>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingStaff = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canEdit} onclick={saveStaff}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}

{#if editingRole}
	{@const draft = editingRole}
	<Dialog title={isNewRole ? m.add_role() : m.edit_role()} onclose={() => (editingRole = null)} wide>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="text-sm font-semibold">{m.role_name_en()}<input class="field mt-1" bind:value={draft.name.en} disabled={!canEdit} /></label>
			<label class="text-sm font-semibold">{m.role_name_kh()}<input class="field mt-1" bind:value={draft.name.kh} disabled={!canEdit} /></label>
		</div>
		<p class="mt-4 text-sm font-semibold">{m.permissions()}</p>
		<p class="text-xs text-muted">{m.tick_permissions()}</p>
		<ul class="mt-3 grid gap-2 sm:grid-cols-2">
			{#each perms as permission (permission)}
				<li class="rounded border border-line px-3 py-2">
					<UiCheckbox
						checked={draft.permissions.includes(permission)}
						disabled={!canEdit}
						label={permLabel[permission]()}
						onchange={(on) => togglePerm(permission, on)}
					/>
				</li>
			{/each}
		</ul>
		{#snippet footer()}
			<div class="flex justify-end gap-2">
				<button class="btn btn-secondary" type="button" onclick={() => (editingRole = null)}>{m.cancel()}</button>
				<button class="btn btn-primary" type="button" disabled={!canEdit} onclick={saveRole}>{m.save()}</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
