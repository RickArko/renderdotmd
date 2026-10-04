/**
 * popup.js — settings UI + per-tab render/source controls + paste preview.
 * Settings live in chrome.storage.sync: { enabled, theme, width }.
 */
(function () {
  "use strict";

  var DEFAULTS = { enabled: true, theme: "auto", width: "narrow" };
  var els = {};

  ["status", "enabled", "theme", "width", "renderBtn", "sourceBtn", "paste", "preview"].forEach(
    function (id) {
      els[id] = document.getElementById(id);
    }
  );

  function activeTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs[0]);
      });
    });
  }

  function send(tab, type) {
    return new Promise(function (resolve) {
      if (!tab || !tab.id) return resolve(null);
      chrome.tabs.sendMessage(tab.id, { type: type }, function (res) {
        resolve(chrome.runtime.lastError ? null : res);
      });
    });
  }

  async function refreshStatus() {
    var tab = await activeTab();
    if (!tab || !/^https?:|^file:/.test(tab.url || "")) {
      els.status.textContent = "Open a Markdown (.md) file to render it.";
      return;
    }
    var state = await send(tab, "renderdotmd:state");
    if (!state) {
      els.status.textContent = "This page is not a Markdown document.";
      return;
    }
    els.status.textContent = state.rendered
      ? "Rendering this page as Markdown."
      : "Markdown detected — rendering is off for this view.";
  }

  function load() {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      els.enabled.checked = items.enabled !== false;
      els.theme.value = items.theme || "auto";
      els.width.value = items.width || "narrow";
    });
  }

  function save() {
    chrome.storage.sync.set({
      enabled: els.enabled.checked,
      theme: els.theme.value,
      width: els.width.value,
    });
  }

  els.enabled.addEventListener("change", function () {
    save();
    refreshStatus();
  });
  els.theme.addEventListener("change", save);
  els.width.addEventListener("change", save);

  els.renderBtn.addEventListener("click", async function () {
    var tab = await activeTab();
    await send(tab, "renderdotmd:render");
    refreshStatus();
    window.close();
  });

  els.sourceBtn.addEventListener("click", async function () {
    var tab = await activeTab();
    await send(tab, "renderdotmd:source");
    refreshStatus();
    window.close();
  });

  // Live preview for pasted Markdown, rendered with the same parser.
  els.paste.addEventListener("input", function () {
    els.preview.innerHTML = window.RenderMd
      ? window.RenderMd.render(els.paste.value)
      : "";
  });

  load();
  refreshStatus();
})();
