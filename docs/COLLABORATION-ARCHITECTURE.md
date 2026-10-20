# Collaboration and synchronization

The existing D3 maps, stable catalog, geographic assets, warm UI, PWA, legacy backup and local visit model remain. New modules live under `src/collaboration/`.

## Storage and migration

The original `our-little-world` IndexedDB database is preserved. Dexie version 2 adds an extras table for local wishlist/status and journal data; the original four tables and existing rows are untouched by the version upgrade. Signing in never relabels this profile. The separate `our-little-world-accounts` database has user-keyed remote baselines, a durable outbox, migration markers and an auth session store. Signed-in UI uses the Supabase Auth UUID, never the legacy random profile ID.

Legacy JSON schema 1 is accepted; schema 2 also preserves status records and private journals. Imports are validated, previewed and confirmed. The cloud import path never clears the original local database or replaces the cloud automatically. Duplicate place IDs merge by stable key; existing cloud records are preserved by default. Imported journals derive stable account-scoped UUIDs from the authenticated user plus original entry ID. A fingerprint marker is written atomically with queued operations, then marked completed only after the account's outbox is acknowledged and conflict-free. A retained original backup supplies recovery.

## Authority and conflicts

Cloud rows have server-managed revisions. A queued operation records the known base revision and a random immutable operation ID. The server serializes operations per user inside a transaction, compares revisions, applies the change, increments the revision, and retains a receipt keyed by `(user_id, operation_id)`. Retrying an acknowledged request after losing its response returns the same receipt. Reusing an operation ID with a different payload is rejected. Timestamps are not used to decide whose offline edit wins.

Local unsent edits to an entity coalesce. If another edit arrives while a request is in flight, the acknowledgement updates the next operation's base revision without discarding its new payload. Network failures leave the outbox intact. A stale remote revision produces a conflict retaining the pending edit and cloud record. **Keep my change** creates a new operation against the displayed remote revision; **Use cloud version** discards only the selected pending operation. Another concurrent change can conflict again. There is no silent stale overwrite.

One sync runner per tab avoids duplicate dispatches; server receipts and compare-and-swap handle cross-tab retries. Refresh runs on focus, visibility, reconnection, every 30 seconds while foregrounded, and manually. Authenticated mutations are optimistic, then queued durably. The UI distinguishes local persistence, pending sync, confirmed sync and errors. Journals use UUIDs and soft-delete tombstones so stale offline edits cannot silently resurrect deleted trips; they enter the same conflict flow.

## Authentication

A small typed gateway uses Supabase's documented GoTrue email OTP, verify, user, refresh-token and logout endpoints plus PostgREST/RPC. It deliberately avoids implicit magic-link URL tokens. The gateway persists the session in IndexedDB, checks recovered identity online, refreshes expiring tokens, serializes refresh across tabs with Web Locks where supported, and surfaces expiry/network errors. No admin credential is needed in the browser. Frontend configuration accepts HTTPS (HTTP only for loopback development), and the build rejects recognized private keys.

## Authorization and friends

RLS permits own profile and journals, own place records, and accepted-friend place reads. Browser table mutations are revoked: narrow authenticated RPCs enforce ownership and revision checks. Security-definer functions use an empty search path and fully qualified tables. The connection helper only checks the caller's relationship, avoiding recursive policies and arbitrary relationship queries.

Invitations contain a cryptographically random 244-bit bearer token generated from two random UUIDs. The database stores only its SHA-256 hash. Links expire after seven days, are single-use, cannot be accepted by the creator, and require explicit acceptance by a signed-in user. Acceptance locks the invitation and atomically creates or reactivates the canonical ordered user pair. Direct connection writes are unavailable to browser roles. An unused invitation created before a pair disconnected cannot reactivate that pair; reconnecting requires a fresh invitation and explicit acceptance. Holders of a link can accept it, so the UI tells users to share only with the intended recipient. Tokens are not public app links or login credentials.

Friend views keep no persistent offline copies. The projection RPC returns only display name, default visited color and place records after checking the current accepted connection. It never returns emails, private preferences or journal entries. Refresh clears the old snapshot before reauthorizing; offline, failure, account change and disconnect remove the friend view. RLS immediately denies subsequent server reads after either party disconnects. Already downloaded data cannot be remotely recalled; foreground refresh bounds UI staleness.

## Geographic and journal semantics

`visited` and `lived` count as visited. `wishlist` does not count in intersections or visited totals. China is effectively visited if the user's explicit country record is visited/lived or any of their 34 China-view regions is visited/lived. This is computed independently per user and reused in comparison/statistics. A derived visited China status takes precedence over an explicit wishlist/unvisited status for map colors, filters and totals; the selection panel still shows the manual status plus the derivation notice. Such a country is not counted again as wishlist. Custom colors never change comparison colors or get overwritten by switching views.

The four modes use an explicit current-user / selected-friend pair. Comparison colors are fixed blue/orange/purple/gray. Both visited means independent histories, not a claim of traveling together. Friend and comparison selection panels are read-only. Journals are always the current user's private entries. Adding/editing/deleting a trip never silently alters place status, and changing status never deletes journal entries.

Future shared trips must be a distinct, explicitly authorized data model; this version does not infer them from overlapping visits.
