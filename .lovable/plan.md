## Plan

Replace the current local assessment engine with a backend-powered Gemini workflow while preserving the existing candidate-facing flow and PDF export.

### What will change

1. **Backend AI function**
   - Add a Lovable Cloud backend function that calls the direct Gemini API using the existing `GEMINI_API_KEY` secret.
   - Keep prompts and response shaping on the backend, not in the browser.
   - Support these stages:
     - skill extraction from job description + resume
     - prioritized skill map generation
     - adaptive question generation
     - answer evaluation and scoring
     - final learning-plan generation

2. **Frontend data flow update**
   - Replace `buildSkillMatrix`, `getQuestionForSkill`, `recordTurn`, `buildAssessmentSummary`, and `buildLearningPlan` as the primary runtime path with backend calls.
   - Keep the existing UI structure:
     - input step
     - skill mapping review
     - assessment chat
     - results and learning plan
   - Add loading and error states for each backend step.

3. **State model refinement**
   - Extend the assessment types so the app can store AI-generated:
     - normalized skill evidence
     - per-turn evaluation notes
     - next-question decisions
     - final summaries and roadmap content
   - Keep the current client state hook, but make it orchestrate backend requests instead of local heuristics.

4. **Quality and fallback handling**
   - Validate backend inputs with schemas.
   - Handle API failures, malformed outputs, and empty model responses gracefully.
   - Keep a limited local fallback only if needed to avoid a dead-end experience during transient failures.

5. **Verification**
   - Test the full candidate flow end to end.
   - Confirm the learning plan still renders correctly and PDF export still works with AI-generated content.

### Technical details

- Create a backend function in `supabase/functions/.../index.ts` with CORS and input validation.
- Use the runtime secret `GEMINI_API_KEY`; do not expose it client-side.
- Call the backend from the React app using the existing Lovable Cloud client.
- Update `src/hooks/useAssessmentMachine.ts` to orchestrate async backend steps.
- Update `src/types/assessment.ts` to support richer AI payloads.
- Add a small client utility for invoking the backend cleanly.
- Keep the current components (`AssessmentChat`, `SkillMatrixSection`, `LearningPlanSection`) and adapt them to the new data contract rather than redesigning the app.

### Expected result

The app will stop using the deterministic local scoring logic as its main engine and instead generate real Gemini-powered skill extraction, interview questions, evaluation, and learning plans through Lovable Cloud, with the same in-app flow and PDF export preserved.