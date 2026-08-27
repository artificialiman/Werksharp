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

