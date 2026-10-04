/**
 * content.js — auto-render Markdown documents as clean HTML pages.
 *
 * Strategy: do nothing on normal HTML pages (fast path). When the URL ends
 * in .md/.markdown/… or the document is plain text served from such a URL,
 * swap <body> for a styled <article> and keep the original around so the
 * popup's "Show source" toggle is instant and lossless.
 */
(function () {
  "use strict";

  var MD_EXT = /\.(md|markdown|mdown|mkd|mdx)(\?.*)?(#.*)?$/i;
  var ROOT_ID = "renderdotmd-root";
  var originalSnapshot = null; // { html, title } captured before first render
  var forced = false; // user clicked "Render this page" on a non-.md URL

  var DEFAULTS = { enabled: true, theme: "auto", width: "narrow", raw: false };

  function getSettings() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.sync.get(DEFAULTS, function (items) {
          resolve(Object.assign({}, DEFAULTS, items));
        });
      } catch (e) {
        resolve(Object.assign({}, DEFAULTS));
      }
    });
  }

  /** Heuristic: markdown URL, or plain-text doc that smells like Markdown. */
  function shouldRender(url, settings) {
    if (!settings.enabled || settings.raw) return false;
    if (forced) return true;
    if (document.getElementById(ROOT_ID)) return true; // already rendered
    if (MD_EXT.test(url)) return true;
    return false;
  }

  /** Extract the raw Markdown text from a plain-text document view. */
  function getRawText() {
    var pre = document.querySelector("body > pre");
    var el = pre || document.body || document.documentElement;
    if (!el) return "";
    // innerText is missing in some document modes; textContent always works.
    var t = el.innerText ?? el.textContent;
    return t || "";
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-renderdotmd-theme");
    else root.setAttribute("data-renderdotmd-theme", theme);
  }

  function applyWidth(root, width) {
    root.setAttribute("data-width", width === "wide" ? "wide" : "narrow");
  }

  /** Swap the document body for the rendered article. Idempotent. */
  function render(settings) {
    if (!window.RenderMd) return;
    var existing = document.getElementById(ROOT_ID);
    if (existing) {
      applyTheme(settings.theme);
      applyWidth(existing, settings.width);
      document.title = document.title.replace(/ \(source\)$/, "");
      return;
    }
    var raw = getRawText();
    if (!raw.trim()) return;

    if (!originalSnapshot) {
      originalSnapshot = { html: document.documentElement.innerHTML, title: document.title };
    }
    var baseName = (location.pathname.split("/").pop() || "README.md").replace(/\.md$/i, "");
    var article = document.createElement("article");
    article.id = ROOT_ID;
    article.setAttribute("data-width", settings.width === "wide" ? "wide" : "narrow");
    article.innerHTML = window.RenderMd.render(raw);

    document.body.innerHTML = "";
    var name = document.createElement("div");
    name.className = "renderdotmd-filebar";
    var safeName = document.createElement("span");
    safeName.textContent = baseName;
    name.appendChild(safeName);
    document.body.appendChild(name);
    document.body.appendChild(article);
    applyTheme(settings.theme);
    document.title = baseName + " — rendered";
  }

  /** Restore the browser's original plain-text view. */
  function showSource() {
    if (!originalSnapshot) return;
    document.documentElement.innerHTML = originalSnapshot.html;
    document.title = originalSnapshot.title + " (source)";
    originalSnapshot = null;
    forced = false;
  }

  async function refresh() {
    var settings = await getSettings();
    if (shouldRender(location.href, settings)) render(settings);
    else if (settings.raw && document.getElementById(ROOT_ID)) showSource();
  }

  // Popup messages: { type: "renderdotmd:render" | "renderdotmd:source" |
  //                         "renderdotmd:state" }
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || typeof msg.type !== "string" || !msg.type.startsWith("renderdotmd:")) return;
    if (msg.type === "renderdotmd:render") {
      forced = true;
      getSettings().then(function (s) {
        render(Object.assign({}, s, { raw: false }));
        sendResponse({ ok: true, rendered: !!document.getElementById(ROOT_ID) });
      });
      return true;
    }
    if (msg.type === "renderdotmd:source") {
      showSource();
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "renderdotmd:state") {
      sendResponse({ rendered: !!document.getElementById(ROOT_ID), forced: forced });
      return;
    }
  });

  // Re-render live when settings change in the popup.
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      if (changes.theme || changes.width || changes.enabled || changes.raw) refresh();
    });
  } catch (e) {
    /* storage events unavailable — popup reload covers it */
  }

  refresh();
})();
