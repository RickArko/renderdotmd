# `renderdotmd` — clean Markdown viewer for Chromium Browsers

Renders `.md` / `.markdown` / `.mdown` / `.mkd` / `.mdx` files as clean,
readable pages. No build step, no dependencies, no network calls — load it
unpacked and it works offline.

![license](https://img.shields.io/badge/license-MIT-green) ![mv3](https://img.shields.io/badge/manifest-V3-blue)

## Install

**Happy path — one command:**

```bash
bash scripts/try.sh
```

This opens Brave in a throwaway profile with the extension loaded and a demo
page rendered. It touches nothing in your real profile; closing the window
deletes the profile. (A persistent one-click install = the Web Store listing,
per [STORE_LISTING.md](STORE_LISTING.md) — Chrome/Brave allow no other
non-developer install path.)

**Permanent install options:**

1. Open `brave://extensions`, enable **Developer mode** (top right).
2. Click **Load unpacked** and select this folder (`renderdotmd/` — the one
   containing `manifest.json`).
3. Pin **render.md** to the toolbar for one-click Render / Show source.
4. For local files: on `brave://extensions`, click **Details** on render.md
   and enable **Allow access to file URLs**. Then open any `file:///…/*.md`.

## What it does

- **Auto-renders** Markdown documents (local `file://` + `http(s)` URLs ending
  in a Markdown extension) with GitHub-like typography.
- **Popup controls**: auto-render on/off, theme (System / Light / Dark),
  width (Narrow / Wide), **Render this page** (force-render any plain-text
  page), **Show source** (restore the original), and a paste-to-preview box.
- **GFM-ish subset**: headings, fenced + indented code, blockquotes, `hr`,
  nested-ready bullet/ordered/task lists, tables, bold/italic/strikethrough,
  links, images, autolinks, hard breaks.
- **Sanitized by default**: raw HTML is allowlisted (`script`/`iframe`/
  `style` stripped, `on*` handlers and `style` attributes removed,
  `javascript:` URLs neutralized).

## Project layout

```text
renderdotmd/
├── manifest.json        # MV3 manifest (storage/activeTab/scripting only)
├── README.md
├── LICENSE              # MIT — replace holder before publishing
├── .gitignore             # ignores tmp/ scratch space
├── icons/               # PNGs (stdlib-generated, no Pillow needed)
│   └── icon{16,32,48,128}.png
├── src/
│   ├── markdown.js      # dependency-free parser + sanitizer (global RenderMd)
│   ├── content.js       # auto-detect, render/swap, popup messaging, settings
│   ├── styles.css       # reading styles, light/dark via CSS vars
│   ├── popup.html       # toolbar popup
│   ├── popup.js         # settings + per-tab controls + live preview
│   └── popup.css
└── tmp/                 # local-only scratch (gitignored): gen_icons.py, tests
```

## Permissions (why each one)

| Permission       | Why                                            |
| ---------------- | ---------------------------------------------- |
| `storage`        | Persist theme/width/enabled via `chrome.storage.sync` |
| `activeTab`      | Popup's Render / Show source acts on the open tab |
| `scripting`      | Reserved for future manual-inject fallback      |
| `file://, http(s)` hosts | Read raw Markdown text from the page itself; nothing leaves the machine |

No host data is collected, transmitted, or fetched. The content script exits
in <1 ms on non-Markdown pages (extension check before any DOM work).

## Development

No toolchain — edit and reload at `brave://extensions` (↻ on the card).

```bash
# Regenerate icons (pure stdlib, Pillow not required)
python3 tmp/gen_icons.py

# Syntax-check the scripts (Node 18+)
node --check src/markdown.js && node --check src/content.js && node --check src/popup.js
python3 -c "import json; json.load(open('manifest.json')); print('manifest OK')"
```

Manual test page: save any Markdown as `tmp/test.md` and open it via
`file:///.../tmp/test.md` (needs the file-URL toggle above).

## Privacy

Renders locally. No analytics, no remote fonts, no CDNs, no cookies. Settings
sync through your own Chrome/Brave profile sync only.

## Contributing

Issues and PRs welcome. Keep it dependency-free: if a change needs `npm`,
it needs justification. Match the existing style (4-space indent, JSDoc on
exported functions, `make`-free workflow).

## License

MIT — see [LICENSE](LICENSE). Replace `YOUR NAME` with the publisher before
listing on the Chrome Web Store.
