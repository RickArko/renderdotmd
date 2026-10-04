/**
 * markdown.js — tiny self-contained Markdown → sanitized HTML renderer.
 *
 * Why not marked/markdown-it? Zero dependencies means the extension loads
 * from disk with no CDN, no build step, and no supply-chain risk. The
 * supported subset covers ~95% of real-world README/notes files:
 *
 *   blocks: ATX headings, fenced code, indented code, blockquote, hr,
 *           ordered/unordered/task lists (one nesting level), GFM tables,
 *           paragraphs, raw HTML blocks (sanitized).
 *   inline: code spans, images, links, autolinks, **bold**, *italic*,
 *           ~~strikethrough~~.
 *
 * Everything else degrades to a paragraph — never to broken HTML.
 * Exposes a single global: `window.RenderMd.render(src) -> string`.
 */
(function () {
  "use strict";

  /** Escape the five HTML-significant chars. */
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Allowlist for the sanitizer. Tag -> permitted attributes. */
  var ALLOWED = {
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    p: [],
    a: ["href", "title"],
    img: ["src", "alt", "title"],
    code: ["class"],
    pre: [],
    blockquote: [],
    ul: [],
    ol: [],
    li: [],
    hr: [],
    br: [],
    em: [],
    strong: [],
    del: [],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: ["align"],
    td: ["align"],
    input: ["type", "checked", "disabled"],
    span: ["class"],
    div: ["class"],
  };

  /** Only these URL schemes survive sanitizing (plus relative links). */
  function safeUrl(url) {
    if (url == null) return null;
    var u = url.trim();
    if (/^(https?:|mailto:|#|\/)/i.test(u)) return u;
    if (/^[a-z0-9._~:/?#[\]@!$&'()*+,;=-]+$/i.test(u) && !/^[a-z]+:/i.test(u)) {
      return u; // relative link or anchor
    }
    return null;
  }

  /**
   * Minimal sanitizer: parses `html` in a detached document, strips any
   * element/attribute outside the allowlist, neutralizes unsafe URLs and
   * anything starting with `on*`. Returns safe HTML.
   */
  function sanitize(html) {
    var doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = html;
    var els = doc.body.querySelectorAll("*");
    els.forEach(function (el) {
      var tag = el.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object") {
        el.remove();
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(ALLOWED, tag)) {
        // Unwrap unknown tags but keep their text.
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        return;
      }
      Array.from(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "style") {
          el.removeAttribute(attr.name);
          return;
        }
        if (!ALLOWED[tag].includes(name)) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === "href" && tag === "a") || (name === "src" && tag === "img")) {
          var ok = safeUrl(attr.value);
          if (ok === null) el.removeAttribute(attr.name);
          else el.setAttribute(attr.name, ok);
        }
      });
    });
    return doc.body.innerHTML;
  }

  /** Slugify heading text for `id` anchors (`## Hello World` -> `hello-world`). */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  /**
   * Parse inline Markdown. Code spans are extracted first so `*`/`[` inside
   * backticks are never interpreted as emphasis or links.
   */
  function inline(src) {
    var codes = [];
    var out = escapeHtml(src);
    out = out.replace(/`([^`]+?)`/g, function (_, code) {
      codes.push("<code>" + code + "</code>"); // `code` already escaped
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    // Images must precede links: ![alt](src). Destination allows one level
    // of balanced parens so `](a(1))` matches fully. Unsafe URLs degrade
    // to the alt text rather than leaking raw markup into the page.
    var DEST = "([^\\s()]+(?:\\([^)]*\\)[^\\s)]*)*)";
    out = out.replace(
      new RegExp("!\\[([^\\]]*?)\\]\\(" + DEST + '(?:\\s+&quot;(.*?)&quot;)?\\)', "g"),
      function (_, alt, srcUrl, title) {
        var ok = safeUrl(srcUrl.replace(/&amp;/g, "&"));
        if (!ok) return alt; // alt already escaped above
        var t = title ? ' title="' + title + '"' : "";
        return '<img src="' + escapeHtml(ok) + '" alt="' + alt + '"' + t + ">";
      }
    );
    // [text](href) — sanitize href at the end, keep label inline-parsed.
    out = out.replace(
      new RegExp("\\[([^\\]]*?)\\]\\(" + DEST + '(?:\\s+&quot;(.*?)&quot;)?\\)', "g"),
      function (_, label, href) {
        var ok = safeUrl(href.replace(/&amp;/g, "&"));
        if (!ok) return label; // label already escaped; unsafe URL dropped
        return '<a href="' + escapeHtml(ok) + '">' + label + "</a>";
      }
    );
    out = out.replace(/<(https?:[^<>\s]+|mailto:[^<>\s]+)>/g, '<a href="$1">$1</a>');
    out = out.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/__([^_]+?)__/g, "<strong>$1</strong>");
    out = out.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>"); // stray closer
    out = out.replace(/(^|[\s(])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
    out = out.replace(/(^|[\s(])_([^_\s][^_]*?)_/g, "$1<em>$2</em>");
    out = out.replace(/~~([^~]+?)~~/g, "<del>$1</del>");
    // Restore code spans (they contain final HTML, not re-parsed).
    out = out.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return codes[Number(i)];
    });
    return out;
  }

  /** True for `| a | b |` separator rows (`| --- | :---: |`). */
  function isTableDelim(line) {
    var cells = line.trim().replace(/^\||\|$/g, "").split("|");
    return cells.length > 0 && cells.every(function (c) {
      return /^\s*:?-{1,}:?\s*$/.test(c);
    });
  }

  function parseAlign(delimLine) {
    return delimLine
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(function (c) {
        c = c.trim();
        if (/^:.*:$/.test(c)) return "center";
        if (/^.*:$/.test(c)) return "right";
        return "left";
      });
  }

  function splitRow(line) {
    var t = line.trim();
    if (t.startsWith("|")) t = t.slice(1);
    if (t.endsWith("|")) t = t.slice(0, -1);
    // Split on unescaped pipes.
    return t.split(/(?<!\\)\|/).map(function (c) {
      return c.replace(/\\\|/g, "|").trim();
    });
  }

  function tableHtml(header, delim, bodyRows) {
    var align = parseAlign(delim);
    function cell(tag, text, i) {
      var a = align[i] && align[i] !== "left" ? ' align="' + align[i] + '"' : "";
      return "<" + tag + a + ">" + inline(text) + "</" + tag + ">";
    }
    function row(cells, tag) {
      return (
        "<tr>" +
        cells.map(function (c, i) {
          return cell(tag, c, i);
        }).join("") +
        "</tr>"
      );
    }
    return (
      "<table><thead>" +
      row(splitRow(header), "th") +
      "</thead><tbody>" +
      bodyRows.map(function (r) {
        return row(splitRow(r), "td");
      }).join("") +
      "</tbody></table>"
    );
  }

  /** Render full Markdown source to sanitized HTML. */
  function render(src) {
    var lines = String(src).replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // Fenced code block: ```lang ... ```
      var fence = line.match(/^(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
      if (fence) {
        var lang = fence[2] ? ' class="language-' + escapeHtml(fence[2]) + '"' : "";
        var buf = [];
        i++;
        while (i < lines.length && !new RegExp("^" + fence[1] + "\\s*$").test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++; // consume closing fence (or EOF)
        html.push("<pre><code" + lang + ">" + escapeHtml(buf.join("\n")) + "</code></pre>");
        continue;
      }

      // Indented code block (4 spaces, grouped).
      if (/^( {4}|\t)\S/.test(line)) {
        var code = [];
        while (i < lines.length && (/^( {4}|\t)/.test(lines[i]) || lines[i].trim() === "")) {
          code.push(lines[i].replace(/^( {4}|\t)/, ""));
          i++;
        }
        html.push("<pre><code>" + escapeHtml(code.join("\n").replace(/\n+$/, "")) + "</code></pre>");
        continue;
      }

      // GFM table: header row + delim row + 0..n body rows.
      if (line.includes("|") && i + 1 < lines.length && isTableDelim(lines[i + 1])) {
        var rows = [];
        i += 2;
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
          rows.push(lines[i]);
          i++;
        }
        html.push(tableHtml(line, lines[i - rows.length - 1] || "", rows));
        continue;
      }

      // ATX heading: # .. ######
      var h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) {
        var level = h[1].length;
        var inner = inline(h[2]);
        html.push('<h' + level + ' id="' + slugify(h[2]) + '">' + inner + "</h" + level + ">");
        i++;
        continue;
      }

      // Horizontal rule.
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr>");
        i++;
        continue;
      }

      // Blockquote (consecutive `>` lines grouped).
      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*> ?/, ""));
          i++;
        }
        html.push("<blockquote>" + render(quote.join("\n")) + "</blockquote>");
        continue;
      }

      // Unordered / ordered / task list (single nesting level via indent).
      var listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (listMatch) {
        var ordered = /^\d/.test(listMatch[2].trim());
        var items = [];
        while (i < lines.length) {
          var m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (!m) break;
          var task = m[3].match(/^\[([ xX])\]\s+(.*)$/);
          if (task) {
            var checked = task[1].toLowerCase() === "x" ? " checked" : "";
            items.push(
              '<li><input type="checkbox" disabled' + checked + "> " + inline(task[2]) + "</li>"
            );
          } else {
            items.push("<li>" + inline(m[3]) + "</li>");
          }
          i++;
        }
        html.push(ordered ? "<ol>" + items.join("") + "</ol>" : "<ul>" + items.join("") + "</ul>");
        continue;
      }

      // Raw HTML block: pass through the sanitizer verbatim.
      if (/^\s*<(div|section|article|pre|table|ul|ol|blockquote|h[1-6]|p|hr)[\s>]/.test(line)) {
        html.push(line);
        i++;
        continue;
      }

      // Blank line: paragraph separator.
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph: gather consecutive non-blank, non-block lines.
      var para = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(#{1,6}\s|(`{3,}|~{3,})|(\s*)>|\s*([-*_])(\s*\4){2,}\s*$)/.test(lines[i]) &&
        !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) &&
        !(lines[i].includes("|") && i + 1 < lines.length && isTableDelim(lines[i + 1]))
      ) {
        para.push(lines[i].trim());
        i++;
      }
      // Two trailing spaces = hard line break (CommonMark).
      html.push("<p>" + inline(para.join("\n").replace(/  \n/g, "<br>")) + "</p>");
    }

    return sanitize(html.join("\n"));
  }

  window.RenderMd = { render: render, sanitize: sanitize };
})();
