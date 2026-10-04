# Chrome Web Store listing guide for render.md

One listing covers Chrome, Brave, Edge, and every Chromium browser: users
click **Add to Brave/Chrome** and get install + auto-updates. There is no
supported non-developer install outside a web store (self-hosted `.crx`
sideloading is blocked by Chrome/Brave; only enterprise policy installs
bypass it, which needs a managed device).

## One-time setup (~$5, ~10 min + review wait)

1. Pay the $5 developer registration at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Build the upload zip: `bash scripts/build-zip.sh` → `dist/renderdotmd-<version>.zip`.
3. New Item → upload the zip. Fill in the copy below, upload the graphic
   assets, set visibility (Public, or Private/Unlisted for a soft launch).
4. Publish the privacy policy: `PRIVACY.md` must be reachable at a public URL
   (e.g. a GitHub repo page or your site) — paste the URL in the listing's
   privacy field, required because the extension requests host permissions.
5. Submit for review (typically hours to a few days). Updates ship the same
   way: bump `version` in `manifest.json`, rebuild the zip, upload — users
   auto-update within ~24h.

## Suggested listing copy

- **Name:** render.md — clean Markdown viewer
- **Short description (132 chars max):** Render local and web Markdown (.md)
  files as clean, readable pages. Offline, no trackers.
- **Category:** Productivity. **Language:** English.
- **Detailed description:** paste the first three sections of README.md, then:
  "Permissions explained: storage (remember theme/width), activeTab (render
  the open tab on click), page access (read Markdown text to display it —
  everything stays on your device)."

## Required graphic assets (make once)

| Asset | Size | Notes |
| ----- | ---- | ----- |
| Screenshots | 1280×800 or 640×400 | 1–5: before (raw `.md`) vs after (rendered), popup open |
| Small tile | 440×280 | Search-result icon |
| Marquee (optional) | 1400×560 | Feature banner |

Tip: screenshot the repo's own README rendered by the extension — dogfooding
doubles as the demo.

## Pre-submission checklist

- [ ] `bash scripts/build-zip.sh` green (manifest, syntax, icons)
- [ ] Version bumped in `manifest.json` for every upload (store rejects reuse)
- [ ] `PRIVACY.md` hosted at a public URL, linked in listing
- [ ] No `tmp/`, no API keys, no remote code in the zip (build script excludes them)
- [ ] Tested the exact zip: `brave://extensions` → Load unpacked → select the
      **unzipped** contents, plus one fresh-profile click-through
