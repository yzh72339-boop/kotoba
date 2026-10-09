# Content backend validation

Disposable local PostgreSQL 17: PASS.

- Migrations 010 and 011 applied and repeated safely in the disposable database only.
- Textual study event ID and corrected reading mistake sync without changing client IDs.
- Emergency rollback and compatibility reapplication retain data and migration history in the disposable database.
- Separate grammar and article identities.
- Duplicate review/batch retries do not duplicate events or revisions.
- Existing reading progress retained.
- Corrected reading error remains in the private mistake projection once across duplicate sync.
- Every local public table rejects non-owner reads/updates/deletes (permission denied or zero rows).
- Non-owner vocabulary and parent-owned example inserts are rejected.
- Anonymous reads reject every local public table.
- Compatibility RPC rejects the non-owner.
- Timezone, System-theme preference, mobile practice drafts, session pins and reading-anchor snapshots remain compatible.

This is **not** evidence of deployment or verification on real Supabase.
