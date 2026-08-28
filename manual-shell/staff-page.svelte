<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import StaffShell from '$lib/components/StaffShell.svelte';
	import {
		listStaff,
		addStaffMember,
		deactivateStaffMember,
		reactivateStaffMember,
		getStaffClassAssignments,
		getStaffSubjectIds,
		setStaffClassAssignments,
		setStaffSubjects,
		listSubjects,
		type StaffMember,
		type Subject
	} from '$lib/staff';

	/**
	 * Staff directory + teaching assignments (class-teaching/part-time
	 * role, subjects, junior/senior scope, class arms). See
	 * 0007_staff_assignments.sql for why this is a directory of named
	 * teachers rather than individual logins — that migration's header
	 * comment is the real explanation, not repeated here.
	 */

	let checkingSession = $state(true);
	let staffRole = $state<string | null>(null);

	let staff = $state<StaffMember[]>([]);
	let classes = $state<{ id: string; label: string; arm: string | null }[]>([]);
	let subjects = $state<Subject[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showInactive = $state(false);

	let newName = $state('');
	let newEmploymentType = $state<'full_time' | 'part_time'>('full_time');
	let newTeachesJunior = $state(false);
	let newTeachesSenior = $state(false);
	let adding = $state(false);

	let editingStaffId = $state<string | null>(null);
	let editClassAssignments = $state<Map<string, boolean>>(new Map());
	let editSubjectIds = $state<Set<string>>(new Set());
	let savingAssignments = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			const [staffData, { data: classData, error: classErr }, subjectData] = await Promise.all([
				listStaff(),
				supabase.from('classes').select('id, label, arm').order('sort_order'),
				listSubjects()
			]);
			if (classErr) throw classErr;
			staff = staffData;
			classes = classData ?? [];
			subjects = subjectData;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load staff';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (!session) {
			goto('/login');
			return;
		}
		staffRole = session.user.app_metadata?.role ?? null;
		checkingSession = false;
		await load();
	});

	async function handleAdd() {
		if (!newName.trim() || (!newTeachesJunior && !newTeachesSenior)) return;
		adding = true;
		error = '';
		try {
			await addStaffMember({
				full_name: newName.trim(),
				employment_type: newEmploymentType,
				teaches_junior: newTeachesJunior,
				teaches_senior: newTeachesSenior
			});
			newName = '';
			newTeachesJunior = false;
			newTeachesSenior = false;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add staff member';
		} finally {
			adding = false;
		}
	}

	async function handleDeactivate(id: string) {
		error = '';
		try {
			await deactivateStaffMember(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to deactivate';
		}
	}

	async function handleReactivate(id: string) {
		error = '';
		try {
			await reactivateStaffMember(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reactivate';
		}
	}

	async function openAssignmentEditor(s: StaffMember) {
		editingStaffId = s.id;
		const [assignments, subjectIds] = await Promise.all([
			getStaffClassAssignments(s.id),
			getStaffSubjectIds(s.id)
		]);
		editClassAssignments = new Map(assignments.map((a) => [a.class_id, a.is_class_teacher]));
		editSubjectIds = new Set(subjectIds);
	}

	function closeAssignmentEditor() {
		editingStaffId = null;
	}

	function toggleClassAssignment(classId: string) {
		if (editClassAssignments.has(classId)) {
			editClassAssignments.delete(classId);
		} else {
			editClassAssignments.set(classId, false);
		}
		editClassAssignments = new Map(editClassAssignments);
	}

	function toggleClassTeacher(classId: string) {
		const current = editClassAssignments.get(classId);
		if (current === undefined) return;
		editClassAssignments.set(classId, !current);
		editClassAssignments = new Map(editClassAssignments);
	}

	function toggleSubject(subjectId: string) {
		if (editSubjectIds.has(subjectId)) {
			editSubjectIds.delete(subjectId);
		} else {
			editSubjectIds.add(subjectId);
		}
		editSubjectIds = new Set(editSubjectIds);
	}

	async function handleSaveAssignments() {
		if (!editingStaffId) return;
		savingAssignments = true;
		error = '';
		try {
			await Promise.all([
				setStaffClassAssignments(
					editingStaffId,
					Array.from(editClassAssignments.entries()).map(([class_id, is_class_teacher]) => ({
						class_id,
						is_class_teacher
					}))
				),
				setStaffSubjects(editingStaffId, Array.from(editSubjectIds))
			]);
			editingStaffId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save assignments';
		} finally {
			savingAssignments = false;
		}
	}

	const visibleStaff = $derived(staff.filter((s) => showInactive || s.active));
</script>

<svelte:head>
	<title>Staff — Tendercare Teacher Dashboard</title>
</svelte:head>

{#if checkingSession}
	<p class="session-check">Checking session…</p>
{:else}
	<StaffShell title="Staff & Assignments" role={staffRole}>
		<header class="page-header">
			<h1>Staff & Assignments</h1>
			<p class="page-subtitle">
				Each teacher's class-teaching/part-time role, the subjects they teach, junior/senior
				scope, and which class arms they're assigned to.
			</p>
		</header>

		{#if error}
			<div class="page-error" role="alert">{error}</div>
		{/if}

		<section class="add-card">
			<h2>Add a Staff Member</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleAdd();
				}}
			>
				<input type="text" placeholder="Full name" bind:value={newName} required />
				<select bind:value={newEmploymentType}>
					<option value="full_time">Full-time / Class Teacher</option>
					<option value="part_time">Part-time</option>
				</select>
				<label class="inline-checkbox">
					<input type="checkbox" bind:checked={newTeachesJunior} />
					Junior school
				</label>
				<label class="inline-checkbox">
					<input type="checkbox" bind:checked={newTeachesSenior} />
					Senior school
				</label>
				<button type="submit" class="btn-primary" disabled={adding}>
					{adding ? 'Adding…' : 'Add Staff Member'}
				</button>
			</form>
			{#if !newTeachesJunior && !newTeachesSenior}
				<p class="form-hint">Select junior, senior, or both before adding.</p>
			{/if}
		</section>

		<div class="list-header">
			<h2>Staff Directory</h2>
			<label class="show-inactive-toggle">
				<input type="checkbox" bind:checked={showInactive} />
				Show deactivated staff
			</label>
		</div>

		{#if loading}
			<p class="loading-note">Loading…</p>
		{:else if visibleStaff.length === 0}
			<p class="loading-note">No staff members yet.</p>
		{:else}
			<div class="staff-list">
				{#each visibleStaff as s (s.id)}
					<div class="staff-card" class:inactive={!s.active}>
						<div class="staff-row">
							<div class="staff-main">
								<span class="staff-name">{s.full_name}</span>
								<span class="staff-tags">
									<span class="tag tag--type">
										{s.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}
									</span>
									{#if s.teaches_junior}<span class="tag tag--scope">Junior</span>{/if}
									{#if s.teaches_senior}<span class="tag tag--scope">Senior</span>{/if}
									{#if !s.active}<span class="tag tag--inactive">Deactivated</span>{/if}
								</span>
							</div>
							<div class="staff-actions">
								{#if s.active}
									<button class="row-action row-action--edit" onclick={() => openAssignmentEditor(s)}>
										Edit assignments
									</button>
									<button class="row-action row-action--remove" onclick={() => handleDeactivate(s.id)}>
										Deactivate
									</button>
								{:else}
									<button class="row-action row-action--restore" onclick={() => handleReactivate(s.id)}>
										Reactivate
									</button>
								{/if}
							</div>
						</div>

						{#if editingStaffId === s.id}
							<div class="assignment-editor">
								<div class="assignment-col">
									<h3>Classes Taught</h3>
									<div class="assignment-checklist">
										{#each classes as c (c.id)}
											{@const assigned = editClassAssignments.has(c.id)}
											<div class="assignment-row">
												<label class="inline-checkbox">
													<input
														type="checkbox"
														checked={assigned}
														onchange={() => toggleClassAssignment(c.id)}
													/>
													{c.label}
													{#if c.arm}<span class="arm-tag">{c.arm}</span>{/if}
												</label>
												{#if assigned}
													<label class="inline-checkbox inline-checkbox--sub">
														<input
															type="checkbox"
															checked={editClassAssignments.get(c.id)}
															onchange={() => toggleClassTeacher(c.id)}
														/>
														Class teacher
													</label>
												{/if}
											</div>
										{/each}
									</div>
								</div>
								<div class="assignment-col">
									<h3>Subjects Taught</h3>
									<div class="assignment-checklist">
										{#each subjects as subj (subj.id)}
											<label class="inline-checkbox">
												<input
													type="checkbox"
													checked={editSubjectIds.has(subj.id)}
													onchange={() => toggleSubject(subj.id)}
												/>
												{subj.name}
											</label>
										{/each}
									</div>
								</div>
								<div class="assignment-actions">
									<button
										class="btn-secondary"
										onclick={closeAssignmentEditor}
										disabled={savingAssignments}
									>
										Cancel
									</button>
									<button
										class="btn-primary"
										onclick={handleSaveAssignments}
										disabled={savingAssignments}
									>
										{savingAssignments ? 'Saving…' : 'Save assignments'}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</StaffShell>
{/if}

<style>
	.session-check {
		text-align: center;
		padding: 4rem 1rem;
		opacity: 0.6;
		font-family: var(--font-sans);
	}

	.page-header h1 {
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: var(--text-2xl);
		color: var(--color-purple-deep);
		margin: 0 0 var(--space-2);
	}

	.page-subtitle {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-ash-dark);
		max-width: 65ch;
		margin: 0 0 var(--space-6);
	}

	.page-error {
		background: #fdecea;
		border: 1px solid #f5c6c0;
		color: var(--color-wine);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-5);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
	}

	.add-card {
		background: var(--color-white);
		border: 1px solid var(--color-cream-deep);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		margin-bottom: var(--space-8);
		box-shadow: var(--shadow-sm);
	}

	.add-card h2 {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-purple);
		margin: 0 0 var(--space-4);
	}

	.add-card form {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
		align-items: center;
	}

	.add-card input[type='text'] {
		flex: 1;
		min-width: 200px;
		padding: 0.65rem 0.85rem;
		border: 1.5px solid var(--color-cream-deep);
		border-radius: var(--radius-md);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
	}

	.add-card select {
		padding: 0.65rem 0.85rem;
		border: 1.5px solid var(--color-cream-deep);
		border-radius: var(--radius-md);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		background: var(--color-white);
	}

	.add-card input:focus,
	.add-card select:focus {
		outline: none;
		border-color: var(--color-purple-light);
	}

	.inline-checkbox {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	.inline-checkbox--sub {
		margin-left: var(--space-4);
		color: var(--color-purple);
		font-size: var(--text-xs);
	}

	.form-hint {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		color: var(--color-wine);
		margin-top: var(--space-2);
	}

	.btn-primary {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: var(--tracking-wide);
		background: var(--color-purple);
		color: var(--color-cream);
		padding: 0.65rem 1.2rem;
		border-radius: var(--radius-md);
		transition: background var(--duration-fast);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-purple-deep);
	}

	.btn-primary:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.btn-secondary {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 600;
		background: var(--color-cream);
		color: var(--color-ink);
		padding: 0.65rem 1.2rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-cream-deep);
	}

	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}

	.list-header h2 {
		font-family: var(--font-serif);
		font-weight: 500;
		font-size: var(--text-lg);
		color: var(--color-ink);
		margin: 0;
	}

	.show-inactive-toggle {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-ash-dark);
	}

	.loading-note {
		font-family: var(--font-sans);
		color: var(--color-ash-dark);
		padding: var(--space-8) 0;
		text-align: center;
	}

	.staff-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.staff-card {
		background: var(--color-white);
		border: 1px solid var(--color-cream-deep);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.staff-card.inactive {
		opacity: 0.55;
	}

	.staff-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.staff-main {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.staff-name {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: var(--text-md);
		color: var(--color-ink);
	}

	.staff-tags {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.tag {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
	}

	.tag--type {
		background: var(--color-purple-ghost);
		color: var(--color-purple-deep);
	}

	.tag--scope {
		background: var(--color-lemon-ghost);
		color: #6b6600;
	}

	.tag--inactive {
		background: #fdecea;
		color: var(--color-wine);
	}

	.staff-actions {
		display: flex;
		gap: var(--space-2);
	}

	.row-action {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-md);
		white-space: nowrap;
	}

	.row-action--edit {
		color: var(--color-purple-deep);
		background: var(--color-purple-ghost);
	}

	.row-action--remove {
		color: var(--color-wine);
		background: #fdecea;
	}

	.row-action--restore {
		color: #155724;
		background: #d4edda;
	}

	.assignment-editor {
		border-top: 1px solid var(--color-cream-deep);
		background: var(--color-cream);
		padding: var(--space-5);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-6);
	}

	.assignment-editor h3 {
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: var(--color-purple);
		margin: 0 0 var(--space-3);
	}

	.assignment-checklist {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-height: 260px;
		overflow-y: auto;
	}

	.assignment-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.arm-tag {
		font-size: 0.65rem;
		color: var(--color-ash-dark);
		background: var(--color-cream-deep);
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		margin-left: var(--space-1);
	}

	.assignment-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-cream-deep);
	}

	@media (max-width: 640px) {
		.assignment-editor {
			grid-template-columns: 1fr;
		}
	}
</style>
