# Collaborative upgrade validation

## Executed checks

- Baseline preservation audit: original 12 unit tests, 16 desktop/iPhone-sized Chromium checks, and production build passed before changes.
- Current `npm run lint`: passed (TypeScript unused-symbol checks). `npm run typecheck`: passed.
- Current `npm test`: **30 passed**, zero skipped. Coverage includes exact legacy Dexie-schema preservation, v1/v2 backup validation, migration preview/deduplication/color preservation, user isolation, durable offline operations, failed requests, idempotent response-loss retry, concurrent edits and explicit conflict resolution, four comparison states, derived China independently per user, wishlist/lived counting, and journal validation/status independence.
- `npm run build`: passed, including PWA manifest/service worker and precached assets. Geographic files and place catalog are unchanged. Code splitting keeps generated JS chunks below the default warning threshold.
- `npm run test:e2e`: **20 passed** (10 desktop + 10 iPhone-sized Chromium). Real local IndexedDB, world/China rendering, tiny-place/bilingual search, colors/reload, wishlist/lived persistence, multiple trips/edit/delete, offline journal persistence, backup cancel/restore, PNG encoding, offline maps, keyboard focus and zoom/reset.
- `npm run test:cloud`: **4 browser journeys passed**, two scenarios each on desktop and iPhone-sized layouts. The main journey uses three isolated browser contexts for A, B and A's second device against an explicitly deterministic Supabase endpoint test double. It covers explicit legacy migration, two independent accounts, same-account retrieval, invitations, private-before-connection data, read-only friend maps, comparison/intersection colors, private journals across A's devices, offline edits/reload/reconnection, stale-edit conflicts, invitation reuse, disconnect, and signing out/switching accounts without seeing the previous journal. A second scenario verifies that a new friend is returned to the pending invitation automatically after first signing in. These are **API-contract/browser integration tests, not live Supabase authentication**.
- Private-key build guard: an intentionally fake `sb_secret_` key was rejected before frontend asset generation.

## Database authorization

The production SQL migrations were executed on disposable **PostgreSQL 17** by GitHub Actions: [initial passing authorization run](https://github.com/Ting24k/Travel-Map-App/actions/runs/39366254061).

The suite exercises authenticated subjects A/B/C and anonymous access, private reads, accepted-friend reads, blocked direct/forged mutations, profile privacy, private journals, revision conflicts, idempotent operations, status/color/catalog constraints, multiple journal entries, invalid dates, expired/revoked/reused/self invitations, canonical connections, creator-only revocation, and immediate read denial after disconnect. Additional assertions cover friend projection fields, declined invitations, preventing stale resurrection of deleted trips, and rejecting null/malformed operation parameters before revision checks. The expanded suite also passed in [this authorization run](https://github.com/Ting24k/Travel-Map-App/actions/runs/39368429564). The final branch's CI reruns the full current suite.

The test bootstrap supplies Supabase's Auth roles and `auth.uid()` contract with controlled subjects. This tests real PostgreSQL grants, RLS and transaction functions; it does not test GoTrue's JWT issuance or the configuration of an unprovided production project. Test bootstrap/assertion functions are not shipped in production migrations.

The cloud machine's Docker image registry is blocked, so local `npm run test:security` could not acquire the image. Running it through GitHub Actions provides independent, successful PostgreSQL execution rather than silently skipping security validation.

## External prerequisites still outstanding

- A real Supabase project URL/public key, applied migrations, and email OTP templates are not provided in the current environment. Live sign-in/email delivery, actual project RLS, deployed invitations, cross-device cloud synchronization, and token refresh must be verified after [Supabase setup](SUPABASE-SETUP.md).
- Physical iPhone Safari/Home Screen/native sharing has **not** been run. iPhone-sized Chromium is not Safari. Follow the [manual checklist](IPHONE-ACCEPTANCE.md).
- The upgrade is published on the `codex/collaboration` review branch. Existing `main`/the live MVP is kept intact until backend configuration and review. A successful static build or test API journey does not establish a live collaborative deployment.
- The environment's current network policy blocks npm downloads and direct GitHub Git transport. No new dependency is needed by this implementation; it uses existing Dexie and typed Supabase HTTP endpoints. Source publication uses the authorized GitHub API. An additive npm-registry configuration draft and public-variable requirements were saved; apply/publish it to enable clean package installs on this cloud machine. CI installs independently.

## Known limits and policies

- Friend maps require connectivity and reauthorization. They are not persisted in IndexedDB. RLS immediately revokes future server reads after disconnect; already downloaded bytes cannot be recalled, so foreground refresh/focus clears stale client views.
- Journal deletion uses revisioned tombstones; changing status never deletes journals. No photos, shared-trip claims, realtime subscriptions or cloud photo storage are implemented.
- Foreground refresh is every 30 seconds, on focus/online, and manual. Pending work survives reload/sign-out and only resumes under the matching account.
- Email delivery and rate limits depend on the Supabase project/SMTP configuration. The app surfaces failures and does not pretend queued changes are synchronized.
- Backups have a 16 MiB supported size and 10,000-entry validation limit. Oversized exports fail visibly instead of producing a file the importer cannot restore. Retain the original backup before migrating or changing origins.
