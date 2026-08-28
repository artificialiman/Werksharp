import { supabase } from '$lib/supabase';

/**
 * Staff roster and teaching assignments (0007_staff_assignments.sql).
 * See that migration's header comment for why this is a directory of
 * named teachers, not a table of logins — auth here is still the
 * two-shared-account interim setup.
 */

export interface StaffMember {
	id: string;
	full_name: string;
	employment_type: 'full_time' | 'part_time';
	teaches_junior: boolean;
	teaches_senior: boolean;
	active: boolean;
	created_at: string;
}

export interface NewStaffMemberInput {
	full_name: string;
	employment_type: 'full_time' | 'part_time';
	teaches_junior: boolean;
	teaches_senior: boolean;
}

export async function listStaff(): Promise<StaffMember[]> {
	const { data, error } = await supabase
		.from('staff_members')
		.select('*')
		.order('full_name');
	if (error) throw error;
	return data as StaffMember[];
}

export async function addStaffMember(input: NewStaffMemberInput): Promise<StaffMember> {
	const { data, error } = await supabase
		.from('staff_members')
		.insert({
			full_name: input.full_name.trim(),
			employment_type: input.employment_type,
			teaches_junior: input.teaches_junior,
			teaches_senior: input.teaches_senior
		})
		.select()
		.single();
	if (error) throw error;
	return data as StaffMember;
}

export async function updateStaffMember(
	id: string,
	updates: Partial<NewStaffMemberInput>
): Promise<void> {
	const { error } = await supabase.from('staff_members').update(updates).eq('id', id);
	if (error) throw error;
}

/** Soft-deactivate — mirrors students' active flag rather than a hard delete. */
export async function deactivateStaffMember(id: string): Promise<void> {
	const { error } = await supabase.from('staff_members').update({ active: false }).eq('id', id);
	if (error) throw error;
}

export async function reactivateStaffMember(id: string): Promise<void> {
	const { error } = await supabase.from('staff_members').update({ active: true }).eq('id', id);
	if (error) throw error;
}

export interface ClassAssignment {
	class_id: string;
	is_class_teacher: boolean;
}

export async function getStaffClassAssignments(staffId: string): Promise<ClassAssignment[]> {
	const { data, error } = await supabase
		.from('staff_classes')
		.select('class_id, is_class_teacher')
		.eq('staff_id', staffId);
	if (error) throw error;
	return data as ClassAssignment[];
}

export async function getStaffSubjectIds(staffId: string): Promise<string[]> {
	const { data, error } = await supabase
		.from('staff_subjects')
		.select('subject_id')
		.eq('staff_id', staffId);
	if (error) throw error;
	return (data ?? []).map((r) => r.subject_id as string);
}

/**
 * Replace a staff member's full set of class assignments in one
 * operation — delete-then-insert rather than a diff, since the UI this
 * backs is a multi-select checkbox list (the whole set is submitted
 * together, not one class at a time), and the assignment table has no
 * other data worth preserving per-row except is_class_teacher, which the
 * caller passes in fresh either way.
 */
export async function setStaffClassAssignments(
	staffId: string,
	assignments: ClassAssignment[]
): Promise<void> {
	const { error: deleteError } = await supabase
		.from('staff_classes')
		.delete()
		.eq('staff_id', staffId);
	if (deleteError) throw deleteError;

	if (assignments.length === 0) return;

	const { error: insertError } = await supabase.from('staff_classes').insert(
		assignments.map((a) => ({
			staff_id: staffId,
			class_id: a.class_id,
			is_class_teacher: a.is_class_teacher
		}))
	);
	if (insertError) throw insertError;
}

/** Same replace-whole-set approach as setStaffClassAssignments(), same reasoning. */
export async function setStaffSubjects(staffId: string, subjectIds: string[]): Promise<void> {
	const { error: deleteError } = await supabase
		.from('staff_subjects')
		.delete()
		.eq('staff_id', staffId);
	if (deleteError) throw deleteError;

	if (subjectIds.length === 0) return;

	const { error: insertError } = await supabase
		.from('staff_subjects')
		.insert(subjectIds.map((subject_id) => ({ staff_id: staffId, subject_id })));
	if (insertError) throw insertError;
}

export interface Subject {
	id: string;
	name: string;
}

export async function listSubjects(): Promise<Subject[]> {
	const { data, error } = await supabase.from('subjects').select('id, name').order('name');
	if (error) throw error;
	return data as Subject[];
}
