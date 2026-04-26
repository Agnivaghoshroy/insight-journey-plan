# Fix mid-interview validation crash

## What's happening

Two issues combine to produce the giant red error blob in the chat:

1. **Backend schema is too strict** for mid-flow responses
   - `nextQuestion` is required as an object, but it's legitimately `null` when the assessment completes.
   - `summaries[]` and `plan` are validated even when the AI returns them as empty/partial during follow-up turns.
   - `strengths` and `gaps` are capped at 4 items — the model frequently returns 5+, causing a hard crash.
   - Some required nested fields (`requiredLevel`, `assessedLevel`, etc.) are demanded even when the model only sends a quick interim turn.

2. **Frontend renders the raw Zod error**
   - `assessmentApi.ts` concatenates `error + details` and rethrows. When `details` is the Zod `flatten()` object, it gets stringified and dumped into `validationError`, which `AssessmentChat.tsx` renders verbatim in red.

## Fix

### Backend (`supabase/functions/assessment-ai/index.ts`)
- Make the evaluation schema **lenient and forgiving**:
  - `nextQuestion`: `.nullable().optional()` (handle null + missing).
  - `summaries`: optional, each field `.optional()` with sensible defaults applied after parse.
  - `plan`: already optional/nullable — keep, but make inner fields optional too.
  - `strengths` / `gaps`: remove the `.max(4)` cap (or raise to 8) and `.optional()`.
  - `turn.followUp`: `.optional().default(false)`.
- Use `.safeParse()` instead of `.parse()`. If parsing fails, log the issue but **fall back gracefully**: build a minimal valid turn from what came back (score, notes if present) so the interview keeps moving instead of 500-ing.
- Strengthen the system prompt: explicitly instruct the model to return at most 4 strengths/gaps and to set `nextQuestion: null` when complete.
- Same lenient treatment for `mapResponseSchema` (loosen array caps, make `aliases`/`resumeContext` optional).

### Frontend
- **`src/lib/assessmentApi.ts`**: stop concatenating `details` into the thrown error message. Throw only the human-readable `error` string. Keep `details` for console logging only.
- **`src/components/assessment/AssessmentChat.tsx`**: clamp `validationError` rendering to a single line and truncate at ~200 chars with `line-clamp-2` so a future malformed payload can never blow up the UI again.
- **`src/hooks/useAssessmentMachine.ts`**: when an evaluation fails, keep the user's draft answer in the textarea (don't clear it) so they can retry without retyping.

## Result

- Follow-up questions render normally (no more crash mid-interview).
- If the AI returns a slightly out-of-spec payload, the function patches it instead of failing.
- Any error that does surface shows a short, friendly message — never raw JSON.
