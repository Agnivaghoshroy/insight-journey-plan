## Plan

Build a candidate-facing, single-session MVP that takes a job description plus resume, runs a focused AI interview on the most important skills, and returns a polished in-app learning plan with optional PDF export.

### What the app will do

1. **Input step**
   - Let the candidate paste a job description.
   - Let the candidate paste resume text or upload a resume file.
   - Show a clean review step before starting the assessment.

2. **Skill extraction and mapping**
   - Extract required skills from the job description.
   - Extract claimed skills and experience signals from the resume.
   - Build a skill matrix with these buckets:
     - Matched & strong
     - Matched & weak
     - Gap
     - Bonus
   - Prioritise the top **5–8 highest-value skills** for the assessment to keep the experience focused.

3. **Conversational assessment flow**
   - Present the interview as a professional chat-style experience.
   - Start at an intermediate level for matched skills.
   - Adapt follow-up questions based on answer strength.
   - Ask clarifying probes when answers are vague.
   - Keep the interview time-boxed and visibly progress-driven.

4. **Assessment scoring and gap analysis**
   - Score each assessed skill with a simple, understandable proficiency scale.
   - Compare required vs assessed proficiency.
   - Rank the most important gaps by impact and learnability.
   - Highlight adjacent skills the candidate can realistically learn next.

5. **Personalised learning plan output**
   - Generate an in-app report with:
     - Top skill gaps
     - Why each gap matters for the target role
     - A milestone-based roadmap for each priority skill
     - Curated current learning resources
     - Time estimates per skill and for the full plan
   - Support **PDF export** of the final plan.

### UX and design direction

- Professional, minimal, recruiter-grade presentation.
- No unnecessary visual noise or playful styling.
- Strong hierarchy, generous spacing, and clear step-by-step flow.
- Mobile-friendly layout that works well in narrow viewports.

### Proposed app structure

```text
Landing / Intro
  -> Input workspace (JD + Resume)
  -> Skill mapping summary
  -> Conversational assessment
  -> Results dashboard
  -> Learning plan view
  -> PDF export
```

### Implementation phases

#### Phase 1 — MVP foundation
- Replace the placeholder homepage with a polished single-page experience.
- Create the main sections and state flow for input, assessment, and results.
- Define reusable UI components for steps, cards, chat messages, and result sections.

#### Phase 2 — AI workflow
- Add AI-powered extraction for JD skills and resume skills.
- Add AI-generated adaptive interview questions for the prioritised skills.
- Add answer scoring, confidence handling, and gap ranking.
- Add learning-plan generation with curated resources and time estimates.

#### Phase 3 — Output and refinement
- Build the final report view.
- Add PDF export for the generated learning plan.
- Refine loading, empty, and error states.
- Polish copy, spacing, and interaction details for a clean final experience.

## Technical details

- Use the existing React + TypeScript + Tailwind setup.
- Keep the frontend modular with clearly separated sections for:
  - parsing/mapping
  - interview state
  - scoring/gap analysis
  - learning plan rendering
- Use Lovable AI through backend functions rather than client-side prompts.
- Structure the AI flow so each stage has a focused responsibility:
  - extract skills
  - generate questions
  - evaluate answers
  - produce plan
- For resume uploads, support text-first parsing in MVP and include file handling for common formats.
- Generate the PDF from the final report so the exported version matches the in-app plan.
- Keep the codebase clean by using small components, typed data models, and shared utility functions instead of oversized page files.

## Deliverables

- Candidate-facing single-session web app
- Focused adaptive AI assessment for top 5–8 skills
- Skill gap and adjacency analysis
- Personalised learning plan shown in-app
- PDF export of the learning plan
- Minimal, professional UI with clean code structure