# Tutor evidence and usability enhancement

Builds on `61e6fb3` on `codex/professional-learning-ui`. At implementation time,
the fetched `origin/main` was still `cb93f6f`; no teammate commits were replaced.

## Behavior

- Students can expand source passages with document, page and section metadata.
- Both tutor services return the complete retrieved chunk instead of cutting it
  at 200 characters. The existing response schema and four-source limit remain.
- Retrieval similarity is no longer shown as an apparent answer-confidence percentage.
- The tutor distinguishes course-grounded responses from missing evidence without
  claiming that retrieval verifies an answer's factual accuracy.
- Course/topic controls fit narrow screens. Changing scope clears the visible
  conversation and starts a fresh session; selectors are disabled during a request.
- Failed questions return to the input for editing and resubmission. Inputs respect
  the API's 2,000-character limit and controls have accessible labels.

No database migration, new endpoint, production dependency or credential change.
Returning full chunks increases response payload size according to retrieved chunk
length; the UI bounds each passage's scroll area. This is a chunk viewer, not a
complete document viewer. Live OpenRouter and PostgreSQL still require staging checks.

## Validation

- Production build and four study-plan tests pass.
- Backend suite: 47 tests pass, including full-source preservation and absent-evidence
  tests for both tutor paths; one upstream Starlette deprecation warning remains.
- Browser checks with API fixtures cover full passage expansion, mobile overflow,
  topic/session reset, failed draft recovery, missing evidence and input length.
- Existing student dashboard browser checks pass.

From `frontend`: `npm run build`, `npm run lint`,
`node --test tests/studyPlan.test.mjs`.

From `backend`, with isolated database/document settings: `python -m pytest -q`.

For the browser test, start Vite on port 5175 and run
`node frontend/tests/tutor-browser.cjs` from the repository root. The test requires
Playwright and installed Microsoft Edge. Set `PLAYWRIGHT_MODULE` to an existing
Playwright module path if it is not installed locally, and `TEST_BASE_URL` to change
the default `http://127.0.0.1:5175/student`. No real account or API key is used.
