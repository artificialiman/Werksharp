# Cross-check: Teacher-care handoff patches + report-sheet migration status

Nothing has been applied or pushed yet. This is the crosscheck you asked for — read this, then tell me what to actually execute.

## Part 1 — The three unapplied patches (Teacher-care handoff)

Another agent session left three fully-written `git diff` patches sitting in `Teacher-care/handoff/`, built read-only against fresh clones (no push access from that session). They're solid work. Summary of what each does:

- **`tendercare-web-nav-crest.patch`** — vendors the real crest SVG, replaces the nav's `<span>TCC</span>` placeholder with it.
- **`tendercare-teacher-full.patch`** — real `/login` (Staff/Admin dropdown, Supabase Auth session), `/roster` now requires that session, a rebuilt home page (was the untouched SvelteKit starter stub I flagged earlier), a migration fixing the RLS role check (`user_metadata` → `app_metadata` sync), and an atomic `create_student()` Postgres function replacing the racy read-max-then-insert student ID allocation.
- **`tendercare-portal-full.patch`** — crest + watermark on the directory and result pages, a fixed `display:none` bug that made the result sheet invisible outside print, and — this is the important one — **a real password gate on `/result/[id]`**, checked server-side against a bcrypt hash. This directly closes the "anyone who knows a student ID can view their transcript, no gate at all" hole I flagged in the last audit.

All three are internally consistent with each other and with what you asked for originally (shared staff/admin logins, one shared student password gating by ID — same shape, deliberately easy to replace later with real per-person auth). I'd recommend applying all three once you confirm — they fix a real, currently-live security gap.

**What they do *not* touch, confirmed by reading the actual diffs, not just the handoff notes:**
- The teacher homepage patch adds a small centered crest icon (4.5rem, inline), **not a watermark background**. The component comment even says it's designed to work "wherever it's placed (dark nav, cream letterhead, watermark, etc.)" — it's just not used as a watermark here.
- Nothing in any patch touches teacher/principal remarks — the `remarks` table + RLS I found in the last audit are still schema-only, no UI.

## Part 2 — The report sheets (UTMEDaily/Tendercare/Directory)

This is a separate system from the three Svelte apps — 267 individually hardcoded, per-student HTML files plus one `student-directory.html` index. I pulled all 267 and checked each one directly rather than sampling.

**126 already use the multi-term/year navigation pattern** (year sections, term pills, placeholder panels for terms not yet digitized) — this is a real, working standard, not a mockup. TCH-2025-032 is a good example: a JS1 student showing all three terms of 2025/2026, two marked "Record not yet digitized," one populated.

**141 are still on the old single-term format** — no year/term nav at all, just one flat term. These are the ones that need the upgrade:

```
091–115  (25 files)
184–241, 244–269  (74 files)
303–334  (32 files)
```

Both formats already correctly keep the Class Teacher's Comment and Principal's Comment boxes — that's not at risk from anything I'd do, it survives the format migration either way since the newer template kept the same two boxes.

**Watermark check, specifically:** every report sheet I read (old and new format alike) already has `.watermark-crest` applied — that part of your ask is already universal at the individual-report level. The gap is elsewhere:
- `student-directory.html` (the master index) — **zero occurrences of watermark anywhere**.
- `tendercare-teacher`'s homepage (in the unapplied patch) — icon only, no watermark, as above.

## What I'd propose, in order

1. **Apply and push the three existing patches as-is** — they're sound, and the portal one closes a live security hole. Low-risk, already fully written.
2. **Add a real watermark background** to `student-directory.html` and to `tendercare-teacher`'s new home page (on top of the patch, since the patch itself doesn't do this) — small, contained changes.
3. **The 141-file report migration** is the big one. Before I touch any of these I need to know, per student: which class/seniority level they're actually at (to know how many years back to show) and whether CSV data exists for those earlier terms or if they should render as "not yet digitized" placeholders like the JS1 example does. That's a data question, not a code question — I don't want to guess seniority or fabricate term history for 141 real students' transcripts.
4. **Not yet addressed by anything above, from the last audit:** stakeholder/family bios, and automatic promotion/archiving. Still nothing built for either — worth deciding if they're in scope for this round or a later one.

## Quick critique, since you asked

my reply:
regenerating ALL the report cards is unnecessary, a python script with do that... you just need to execute the schema, template and 1 transcript/class-arm
any unaddressed bio/info should have a placeholder section, just make sure to handle their funtionality/permissions. ill add their info manually... its the biggest "secret" of the entire build
i want the resuls STATIC AND HARDCODED INTO REPO... supabase should handle what its best for in this context, not heavy report files or tedious network queries... il figure out a proper auth/security policy soon, for now we are still firmly within the antifail mindset
asides these small additions you are SPOT-ON AND FREE TO EXECUTE

The thing that stands out most isn't a missing feature, it's the **inconsistency between the two live systems**. The static report-sheet directory does exactly what you specified from the start — hardcoded, in-repo, password-gated, no database dependency, works offline. The Supabase-backed `tendercare-portal` does the opposite of what you specified — live DB reads, and until these patches land, no gate at all. If both are staying in play deliberately (e.g. static directory as the source of truth, portal as a nicer-UI mirror), that's a reasonable design — but it's worth being explicit that they're two different architectures serving the same purpose, so nobody assumes fixing one fixes the other.

Tell me which of the four items above to actually execute, and I'll get moving.
