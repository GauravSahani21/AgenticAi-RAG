# AdaptiveLearn AI — UI contribution

A focused improvement to the existing project, based on commit `cb93f6fc9d529d96ce3189884ac1606c2f01ead2`.
Review branch: `codex/professional-learning-ui`. This contribution does not modify the main branch.

## Implemented

- Refined student workspace with navy/teal styling, clearer spacing and lightweight CSS 3D geometry. No new production dependencies or external assets.
- Topic search across name, module and description, combined with progress filters.
- Explainable next-study suggestion: weakest topic needing review, then ongoing learning, then the next unstarted topic. Uses existing learning-state API data and opens the existing tutor.
- Recorded practice counts and average mastery replace the hard-coded streak display and fixed target. These are practice indicators, not validated learning measurements.
- Visible dashboard/progress failure states with retry actions; unavailable progress is not presented as measured zero.
- Keyboard-accessible course selection, focus outlines, skip navigation, mobile role navigation and reduced-motion support.
- Existing assessment and tutor components remain integrated. Backend, authentication, API contracts, database schema and dependency versions are unchanged.

## Files

Created:
- `frontend/src/components/LearningSculpture.tsx`
- `frontend/src/utils/studyPlan.ts`
- `frontend/tests/studyPlan.test.mjs`
- `docs/UI_CONTRIBUTION.md`

Modified:
- `frontend/src/pages/StudentDashboard.tsx`
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/index.css`

## Run and verify

Use Node.js 24 for the dependency-free TypeScript logic tests below. From the repository root:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Run the existing backend separately using the project's setup instructions and your own local configuration. The frontend expects `http://localhost:8000` unless `VITE_API_URL` is configured. Do not copy production credentials into the frontend.

From `frontend`, verify with:

```powershell
npm run build
npm run lint
node --test tests/studyPlan.test.mjs
```

## Verification performed

- TypeScript and production build: passed.
- Lint: no errors; 17 existing warnings in untouched components remain.
- Study recommendation and filtering: 4 tests passed.
- Headless Edge browser checks with intercepted API fixtures: desktop (1440px), mobile (390px), no mobile horizontal overflow, search, progress filters, selected-topic tutor handoff, course switching, empty curriculum, reduced motion, progress retry and dashboard retry all passed. No browser runtime exceptions.
- Desktop and mobile screenshots were visually inspected. Screenshots use test accounts and fixture data, not real institutional data.
- `git diff --check`: passed.
- Backend regression suite: 43 tests passed in an isolated Python 3.12 environment with SQLite and temporary document storage; one upstream Starlette deprecation warning. No backend source changes were required. Live PostgreSQL and OpenRouter calls remain unverified; complete a staging smoke test before merging.
- Existing dependency install reports 7 vulnerabilities (2 moderate, 5 high). No automatic dependency upgrades were applied in this UI contribution; review them separately.
- Production assets grew by about 2.6 kB gzipped across JS and CSS compared with the baseline build.

## Apply to your team's checkout

The patch is the contribution only. The ZIP is a full source snapshot excluding `.git`, installed packages, build output and local secrets.
Start from a clean checkout, create a review branch, then use the absolute path to the supplied patch:

```powershell
git switch -c codex/professional-learning-ui
git apply --check 'C:\path\to\adaptivelearn-ui.patch'
git apply 'C:\path\to\adaptivelearn-ui.patch'
```

If the check fails because your friend has changed the same files, stop and reconcile the differences; do not force the patch onto their changes. Review `git diff`, run the checks above and perform a staging smoke test before committing and opening a PR.

## Suggested follow-up contributions

1. **Source evidence panel:** open the exact cited passage with document and page context; show when evidence is missing.
2. **Revision queue:** persist a student-controlled review schedule for weak topics, with clear reasons and dismiss/reschedule actions.
3. **Faculty intervention timeline:** record actions and follow-up outcomes against each flagged topic.
4. **Tutor evaluation suite:** measure citation support, retrieval relevance and teaching-strategy behavior with a fixed academic test set.

Implement each as a separate reviewed contribution. Prioritize source evidence and evaluation before adding more visual effects.
