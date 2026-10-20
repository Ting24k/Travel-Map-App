# Our Little World 🌍

A warm travel map for the places you carry with you. React + TypeScript + D3 + Dexie, with English / 简体中文, an offline PWA, and optional Supabase accounts for secure cross-device synchronization and read-only friend comparison. No analytics or external map API keys.

**Collaborative upgrade:** follow [Supabase setup](docs/SUPABASE-SETUP.md) to enable email-code sign-in, invitations, cloud records, wishlist and private journals. Existing local records remain on the original browser until you explicitly preview and confirm an import. Without backend configuration the app still works locally. See [architecture and conflict policy](docs/COLLABORATION-ARCHITECTURE.md) and [upgrade validation](docs/UPGRADE-VALIDATION.md) for what was actually tested and what still needs a live project.

## Collaborative features

- Email OTP sign-in, persistent sessions, session recovery and sign-out.
- Auth UUID-scoped cache, durable offline operations, server revision checks, idempotent retries and explicit conflict resolution.
- Previewed local/JSON import with duplicate handling, original backup recovery and per-account migration markers.
- Expiring hashed invitations, accept/decline/revoke, canonical mutual connections and disconnect.
- My map, friend map, both visited and four-color comparison on both geographic catalogs; friend views are read-only and require online authorization.
- Unvisited / wishlist / visited / lived statuses, personal colors, wishlist filters and pair statistics.
- Multiple private journal trips per place, dates, cities, notes, edit/delete, sorting, filtering and offline caching.
- Production SQL migrations and RLS authorization tests on disposable PostgreSQL.

Primary navigation is Map / Journal / Statistics / Friends; Settings is under the Account button. Browse all places from the map toolbar. The original geographic assets and all verified boundaries remain unchanged.

## Run locally

Use Node 24 (`.nvmrc`; Node ≥22.12 is supported).

```sh
npm ci
npm run dev
```

Open the address Vite prints. Production checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
npm run test:e2e
npm run test:cloud     # isolated-session test API, not live Supabase
npm run test:security  # Docker + postgres:17-alpine; no production database
```

Playwright uses system Chromium on this cloud machine. Elsewhere install its browser with `npx playwright install --with-deps chromium` (Linux) or `npx playwright install chromium` (macOS/Windows). Set `CHROMIUM_PATH` if your Chromium is elsewhere. CI uses Playwright's bundled Chromium. End-to-end tests target the **production build**, start their own preview on port 4173, and run both desktop and iPhone 13-sized Chromium. Run a fresh build first. A service worker is only installed in production, not by the Vite development server.

On this cloud machine, npm's normal home cache is not writable; use `npm ci --cache /tmp/our-world-npm` if needed.

## What works

- Interactive world and China geographic polygons; pan, pinch/scroll zoom, zoom buttons, reset, keyboard selection, and collision-managed bilingual labels.
- Search or browse every supported place, including tiny islands and microstates; choosing a result highlights and centers it.
- Visited toggles, six preset colors, custom color picker, default color reset, and immediately updated map fills.
- User-scoped IndexedDB visits, appearances, preferences, atomic saves, visible save errors, and retry.
- Derived China status from region visits, distinct from manual country visits; no double counting and no bulk marking of provinces.
- English / 简体中文 interface, place names, and partial-name search.
- Statistics derived from the actual catalog; visited-place shortcuts.
- Versioned JSON backup export, strict import validation, preview and explicit replacement confirmation; cancellation leaves records unchanged.
- PNG map export (2000 × 1600), with title, boundaries, colors, visited count, and legend; image preview, download, and native file sharing where available.
- App URL sharing without exposing local travel data.
- PWA manifest, standalone icons and Apple touch icon, service worker, precached app shell and **both** map datasets, and offline status feedback.
- Responsive mobile bottom navigation, native accessible modal sheets, focus handling, reduced-motion CSS, and touch controls.

## Geographic policy

Made with **Natural Earth**, public-domain data pinned to a specific revision. All **258 admin-0 map features** are retained, with all **4,274 polygon components** preserved by simplification. These include countries, territories, disputed map units, uninhabited areas and Antarctica; **258 is not a count of sovereign states**. Statistics say “Countries & territories” and use this explicit complete catalog denominator.

The China view has **34 units**: 31 mainland regions plus Hong Kong, Macau, and Taiwan. Natural Earth's separate Paracel feature is retained within Hainan. Classification is for travel organization and makes no sovereignty claim. Boundaries follow the source's de facto policy and are not authoritative.

A visit to any of these 34 units derives China as visited in the world view. Hong Kong, Macau, and Taiwan also have distinct source features in World, whose records are independent. Mark those world features separately if desired. See [full provenance, identifiers, licenses, and disputed-boundary policy](docs/GEOGRAPHY.md) and [`public/maps/provenance.json`](public/maps/provenance.json).

Assets are committed and work offline. To regenerate them reproducibly (requires access to raw.githubusercontent.com):

```sh
npm run prepare:geo
npm test
npm run build
```

## Data and privacy

Travel records stay in this browser's IndexedDB. **Export backups regularly**: deleting site data, private browsing, OS/browser storage eviction, or removing an installed app may erase them. Browsers and devices do not automatically synchronize. Safari and Home Screen storage behavior varies by iOS version. Requesting persistent storage is advisory, not a guarantee; your JSON backup is the portable copy.

Restore accepts schema version 1, known place IDs, matching profile ownership, unique records, valid timestamps, strict six-digit hex colors, and supported preferences. Files over 16 MiB and incompatible formats are rejected without replacement. A restore atomically replaces the local profile and all its records only after confirmation. JSON backups contain personal travel history; keep them private. PNG export shares only the visible map plus title, count, legend, and attribution. Sharing the app URL shares no records.

Authentication, cloud sync and accepted-friend map access are optional and configured through Supabase. Private journal data is never shared. A normal app URL grants no access; only an explicit authenticated invitation acceptance creates a connection. See [collaboration architecture](docs/COLLABORATION-ARCHITECTURE.md).

## Deploy free to GitHub Pages

The repository includes [a test/build/deploy workflow](.github/workflows/pages.yml).

1. Push this source to `main` of `Ting24k/Travel-Map-App`.
2. In GitHub open **Settings → Pages → Build and deployment → Source → GitHub Actions**. Repository administration access is required. For a private repository, Pages availability depends on the account plan; use a public repo or another static provider if necessary.
3. Open **Actions → Test and deploy to GitHub Pages**. Run the workflow if it did not start automatically. It installs dependencies, runs unit and desktop/mobile browser tests, builds with `BASE_PATH=/Travel-Map-App/`, uploads `dist/`, and deploys to Pages.
4. After the deployment job succeeds, open the URL shown by GitHub's `github-pages` environment. For this repository its expected project URL is `https://ting24k.github.io/Travel-Map-App/`. **An expected URL alone does not establish that a deployment is live.** Verify the page and offline installation before sharing.
5. Send that URL to your friend; their visits stay on their own device. You can also use **Settings → Share this app**.

To reproduce a Pages build locally:

```sh
BASE_PATH=/Travel-Map-App/ npm run build
npm run preview
```

Open the `/Travel-Map-App/` path printed by Vite. For a custom domain at the root, use `BASE_PATH=/`. To use Netlify or Cloudflare Pages instead, set build command `npm run build`, output directory `dist`, Node 24, and leave `BASE_PATH` unset. HTTPS is needed for service workers and native sharing. Do not place personal backups in `public/` or the deployment artifact.

GitHub Pages has no client-side routes to rewrite here: navigation lives in application state and the app is served from its base path. A service-worker update waits until old app tabs are closed; fully close and reopen the app when deploying an update. Export a backup before changing hosting origins because browser storage belongs to the origin.

## Install on iPhone

Open the deployed HTTPS app in **Safari → Share → Add to Home Screen → Add**. Launch it online once and allow static caching to finish. It then works offline, including both maps and saved visits. Use Settings to export a backup to Files. PNG exports offer a preview and an explicit download/share gesture to support mobile browsers.

**A physical iPhone/Safari has not been tested in this cloud environment.** iPhone-sized Chromium checks do not substitute for Safari. Follow the [physical iPhone acceptance checklist](docs/IPHONE-ACCEPTANCE.md) before claiming device support is verified.

## Test coverage and milestones

1. **Foundation:** React, TS, Vite, Tailwind, Vitest, Playwright, manifest and service worker; production shell verified.
2. **Geography:** pinned public-domain source, normalized catalog, world/China maps; feature, polygon winding, multipolygon, tiny-place and selection tests.
3. **Tracking:** visits, colors, automatic IndexedDB persistence, bilingual search, China derivation; unit and desktop/mobile journeys.
4. **Sharing/statistics:** catalog-derived totals, validated JSON backup and confirmed restore, real PNG signature/dimensions checked in browser tests.
5. **Polish/validation:** mobile layout, keyboard/modal behavior, no horizontal overflow, production service-worker caching, offline reload with saved records, switching to an unvisited map offline, production build and dependency audit.

`npm test` runs unit tests; `npm run test:e2e` runs production browser checks. See [baseline MVP validation](docs/VALIDATION.md) and [collaborative upgrade validation](docs/UPGRADE-VALIDATION.md) for measured outcomes and external limitations. Remaining external acceptance: physical iPhone Safari and a verified live hosting deployment. Live Supabase and real-device checks are separately tracked in the upgrade validation report.

## Source layout

- `src/components/`: D3 map, native modal and place sheet, backup/image/app sharing UI.
- `src/data/`: normalized bilingual place catalog and bundled interface translations.
- `src/types/`: versioned profile, place, visit, appearance and preference types.
- `src/db/`, `src/hooks/`: replaceable repository interface, Dexie implementation, serialized optimistic persistence.
- `src/services/`: pure visit/derivation/statistics functions, strict backup validation, SVG-to-PNG export.
- `src/styles/`: responsive warm-paper/sage UI, mobile navigation, touch and focus styles.
- `public/maps/`, `scripts/prepare-geodata.mjs`: offline geographic assets, provenance and reproducible preparation.
- `tests/`: unit tests and desktop/iPhone-sized browser journeys.
