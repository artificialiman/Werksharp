# Tendercare Suite — Invariants Audit (read-only, no code changed)

Cross-referencing the invariants/preferences you laid out for this project against what's actually in `tendercare-web`, `tendercare-teacher`, and `tendercare-portal` right now. Nothing below was built or fixed — this is a status check only.

## Fully missing

**1. Permanent stakeholder / family office / admin bio on the site.**
No `teachers` table in the schema, no bio field anywhere, and no actual person's bio exists. `tendercare-web`'s About page has history/mission copy but the faculty section is explicitly a placeholder — its own on-page text reads "Replace with actual staff names, photos, and roles." This hasn't been started.

**4. Automatic promotion/archiving for classes/terms/graduands.**
The `terms` table has an `is_current` flag, but nothing moves a student to a new class at year rollover, and there's no graduate/archive state — a student is either `active` or soft-deleted, nothing in between for "graduated." No promotion logic exists anywhere in any of the three repos.

**6. Automatic weekly deletion of feed activity.**
No cron job, scheduled function, or retention logic anywhere. More basic than that: the feed on `tendercare-web` still runs entirely on `localStorage` — the `feed_comments`/`feed_likes` tables already exist in `tendercare-teacher`'s schema, ready for it, but the feed page hasn't been wired to them yet. There's nothing to auto-delete from yet, and no deletion logic waiting for when it is.

**8b. An admin app that generates passwords for the entire school.**
Searched all three repos — no such tool exists anywhere.

## Contradicted by what's actually built

**8a. "Result transcripts are hardcoded and stay in repo" / "Supabase... hosting results or auth is not it."**
This is the one that matters most. `tendercare-portal`'s result page pulls a student's profile and scores with live Supabase queries (`getStudent`, `getScores` in `lib/data.ts`, both hitting the `students` and `scores` tables directly) — not from anything hardcoded in the repo. `tendercare-teacher`'s roster and auth also run through Supabase (`supabase.auth.getUser()`, RLS-gated tables) the same way. This is the opposite of what was specified.

**More urgent than the contradiction itself:** the result page currently has **no access control at all**. There's a comment in the code admitting it directly — auth was deliberately removed at some point per your own instruction to unblock other work, and the route is now open: anyone who knows or guesses a student ID (`TCH-2025-042` etc.) can view that student's full transcript, no password, no gate. The comment explicitly flags this as not something to bring in front of real users as-is. This isn't a "someday" gap — it's live in the current code.

## Partially built

**2. Teacher-side editing of student bio/info/remarks.**
The data model exists — a `remarks` table with `teacher_remark` and `principal_remark` per student per term, with RLS policies already written. But there's no UI anywhere to actually write to it. `tendercare-teacher`'s roster page only has inputs for adding a new student (name + class) and a soft-delete toggle — no remark field, no bio field (there isn't one in the schema either). Schema's ready; the feature isn't.

**5. Permanent logo SVG watermark background + letterhead.**
A `.brand-logo--watermark` CSS class is defined in the shared stylesheet, but nothing on any page actually uses it. The one place this matters most — the transcript/result page — shows a plain "TCC" text label and a dashed-border box literally captioned "School Logo," not an embedded crest. Defined in CSS, invoked nowhere.

## Holding, not violated

**3. Media/bulletin info on the main website.** Feed, sports, and awards pages exist and carry real content (Interhouse results, MVP callouts, etc.) — this is the one invariant that's actually functioning, even though its backing data is still localStorage rather than Supabase (see #6).

**7. Anything >10KB needs a good reason to be in the DB.** Nothing currently violates this — but only because photo/media storage hasn't been built at all yet (the result page's photo slot is a CSS placeholder, no image pipeline exists). Not evidence of compliance so much as the feature not existing yet to test it against.

**Architecture itself** (SvelteKit/Supabase/three-repo split) — intact, nothing has drifted from that.

## The one thing worth acting on before anything else

Item 8's access-control gap isn't a missing feature, it's an exposed one — real student data with zero gate in the current deployed code. Everything else on this list is a "not built yet." That one is a "built wrong, right now."
