# Tendercare Suite — NEW Invariants AND DATAFLOW Audit (read-only, no code changed)

## Added context THESE ARE MULTIPLE AGENT READ AND FINALLY MY RESPONSE

**extra context**
This is a genuinely good audit, and I want to give you a straight read on it rather than just agree with it wholesale — some of it is confirmed by my own reading, some of it is now stale relative to work I've since done, and one framing point is worth pushing back on.

**Confirmed accurate, independent of my session:**
- No `teachers`/bio table, no promotion/archiving logic, no admin password-generator app, no cron/scheduled deletion for feed — I didn't check all of these myself but nothing I read contradicts them, and they're the kind of absence that's easy to verify by grep.
- The `remarks` table exists with no UI — I saw that schema too and didn't build against it.
- The feed running on `localStorage` while `feed_comments`/`feed_likes` sit unused in the schema — consistent with what I saw in `tendercare-web`.

**Now stale, because it predates my last two sessions:**
- **Item 5 (watermark/letterhead)** — this audit describes the pre-crest state exactly (plain "TCC" text, dashed "School Logo" box). That's fixed and verified in `tendercare-portal-full.patch` and `tendercare-web-nav-crest.patch` — crest is real, watermark renders and survives PDF export, confirmed via headless Chromium screenshots.
- **Item 8a's access-control claim ("no access control at all")** — also now stale. `tendercare-portal-full.patch` adds the password gate at `/result/[id]/login`, bcrypt-verified server-side. This audit is describing the exact gap I closed.

**Still fully accurate and unaddressed by anything I've built:**
- The Supabase-for-results contradiction itself. My patches made the *access to* Supabase-hosted results safer (password gate), but I did not move results back to hardcoded-in-repo, which is what your actual invariant says. I want to be direct about this: I built a better lock on the door your invariants say shouldn't be a door at all. That's a real gap between what I did and what you specified, not a disagreement — I should flag it rather than let the patch read as "invariant satisfied."

**Where I'd push back slightly on the audit's framing:** it says "no access control at all" as if that were simply a bug. It's more precise to say it was a deliberate, commented, temporary removal — your own instruction, to unblock other work, with the tradeoff written into the code by whoever removed it. Not a defense of leaving it that way, just: the audit reads slightly more alarming than the actual provenance, since it was a known, explicit tradeoff rather than an oversight.


## Contradicted by what's actually built
## The one thing worth acting on before anything else

Read it. This one has a real implication, worth flagging directly before anything else.

**The core architectural point in your reply — "I want results STATIC AND HARDCODED INTO REPO... Supabase should handle what it's best for in this context, not heavy report files or tedious network queries" — directly contradicts `tendercare-portal` as I built it.** My `/result/[id]` route does exactly what you're now saying not to do: a live Supabase query on every page load (`getStudent`, `getScores` in `lib/data.ts`). That's the same thing the first audit flagged as a contradiction of the original invariant, and now you've confirmed it a second time, more firmly. This isn't a small tweak — it's a "which of these two systems is actually the architecture" question.

That leaves a real fork, worth deciding rather than me guessing:

**Option A — `tendercare-portal` gets retired**, and the 267-file static report-sheet system in `UTMEDaily/Tendercare/Directory` (already doing exactly what you want — hardcoded, in-repo, offline-capable) becomes the *only* result-viewing system. `tendercare-portal` either goes away or gets repurposed for something Supabase is actually good for here (staff-side roster management UI, maybe).

**Option B — `tendercare-portal` gets converted to build-time static generation.** SvelteKit can prerender every `/result/[id]` route at build time (using `entries()` to enumerate all 376 student IDs), reading from Supabase only during that build step — never at runtime. The deployed app becomes static HTML files, same "hardcoded and stay in repo" property you want, but Supabase stays useful as the *authoring* backend (where scores actually get entered) instead of being queried live by students viewing results. This is the same pattern `tendercare-web` already uses (`adapter-static`, fully prerendered).

Both are legitimate reads of "antifail" — A is simpler and matches what already exists; B keeps one system instead of two but requires a rebuild trigger every time scores change (a redeploy, not a live update).

Separately, worth naming since it's a decision, not a bug: right now there are **two independent result-viewing systems that do the same job differently** — the static 267-file directory (matches your spec) and `tendercare-portal` (doesn't). If both stay, that's fine as long as it's deliberate, not an accident nobody flagged.

Which way do you want to go?

** SUPABASE STRAETEGY.** MY RESPONSE TO THIS IS THAT LIVE UPDATES ARE VERY IMPORATNT TO SCORE/TRANSCRIPT GENERATION/UPDATE. ANYTHING ITS VERY GOOD AT IS WELCOM, AS FAR AS IT DOESNT VIOLATE MY DOCTRINE AND PROJECT INVARIANTS.

then this happened:
Good — 12 class-arms confirmed (JSS1A/B, JSS2A/B, JSS3A/B, SS1/SS2/SS3 × Science/Actuarial). Building the pipeline now: schema, template, generator script, one example per arm. Then the patches, watermarks, and bio placeholders. Let me work through this in order.Now the seniority-mapping config and the Jinja2 template, based on the existing `TCH-2025-032` multi-term pattern generalized to N years:Now the crest include (extracted once, shared by every generated file) and the generator script itself:Now the generator script itself:Now generating one example JSON per class-arm — using real data for the two I have (JSS1B, SS1 Science) and clearly-labeled demo data for the other ten, so nothing here could be mistaken for a real student record.Now running the generator against all 12:Pipeline verified — computed total (828) exactly matches the real source file, structure intact, no unrendered template tags. Now applying the three patches, starting with the simplest.Now the teacher-full patch:Applied. Now adding the watermark background to this new home page myself, since the patch only added a small crest icon.Now the portal patch — but this needs adapting first, since the user wants results static/hardcoded rather than live Supabase queries. Let me check what the patch actually does to the result page before applying it.Applied. Now adapting the result page so it serves the static hardcoded report instead of querying Supabase for scores:Now simplifying the template's rendering block, since the full transcript is now the static file, not inline Svelte markup:Now fixing the leftover `student` reference in the page title:Now let's confirm the CSS doesn't reference now-dead classes in a way that breaks the build, and populate `static/reports/` with the 12 pipeline examples, then build-check the whole thing.Now let's check if `$lib/data.ts`'s `getStudent`/`getScores`/`getClassSize` are still used anywhere else (the directory page, perhaps) before removing/leaving them, then build-check.Just the explanatory comment — no actual code references left. Good, `$lib/data.ts` is now unused by the result page but still exported for the directory page (`listDirectory`). Let's build-check.Build succeeds cleanly. Now let's clean up and do the same for the directory page and teacher homepage (watermark), then move to the bio placeholder sections.Both directory pages already have the crest watermark treatment under a different class name (`.bg-crest`) than what I grepped for last time — false alarm from my earlier check, good thing I verified rather than redoing already-done work. Two real items left: the stakeholder-bio placeholder section, and the remarks editing UI (schema+RLS already exist, just needs the actual UI wired up with correct permissions).Now the remarks UI in `tendercare-teacher` — schema and RLS already exist, just needs the actual editing surface. Let me check the RLS policy first so the UI respects it correctly.Hit the tool-use limit mid-execution — here's exactly where things stand, so nothing gets lost.

**Done and verified (build-checked, not yet pushed):**
- **Pipeline** (`/home/claude/pipeline/`): schema, seniority map, Jinja2 template, `generate.py`. Verified against real data — regenerating TCH-2025-032 from raw JSON reproduces the exact 828 total the real file has. 12 example outputs generated (one per class-arm: 2 using real digitized scores, 10 clearly-labeled `TCH-0000-*` demo data, never colliding with real IDs).
- **`tendercare-web`**: nav-crest patch applied. Added a dedicated "Stewardship" placeholder section on the About page for stakeholder/family-office bios — clearly marked as content you'll add directly by editing the file, not generated or DB-backed.
- **`tendercare-teacher`**: full patch applied (login, roster gate, RLS role-sync migration, atomic student-ID function). Added a real watermark background to the new homepage (patch only had a small icon).
- **`tendercare-portal`**: full patch applied (crest, watermark, fixed display bug, password-gate mechanism). Then **rewired `/result/[id]`** to stop querying Supabase for scores entirely — it now serves the static generated report file from `static/reports/` (bundled the 12 pipeline examples there) after the password check, with a proper not-yet-generated fallback state. Build passes clean. Confirmed both directory pages (portal's and the static one) already have the crest watermark under a different class name than I originally grepped for — that item wasn't actually a gap.

**Not yet done:**
- The remarks editor UI on the teacher roster page — I was mid-edit (had just read the roster page structure, RLS confirmed as `staff`-role-gated on the `remarks` table) when I hit the tool limit. Nothing written yet for this piece.
- Nothing has been committed or pushed in this turn — all changes above are sitting locally across the three repo clones.

**Next message, I'll:** build the remarks editor (staff-only, respecting the existing RLS policy), then commit and push all three repos, and give you one final summary of the full diff before you vet it...[this is what the other agent is currently building]
