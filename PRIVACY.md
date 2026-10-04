# Privacy Policy for render.md

**Effective date:** 2026-10-03

render.md renders Markdown documents locally in your browser.

- **No data collection.** The extension collects, transmits, and sells no data
  of any kind. There are no analytics, trackers, remote fonts, or CDNs.
- **Local processing only.** Markdown text is read from the page you already
  have open and converted to HTML on your device. Nothing leaves your machine.
- **Stored settings only.** Theme, width, and enabled preferences are saved
  with `chrome.storage.sync`, which syncs through your own browser profile
  (Google/Brave sync) if you have it enabled. These settings contain no
  personal information.
- **Permissions used:**
  - `storage` — persist your display preferences.
  - `activeTab` — let the toolbar popup render (or un-render) the current tab.
  - Host access to `file://`, `http://`, `https://` — read the raw Markdown
    text of pages you visit so it can be displayed. Page content is never
    copied, uploaded, or shared.
- **Contact:** file an issue on the project repository to reach the maintainer.

When publishing to the Chrome Web Store, host this file at a public URL and
paste that URL into the store listing's privacy-policy field.
