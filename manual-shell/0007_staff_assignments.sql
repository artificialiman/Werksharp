-- ============================================================================
-- Staff members and their teaching assignments.
--
-- IMPORTANT SCOPING NOTE: this is a roster of named teachers, not a table
-- of logins. Auth in this suite is still the two-shared-account interim
-- setup from 0003_staff_auth_roles.sql (staff@tendercare.local /
-- admin@tendercare.local) — there is no per-teacher Supabase Auth session
-- to attach an assignment to. So "select class-teaching/part-time role,
-- subjects, junior/senior, class arms" for a named teacher is data ABOUT
-- that teacher, entered and edited by whoever is logged into the shared
-- staff account — the same trust model already used for students (any
-- staff session manages the whole roster, not just "their own" entries).
-- If/when per-teacher login exists, staff_members.auth_user_id can be
-- backfilled to link a row to a real session — the column is here now,
-- nullable, so that migration doesn't require reshaping this table later.
-- ============================================================================

create table staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  employment_type text not null check (employment_type in ('full_time', 'part_time')),
  -- true = teaches at least one junior class (JSS1-3), true = teaches at
  -- least one senior class (SS1-3). Both true is normal and expected
  -- ("junior/senior school or both"), not an edge case.
  teaches_junior boolean not null default false,
  teaches_senior boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- nullable on purpose -- see note above. Not referencing auth.users(id)
  -- with a foreign key yet either, since no per-teacher auth user exists
  -- to reference; add the constraint when that becomes real.
  auth_user_id uuid
);

-- which classes a staff member teaches (many-to-many, mirrors
-- class_subjects' shape)
create table staff_classes (
  staff_id uuid not null references staff_members(id) on delete cascade,
  class_id text not null references classes(id) on delete cascade,
  -- true if this staff member is THE class teacher for this class
  -- (singular per class in practice, but not enforced here -- a covering
  -- arrangement during a staff absence is a legitimate reason two people
  -- briefly hold this for the same class, and the UI, not a constraint,
  -- is the right place to warn about that, not block it).
  is_class_teacher boolean not null default false,
  primary key (staff_id, class_id)
);

-- which subjects a staff member teaches (many-to-many)
create table staff_subjects (
  staff_id uuid not null references staff_members(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  primary key (staff_id, subject_id)
);

create index idx_staff_classes_staff on staff_classes(staff_id);
create index idx_staff_subjects_staff on staff_subjects(staff_id);

alter table staff_members enable row level security;
alter table staff_classes enable row level security;
alter table staff_subjects enable row level security;

-- Same trust level as students throughout this suite: any staff or admin
-- session manages the whole staff roster, not just entries they'd
-- personally "own" (there's no per-teacher identity to scope that to
-- anyway -- see the note at the top of this file).
create policy "staff can do everything on staff_members"
  on staff_members for all
  using (auth.jwt() ->> 'role' in ('staff', 'admin'))
  with check (auth.jwt() ->> 'role' in ('staff', 'admin'));

create policy "staff can do everything on staff_classes"
  on staff_classes for all
  using (auth.jwt() ->> 'role' in ('staff', 'admin'))
  with check (auth.jwt() ->> 'role' in ('staff', 'admin'));

create policy "staff can do everything on staff_subjects"
  on staff_subjects for all
  using (auth.jwt() ->> 'role' in ('staff', 'admin'))
  with check (auth.jwt() ->> 'role' in ('staff', 'admin'));
