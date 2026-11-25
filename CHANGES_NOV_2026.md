# AdaptiveLearn AI — Requested Fixes

## Delivered changes

1. **Faculty deletes assigned subjects:** Add protected `DELETE /api/subjects/{subject_id}` and a **Delete Subject** action under Faculty → Curriculum & Knowledge Base. Only the owning faculty or an administrator can delete a subject. Relational topic/document/assessment/progress/session records are removed in foreign-key-safe order, followed by its indexed Chroma chunks and uploaded files. A confirmation is required.
2. **Open student registration:** Public signup accepts any valid email address (Gmail, Outlook, institutional, etc.) and creates **student** accounts only. Faculty/admin accounts are provisioned by an authenticated administrator.
3. **Admin user deletion:** Protected `DELETE /api/admin/users/{user_id}` and dashboard action, including a confirmation. User learning history is removed, while former faculty's subjects and course material remain intact and unassigned. Admins cannot delete themselves.
4. **Better question generation:** Replaced the in-use generic template generator with per-subject/topic retrieval, source-quote-validated LLM JSON when configured, an extractive offline fallback, per-student recent question rotation, persisted generated questions with private answer keys, and grading using the question ID. The frontend submits that ID. Retrieval no longer falls back to documents from other subjects when a filtered query fails.

## Additional permission safeguard

- Faculty can upload learning materials only to their own assigned subjects. Uploading a topic from another subject now returns a validation error rather than silently moving it to a different course.

## Operational requirements

- Public registration accepts standard email domains; it **does not verify email ownership**. Add email verification before production use.
- For the best exam-style questions set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to a working account/model. Without them, question creation still uses actual academic material, but the local fallback has less variety. Upload topic-relevant content first.
- Take a database/document/Chroma backup before using destructive actions, then run `alembic upgrade head` from `backend/` **only if the database already tracks Alembic revisions**. Otherwise, the backend `Base.metadata.create_all` creates the added table at startup. No existing database files were changed in the supplied ZIP.
- Sample data now seeds only on the first startup of an empty development database, so deleted subjects and accounts won't reappear on restart. Disable demo seeding and rotate demo credentials and JWT key before deployment.
- Windows startup instructions and additional details are in [SETUP.md](SETUP.md).

## Validation performed here

- Python compilation: **pass**.
- Alembic revision chain: **one head**, `96e2c1a0b9d3`.
- Frontend TypeScript syntax parsed; a full type-check/build requires installed npm packages.
- Focused tests: **4 passed**, with one registration API test skipped in this environment because bcrypt/JWT dependencies are not installed. The skipped test will run when `backend/requirements.txt` is installed.
- Not completed here: full end-to-end runtime testing and `npm run build`. Node packages were unavailable in the execution environment, and not all runtime Python dependencies / PostgreSQL / ChromaDB were available. Please run the full project locally following the setup guide.
