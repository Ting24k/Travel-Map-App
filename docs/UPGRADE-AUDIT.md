# Collaborative upgrade: preservation audit

Baseline commit: `8ebbcf1`. Working tree was clean. Existing React/TypeScript, D3, Tailwind, Dexie and PWA components are retained; geographic assets are unchanged.

## Existing local data

`src/db/repository.ts` defines IndexedDB database **our-little-world**, Dexie schema version 1: profiles (id), visits (id, userId, [userId+placeId]), appearances ([userId+placeId], userId), preferences (userId). This contains one local profile generated in the browser. It is not an authenticated identity. Browser data lives on the original browser/device/origin, not in this repository or cloud workspace.

`src/services/backup.ts` already validates schema-version-1 JSON, stable place IDs, ownership, dates, colors and supported preferences. Replacement requires confirmation. Baseline checks executed: 12 unit tests, 16 Chromium desktop/iPhone-sized browser checks, and TypeScript/production PWA build all passed.

## Preservation decisions

Keep the legacy database and its export/restore path intact. Add a separate user-keyed collaboration cache and durable outbox. Signing in must never clear, relabel, or automatically upload the local profile. Import is explicit, previewed and backed up; existing cloud records are preserved unless the user explicitly chooses replacement. Successful migration is tracked per authenticated user and source fingerprint. An original JSON backup can always be restored in local-only mode.

Cloud records use the Supabase Auth UUID. Cached data and pending changes are scoped by that UUID; signing out hides cloud records and clears friend views. Friend snapshots are not persisted offline: they are reauthorized on every refresh and erased on failure or disconnect. Journals remain private. No geography changes are required.

Live Supabase project configuration is absent in the execution environment. Live Auth, deployed database authorization and physical iPhone checks must remain unverified until that external setup is available. SQL authorization tests and deterministic sync tests are implemented independently.
