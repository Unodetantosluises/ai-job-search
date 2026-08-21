# /rank - Triage Scraped Jobs into a Ranked Shortlist

You are batch-scoring the jobs that `/scrape` has collected, so the user can decide where to spend `/apply` effort. `/scrape` finds and dedupes postings; `/apply` evaluates one at a time in depth. `/rank` is the bridge: it scores every new posting against the fit framework and returns a ranked shortlist.

`/rank` produces **triage scores**, not final evaluations. It scores from the posting text and the candidate profile only - no company research, no reviewer agent. `/apply`'s Step 1 evaluation (which adds company research) remains authoritative and always re-runs when the user applies.

Follow these steps **in order**.

---

## Step 0: Parse Input

`$ARGUMENTS` may contain:

- Nothing â†’ rank all jobs with status `new` in `job_scraper/seen_jobs.json`
- A focus area (e.g. `/rank data science`) â†’ rank only jobs whose title or stored fit-notes match the focus
- `--all` â†’ re-rank every job that has not been applied to, including previously ranked ones (useful after the profile changes)
- `--top <N>` â†’ shortlist size (default 5)

---

## Step 1: Load State

1. Read `job_scraper/seen_jobs.json`. If the file is missing or has no entries, tell the user to run `/scrape` first and stop.
2. Read `job_search_tracker.csv`. Build the exclusion set: any company+role already in the tracker is out of scope regardless of flags - it has been applied to or consciously tracked.
3. Select candidates: entries with status `new` (or all non-applied entries with `--all`), minus the exclusion set, filtered by the focus area if one was given.
4. If no candidates remain, say so ("Nothing new to rank - run /scrape to find fresh postings") and stop.
5. Read the scoring framework and profile **once**:
   - `docs_prompts/skills/job-application-assistant/04-job-evaluation.md`
   - `docs_prompts/skills/job-application-assistant/01-candidate-profile.md`

State how many jobs will be ranked before proceeding.

---

## Step 2: Batch-Fetch and Score

Dispatch parallel `general-purpose` agents via the **Agent tool**, ~5 jobs per agent (a single agent is fine for â‰¤5 jobs). Token-efficiency rules, consistent with `/apply`:

- Pass each agent everything it needs **inline in the prompt** - the job list (title, company, URL) and a compact scoring rubric extracted from the files you read in Step 1: the strong/moderate/weak skill match areas, direct/adjacent experience domains, behavioral thrive/drain factors, career goals, deal-breakers, and the location constraints. Do **not** make agents re-read the profile files.
- Agents fetch each posting URL with WebFetch and score **only from actually fetched content**. If a URL is dead, redirects to a listing page, or the posting has expired, the agent marks that job `expired` - it never scores from the title alone and never fabricates posting content.
- Scope is triage: posting text vs. rubric. **No company research, no salary lookup, no web searches** - that depth belongs to `/apply`.

Each agent returns a JSON array, one object per job:

```json
{
  "key": "<the job's key in seen_jobs.json>",
  "status": "scored" | "expired",
  "scores": { "technical": 0-100, "experience": 0-100, "behavioral": 0-100, "career": 0-100 },
  "location": "PASS" | "FAIL" | "FLAG",
  "deadline": "YYYY-MM-DD" | null,
  "strengths": ["1-3 bullets, grounded in the posting text"],
  "gaps": ["1-3 bullets, honest"],
  "language": "<posting language>"
}
```

Scoring uses the **five dimension definitions** from `04-job-evaluation.md` (Technical Skills, Experience Match, Behavioral/Culture Fit, Location, Career Alignment) and their weights. The honesty rule applies to triage too: gaps are stated, never smoothed over, and a posting that is a poor fit gets a low score even if it looks prestigious.

> **Scope note â€” Skill Gap Classification gate does NOT apply here.** The gate defined in `04-job-evaluation.md` (classifying each posting skill as Direct Match / Logical Implication / Unconfirmed / Confirmed Gap and asking the user about each Unconfirmed one) is a pre-drafting requirement for `/apply`. `/rank` is non-interactive batch triage â€” there is no user to ask. Instead, score each skill dimension against the candidate profile directly: skills present in the profile contribute positively to the Technical Skills score; skills absent from the profile and not logically implied count as gaps and lower the score. Record them in the `gaps` array. The classification gate runs later, when the user picks a job and `/apply` starts.

---

## Step 3: Aggregate and Rank

Back in the main context, for each scored job:

1. Compute the overall score with the weighting from `04-job-evaluation.md` (Technical 30%, Experience 25%, Behavioral 15%, Career Alignment 30%; location is unweighted).
2. Map to the framework's verdict bands (Strong Fit 75+, Good Fit 60-74, Moderate Fit 45-59, Weak Fit 30-44, Poor Fit <30).
3. **Location veto:** `FAIL` (e.g. requires relocation) excludes the job from the shortlist no matter the score - list it separately with the reason. `FLAG` (e.g. heavy travel) stays in the ranking but carries a visible âš  marker for the user to judge.
4. **Deadline urgency:** a deadline within 7 days gets a ðŸ”¥ marker and wins ties. A deadline that has already passed moves the job to `expired`.

Sort by overall score (descending), urgency as tiebreaker.

---

## Step 4: Update State

Update `job_scraper/seen_jobs.json` in place - these fields are additive to the scraper's schema:

- Ranked jobs: set `"status": "ranked"` and add `"rank_score": <overall>`, `"rank_verdict": "<band>"`, `"rank_date": "YYYY-MM-DD"`
- Dead or past-deadline jobs: set `"status": "expired"`

Do not modify `job_search_tracker.csv` - that file records applications, and `/rank` never applies. Re-running `/rank` is idempotent: already-`ranked` jobs are skipped unless `--all` re-scores them.

---

## Step 5: Present the Shortlist

```
## Job Ranking - YYYY-MM-DD

Ranked <N> new postings (<X> shortlisted, <Y> below threshold, <Z> expired/vetoed).

### Shortlist

| # | Score | Verdict | Title | Company | Location | Deadline | |
|---|-------|---------|-------|---------|----------|----------|---|
| 1 | 78 | Strong Fit | ... | ... | ... | ... | ðŸ”¥ |

### Why these ranked highest
**1. <Title> at <Company> (78)** - [2-3 strength bullets and the honest gap, from the agent's findings]
[repeat for each shortlisted job]

### Below threshold
| Score | Verdict | Title | Company | One-line reason |

### Excluded
- <Title> at <Company> - location FAIL: requires relocation
- <Title> at <Company> - expired <date>
```

Rules for the presentation:

- Every claim traces to fetched posting text or the profile - no invented details.
- Say explicitly that these are **triage scores from the posting text only**, and that `/apply` will re-evaluate with company research before anything is drafted.
- Then ask: "Want to apply to any of these? Give me the number(s) and I'll start with the full `/apply` workflow."
- If the user picks one, run the `/apply` workflow on that job's URL, passing the triage verdict as prior context but **re-running the full Step 1 evaluation** - triage never substitutes for it.

---

## Important Rules

1. **Never rank unfetched postings.** A job whose posting cannot be retrieved is marked expired, not guessed at.
2. **Triage depth only.** No company research, no salary lookups, no reviewer agents - `/rank` exists to be cheap enough to run on every scrape batch.
3. **Deal-breakers veto scores.** A 90-point job that fails a location deal-breaker is excluded, not ranked first.
4. **Honest scoring.** Gaps are reported per job; a low-scoring posting is presented as such. The score bands and weights come from `04-job-evaluation.md` - if the user disagrees with a ranking, the fix is updating their profile or the framework, not bending scores.
5. **State stays consistent.** `seen_jobs.json` fields are only added, never restructured, so `/scrape`'s dedup keeps working; the tracker is read-only for this command.

