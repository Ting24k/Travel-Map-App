# MVP validation

Validation ran in the cloud Linux workspace with Node 24.19.0, npm 11.9.0, and system Chromium 154. No physical iPhone was attached.

## Verified

- A clean `npm ci --cache /tmp/our-world-npm` succeeded with the committed lockfile.
- `npm test`: **12 passed**, zero skipped. Geographic IDs, all world and China features, D3 polygon winding, multipolygon country support, tiny-country catalog entries, bilingual search, visits/unvisits, custom/default colors, China derivation/manual status, catalog-derived totals, IndexedDB reopen, backup round trip, and invalid import rejection.
- `npm run build`: TypeScript and production build passed. PWA manifest, icons, service worker, app shell, and both geographic datasets generated and precached (17 assets; approximately 2 MiB total before transfer compression).
- `npm run test:e2e`: **16 passed**, zero skipped: eight journeys each on desktop Chromium and iPhone 13-sized touch Chromium. Includes map selection, small-country search, visits/colors/reload, Chinese province search, derived China, backup download, invalid backup rejection, cancellation and confirmed restore, PNG file signature and 2000×1600 dimensions, offline reload with saved visits, both maps offline, modal keyboard focus/Escape, zoom/reset, and no horizontal overflow.
- `BASE_PATH=/Travel-Map-App/ npm run build`: passed. A separate iPhone-sized browser smoke at the project path rendered all 258 world features, switched to all 34 China features offline, survived an offline reload, and recorded zero browser errors. A static artifact is available at `/workspace/our-little-world-pages.zip`.
- `npm audit --omit=dev`: **0 known production dependency vulnerabilities**. The geodata preparation tool has deprecated transitive development dependencies; it is not shipped in the app bundle.
- `npm run prepare:geo`: pinned Natural Earth sources and per-component simplification ran successfully. All 258 world features, 34 China features, and all 4,274 world polygon components were retained. No source geography is fetched at runtime.
- Screenshots were visually inspected: [desktop](screenshots/desktop.png), [iPhone-sized map](screenshots/iphone-sized.png), [iPhone-sized place sheet](screenshots/iphone-sheet.png). They show an empty travel history, not sample records persisted into the app.

## External acceptance still required

- **Physical iPhone / Safari:** not executed. Chromium touch/viewport emulation cannot validate Safari rendering, Home Screen storage, Files downloads, or native iOS sharing. Follow [the device checklist](IPHONE-ACCEPTANCE.md).
- **Live deployment:** source and the GitHub Pages workflow were successfully pushed to `main` in `Ting24k/Travel-Map-App`. The GitHub API and `ting24k.github.io` are blocked by the cloud network proxy (HTTP 403), so Pages settings, workflow execution, and the live site cannot be verified here. In repository Settings → Pages select GitHub Actions, then run the Test and deploy to GitHub Pages workflow. The expected URL is `https://ting24k.github.io/Travel-Map-App/`; it is **not yet verified as live**. See README for deployment instructions.

The current app workflow is tested; these external limitations are not claimed as passes.
