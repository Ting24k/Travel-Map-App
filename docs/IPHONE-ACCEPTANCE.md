# Physical iPhone / Safari acceptance checklist

**Not run in this cloud environment.** Automated iPhone-sized Chromium tests are viewport/touch emulation, not Safari or a physical iPhone. A physical device is required to complete this checklist. Target Safari 16.4+ on a current iOS version; keep a backup because browser storage can be evicted. Private browsing is not recommended for persistent travel records.

1. Open the deployed **HTTPS** URL in iPhone Safari. Confirm the world map, navigation, and English / 简体中文 interface have no clipping in portrait and landscape, including safe areas. Try larger text and VoiceOver.
2. Tap France; toggle visited; choose a preset and custom color; close the sheet. Search `Vatican`, `Monaco`, and an island nation, then select each. Confirm selection centers the place. Pinch zoom, drag, and reset.
3. Switch to China. Search `北京`, mark it visited, return to World, and confirm China is colored once. China's manual checkbox should still be off and its derivation note visible. A manual China visit should not color all provinces. Remove the province visit and verify the manual/derived rule.
4. Reload, close Safari, reopen, and confirm visits/colors/preferences persist. Repeat from the installed Home Screen app. Safari and standalone storage behavior can vary by iOS version; restore a JSON backup if moving between contexts.
5. Export JSON to Files. Change a visit. Import the old backup, cancel once (no changes), then confirm replacement. Try a malformed JSON file; existing records must remain unchanged.
6. Export both maps as PNG. Confirm the image preview, title, boundaries, legend, and visible colors. Use **Download PNG** to Files and **Share image** to Photos/Messages. If file sharing is unavailable, use the download and share the saved file from Files. Share the **app URL** separately; it contains no travel history.
7. In Safari tap **Share → Add to Home Screen → Add**. Open the installed app online once; allow several seconds for asset caching. Close the app, enable Airplane Mode, relaunch, switch both maps, search, record a visit, reload, and confirm changes persist offline. Reconnect afterward.
8. Compare Statistics against your records. Verify unmarking places updates counts. Record any defects with iOS version and reproduction steps, without uploading private backups publicly.

The developer must not mark these physical Safari checks as passed until a person runs them on an iPhone.
