# Original MVP architecture (historical)

The collaborative implementation supersedes this design. See [current architecture](COLLABORATION-ARCHITECTURE.md) and [setup](SUPABASE-SETUP.md).

# Architecture

React views work with `TravelData` and pure travel functions, not Dexie tables. `TravelRepository` is the replaceable boundary for local persistence. IndexedDB schema version 1 has separate profiles, visits, appearances, and preferences tables. Visits and appearances are user-scoped; stable place IDs and ISO timestamps prepare records for a future sync migration. Geographic assets and the catalog contain no travel history.

The local repository intentionally holds one active profile. Complete saves and backup restores use a single transaction, so partial imports cannot corrupt the current records. UI mutations are optimistic and writes are serialized; failures remain visible with Retry and backup options. Derived China status is calculated, never persisted as a fabricated manual visit. Future migrations must preserve that distinction.

A future cloud adapter can load/save records per authenticated user, retain local IndexedDB as a cache, and synchronize updates with explicit conflict rules (for example server-issued revision tokens and tombstones). The current whole-profile save is not itself a cloud merge protocol. Future cloud work needs authentication, migrations, server authorization, and explicit deletion semantics.

Suggested future relational tables: profiles keyed to auth user, visits and appearances keyed by `(user_id, place_id)`, groups, group_members, hashed expiring invitations, shared_trips and trip_members. Independent visits remain separate from shared trip records. Row-level security must require ownership for writes and authenticated, accepted group membership for shared reads. Never use a public user ID or an unprotected invitation token to expose travel data. Read-only friend maps should come through authorized projections. Comparison is a pure function of two independently loaded visited sets: neither / me / friend / both. Shared statistics should specify intersection or union explicitly.

Backups contain a schema version and one user-scoped snapshot. They are private files, not public sharing links. The PNG includes the visible map, title, visited count, and legend; it does not embed the database. Sharing the app URL shares only the application, not local travel data.
