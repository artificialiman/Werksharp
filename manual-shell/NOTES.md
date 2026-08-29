# app.html — Rosetta Stone notes

One file. Open it directly (`file://` works — no server, no build,
no dependency install) or serve it from any static host. Routes are
hash-based (`#/roster`, `#/staff`, etc.) specifically so no host-side
rewrite rule is needed — a plain S3 bucket or GitHub Pages serves this
correctly with zero config, same as a path-based route would need a
`vercel.json` rewrite or equivalent to avoid 404s on refresh.

## What this is

A line-by-line translation of five Svelte views into one HTML file —
same visual output, same data flow, same auth model, no framework, no
build step. Every section in `app.html` has a comment block explaining
what it replaced and why the translation looks the way it does. This
file is meant to be read and refactored by hand, not treated as a
finished deliverable — that's the whole point of asking for vanilla.

## Source mapping

| View | Translated from | Status |
|---|---|---|
| `#/` | `landing-page.svelte` | Direct translation |
| `#/login` | earlier session's `login/+page.svelte` | Direct translation |
| `#/roster` | `roster/+page.svelte` + `lib/roster.ts` | Direct translation |
| `#/staff` | `staff-page.svelte` + `lib/staff.ts` | Direct translation |
| `#/access-code` | *(no source given)* | **Invented** — see below |
| `#/feed` | *(no source given)* | **Invented** — see below |

## What's real vs. what's invented

The first four routes above call real, working PostgREST endpoints —
`students`, `classes`, `staff_members`, `staff_classes`,
`staff_subjects`, `subjects`, plus the `create_student` RPC from an
earlier session's `0004_atomic_student_id.sql`. Point this file at a
real Supabase project (see Setup below) and those four routes work
today.

`#/access-code` and `#/feed` had no source file, no migration, and no
schema to translate — only your one-line specs ("access code is the
admin's job", "feed posts is an automatic process"). I built both as
complete, styled views matching the established visual language, but:

- **`#/access-code`** calls a `rotate_student_access_code` RPC that
  **does not exist**. The button, the admin-only gating (client-side
  AND intended server-side), and the result display are all built —
  the Postgres function generating a code, hashing it, and updating
  every active student's `portal_credentials` row in one transaction
  is not. See the comment above `renderAccessCode()` for the two real
  decisions this made on your behalf (role gate mechanism, rotate
  mechanism) that a real build should confirm rather than inherit
  silently.
- **`#/feed`** queries a `feed_posts` table that doesn't exist in any
  migration seen so far. `tendercare-web`'s `feed_comments`/
  `feed_likes` are a different table (public-site comment/like
  widget), not posts themselves. The view is built to show a correct
  error state when the table is missing (verified — screenshot shows
  it), and to render a real feed once one exists.

Both are flagged inline in the code with the exact reasoning, not just
here — read the comment blocks in `app.html` before treating either as
load-bearing.

## What's faithfully preserved, not fixed

`staff.ts`'s `setStaffClassAssignments()`/`setStaffSubjects()` do
delete-then-insert as two separate calls, not one transaction — a real
(small) race window in the original Svelte code, reproduced here
rather than silently patched. `create_student`'s atomic-RPC pattern
would close it the same way it closed the student-ID race in an
earlier session, if you want that done — it wasn't in scope for a
translation pass.

## Setup

Open the file and set two values before any protected route will
actually talk to Supabase:

```html
<script>
  window.SUPABASE_URL = 'https://your-project.supabase.co';
  window.SUPABASE_ANON_KEY = 'your-anon-key';
</script>
```

Add that `<script>` tag right before `app.html`'s existing `<script>`
block (the one containing `const SUPABASE_URL = window.SUPABASE_URL || ...`).
Without it, the file still renders every view correctly (verified via
mocked responses) but every real data call will fail against the
placeholder URL.

The two shared accounts from the earlier session
(`staff@tendercare.local` / `admin@tendercare.local`) work as-is —
this file calls Supabase Auth's REST API directly
(`/auth/v1/token?grant_type=password`) instead of importing
`supabase-js`, so no client library is loaded at all, but the accounts
and passwords underneath are unchanged.

## What was cut, on purpose

No `supabase-js` (a real dependency — realtime client, postgrest
query builder, auth state machine — for what this app actually uses,
which is a handful of REST calls). Plain `fetch()` against Supabase's
REST and Auth HTTP APIs directly does the same job. Every `authedFetch()`
call in the file is doing exactly what `supabase.from(...)` was doing
underneath, just without the SDK wrapping it.

No Svelte reactivity, obviously — every state mutation ends with an
explicit re-render call (`renderRosterBody()`, `renderStaffBody()`,
etc.). This is the single biggest verbosity cost of the translation;
worth knowing before you start refactoring, since "the roster view
doesn't automatically re-render" isn't a bug to fix, it's the tradeoff
of not having a framework.

## Verification performed

Every route was rendered in headless Chromium with a mocked session
(a real, well-formed-but-unsigned JWT carrying `app_metadata.role`)
and mocked Supabase REST responses, confirming: zero JavaScript errors
on any route, correct role-gating on `#/access-code` (staff sees
locked message, admin sees the rotate button), correct honest-failure
rendering on `#/feed` when the backing table is missing, and visual
parity against the two reference screenshots (`landing-hub.png`,
`staff-page.png`) you provided.

Not verified: any route against a real Supabase project (no live
Postgres available in this environment, same limitation as prior
sessions' migration work) — the `authedFetch()` calls are correct by
reading against the known schema, not confirmed by running.
