# Job Evaluation Framework

<!-- SETUP: Skill match areas and career goals are personalized by running /setup -->

## Scoring Dimensions

Evaluate each job posting against these five dimensions:

### 1. Technical Skills Match (0-100)
How well do the required/preferred skills align with the candidate's capabilities?

| Score | Meaning |
|-------|---------|
| 80-100 | Core requirements are primary skills |
| 60-79 | Most requirements match, 1-2 gaps that are learnable |
| 40-59 | Partial match, significant upskilling needed |
| 0-39 | Fundamental mismatch |

**Strong match areas:** [YOUR_PRIMARY_SKILLS]
**Moderate match areas:** [YOUR_SECONDARY_SKILLS]
**Weak match areas:** [SKILLS_YOU_LACK]

### Skill Gap Classification (MANDATORY before drafting)

For every required/preferred skill in the posting, classify it into exactly one bucket. This table is not optional commentary — `/apply` Step 2 (drafting) may not write a technology term into the CV unless it resolves to **Direct Match** or **Logical Implication** below. Everything else must be resolved with the user before drafting starts.

| Bucket | Definition | What the drafter may do |
|---|---|---|
| **Direct Match** | The skill appears in `01-candidate-profile.md`, verbatim or as a trivial synonym. | Use it, at the proficiency level the profile states — never upgrade "familiar" to "avanzado" to match the posting's wording. |
| **Logical Implication** | Not named in the profile, but strictly and technically implied by something that is (e.g. Node.js is implied by Express.js/NestJS experience, since both run on the Node.js runtime; SQL is implied by PostgreSQL/SQL Server experience). This is not a stretch — it is already true. | Use it. Note in the CV generation log which documented skill implies it, so the reasoning is auditable later. |
| **Unconfirmed Possible Match** | Not in the profile and not a strict logical implication, but plausible the candidate has real undocumented experience with it (e.g. a common utility, testing framework, or minor library that is adjacent to the candidate's documented stack — something they could reasonably have used but never wrote down). | **May not be used without asking.** See the gate below. |
| **Confirmed Gap** | Not in the profile, no logical implication, and the user has confirmed (this session or a prior one) they do not have real experience with it. | Never use it in the CV. Acknowledge honestly in the cover letter per `03-writing-style.md`'s reframing rules if it's a significant posting requirement. |

**Gate for Unconfirmed Possible Match:** before proceeding to drafting, ask the user directly, one question per skill: *"La vacante pide [skill] y no está en tu perfil — ¿tienes experiencia real con esto? Si sí, ¿qué nivel?"* Do not infer an answer, do not default to including it, and do not default to omitting it either — both are guessing. On a "yes," add the skill to `01-candidate-profile.md` before drafting (so it's documented once, not re-litigated on every future application) and treat it as a **Direct Match** from that point on. On a "no," reclassify as **Confirmed Gap**.

Never invert this: a skill is not "probably fine to include" just because the posting needs it and the candidate seems like the type of person who might know it. Plausibility is exactly what should trigger the question, not substitute for it.

### 2. Experience Match (0-100)
Does work history align with what they're looking for?

| Score | Meaning |
|-------|---------|
| 80-100 | Direct experience in the same domain and role type |
| 60-79 | Related experience, transferable skills clear |
| 40-59 | Adjacent experience, would need to make the case |
| 0-39 | Unrelated experience |

**Strong:** [YOUR_DIRECT_EXPERIENCE_DOMAINS]
**Moderate:** [YOUR_ADJACENT_EXPERIENCE]
**Entry-level:** [ROLES_WITH_LIMITED_EXPERIENCE]

### 3. Behavioral/Culture Fit (0-100)
Does the role and company culture match the behavioral profile?

| Score | Meaning |
|-------|---------|
| 80-100 | Culture strongly matches behavioral preferences |
| 60-79 | Mixed signals but mostly compatible |
| 40-59 | Some friction areas |
| 0-39 | Significant culture mismatch |

**Red flags to research:** Department disorganization, work dominated by maintenance over development, poor chemistry with leadership, culture mismatches. Check reviews, media coverage, LinkedIn connections, and network contacts for insider perspective.

### 4. Location & Logistics (Pass/Fail + Notes)
- Within commute range: PASS
- Remote with occasional office: PASS
- Requires relocation: FAIL (deal-breaker)
- Frequent international travel: FLAG (discuss with user)

### 5. Career Alignment & Motivation (0-100)
Does this role advance career goals and contain tasks that energize?

| Score | Meaning |
|-------|---------|
| 80-100 | Strongly aligned with career direction, clear growth path |
| 60-79 | Good role but only partially aligned with long-term goals |
| 40-59 | Decent job but doesn't build toward career goals |
| 0-39 | Dead end or backwards step |

**Career goals:**
- [YOUR_CAREER_GOAL_1]
- [YOUR_CAREER_GOAL_2]
- [YOUR_CAREER_GOAL_3]

**Motivation filter:** Evaluate not just whether you *can* do the tasks, but whether the tasks will *energize* you. Consider:
- Tasks that energize: [YOUR_ENERGIZING_TASKS]
- Tasks that drain: [YOUR_DRAINING_TASKS]
- Non-task factors: leadership style, department culture, company values, degree of autonomy

**Life situation alignment:** Consider personal constraints:
- **Security**: [YOUR_FINANCIAL_SITUATION_CONTEXT]
- **Flexibility**: [YOUR_SCHEDULE_CONSTRAINTS]
- **Professional development**: [YOUR_GROWTH_PRIORITIES]

### 6. Salary Benchmark (Optional)

If the salary lookup tool is configured (`salary_data.json` exists), look up the company:
```
python salary_lookup.py "<Company Name>" --json
```

If a city is known from the posting, add `--city "<City>"` to narrow results.

Present findings as:
```
### Salary Benchmark
| Metric | Value |
|--------|-------|
| [Category] index | XX.X (+/-X.X% vs baseline) |
| Overall index | XX.X (+/-X.X% vs baseline) |
```

Interpret results relative to the baseline defined in the data file's metadata. For index-based data, higher typically means above-market compensation.

If the salary tool is not configured, skip this section.

## Output Format

Present the evaluation as:

```
## Job Fit Evaluation: [Role] at [Company]

| Dimension | Score | Notes |
|-----------|-------|-------|
| Technical Skills | XX/100 | [brief note] |
| Experience Match | XX/100 | [brief note] |
| Behavioral Fit | XX/100 | [brief note] |
| Location | PASS/FAIL | [brief note] |
| Career Alignment | XX/100 | [brief note] |

**Overall Score: XX/100** (weighted average of scored dimensions)

### Verdict: [Strong Fit / Good Fit / Moderate Fit / Weak Fit / Poor Fit]

### Key Strengths for This Role
- [bullet points]

### Skill Gap Classification
| Skill | Bucket | Resolution |
|---|---|---|
| [skill] | Direct Match / Logical Implication / Unconfirmed Possible Match / Confirmed Gap | [what happens with it in the CV, or "asked user - pending"] |

### Gaps to Address
- [bullet points - Confirmed Gaps only, framed for honest cover-letter acknowledgment]

### Recommendation
[1-2 sentences: apply/skip/apply with caveats]

### Company Research Checklist
- [ ] Checked company website (mission, values, recent news)
- [ ] Checked review sites (Glassdoor, Jobindex, etc.)
- [ ] Checked LinkedIn for team size, recent hires, connections
- [ ] Checked media for restructuring, growth, or workplace issues
- [ ] Identified network contacts who may know the team/manager
```

## Weighting
- Technical Skills: 30%
- Experience Match: 25%
- Behavioral Fit: 15%
- Career Alignment: 30%

(Location is pass/fail, not weighted)

## Thresholds
- **Strong Fit** (75+): Definitely apply, tailor everything
- **Good Fit** (60-74): Apply, address gaps in cover letter
- **Moderate Fit** (45-59): Consider carefully, discuss with user
- **Weak Fit** (30-44): Probably skip unless strategic reasons
- **Poor Fit** (<30): Skip

## Overqualification & Downskilling Trigger (Modo Adaptación Operativa)

When evaluating roles in **logistics, warehousing, retail, manual operations, customer support, or entry-level clerical work** where the formal requirements are basic (e.g., "mayor de 18 años", "secundaria o preparatoria concluida", "disponibilidad de horario"):

1. **Invert the Technical Match:** Advanced engineering, legal, or financial competencies must NOT be scored as a positive match — they represent an immediate **Overqualification Risk** (*Flight risk* or compensation mismatch for HR recruiters).
2. **Flag Overqualification Risk:** If the candidate's core profile is heavily specialized and the vacancy is entry-level/operational, the evaluator must output:
   `⚠️ HIGH OVERQUALIFICATION RISK: Role requires Downskilling protocol.`
3. **Trigger Downskilling Mode:** Instruct the candidate to apply using the flag `--downskilling` (or `-ds`), activating the rules documented in `08-cv-downskilling.md` to prune specialized titles, de-jargonize real achievements, and emphasize operational reliability, discipline, and schedule flexibility.


## Pre-Application: Call the Employer (Best Practice)


Before writing the application, consider whether the candidate should call the contact person listed in the posting. **Only call if there are substantive questions** - never call just to "be remembered."

### When to Suggest Calling
- The posting has unclear or ambiguous requirements
- It's unclear which competencies are essential vs. nice-to-have
- The role description is vague about day-to-day tasks
- There's a named contact person who invites questions

### Good Questions to Ask
- "What are the primary challenges in this role?"
- "How is time typically divided across the listed responsibilities?"
- "Which competencies are most critical for success in this position?"
- "What does success look like in the first 6-12 months?"

### Rules for the Call
- Prepare a 30-second "elevator pitch" about your background in case they ask
- The call's purpose is **gathering information**, not delivering a pitch
- Take notes - use what you learn to tailor the application
- Reference the conversation naturally in the cover letter ("After speaking with [name], I was especially drawn to...")
