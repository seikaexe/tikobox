/* Helper HTML untuk konten dokumentasi. Semua string konten ditulis oleh pengelola (bukan input pengguna). */

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Tautan internal: L("downloader/video", "Video") -> /docs/downloader/video/ */
export const href = (slug) => (slug ? `/docs/${slug}/` : "/docs/");
export const L = (slug, text, hash = "") => `<a href="${href(slug)}${hash}">${text}</a>`;

export const c = (text) => `<code>${esc(text)}</code>`;
export const h2 = (id, text) =>
  `<h2 id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Tautan ke bagian ini">#</a></h2>`;
export const h3 = (text) => `<h3>${text}</h3>`;
export const p = (html) => `<p>${html}</p>`;
export const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
export const ol = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
export const note = (kind, html) => `<div class="note note-${kind}">${html}</div>`;

export const table = (head, rows, cls = "") =>
  `<div class="tbl ${cls}"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;

/* rows: [nama, tipe, wajib(boolean), keterangan] */
export const params = (rows) =>
  table(
    ["Parameter", "Tipe", "Wajib", "Keterangan"],
    rows.map(([name, type, required, desc]) => [
      c(name),
      c(type).replace("<code>", '<code class="nw">'),
      required ? '<span class="req">wajib</span>' : '<span class="opt">opsional</span>',
      desc
    ])
  );

export const code = (lang, src, title = "") =>
  `<div class="code"><div class="code-head"><span class="code-lang">${esc(title || lang)}</span><button class="copy" type="button" aria-label="Salin kode">SALIN</button></div><pre><code data-lang="${esc(lang)}">${esc(src)}</code></pre></div>`;

export const json = (obj, title = "JSON") => code("json", JSON.stringify(obj, null, 2), title);

/* items: [{ id, label, lang, code }] */
export const tabs = (items) =>
  `<div class="tabs"><div class="tab-list" role="tablist">${items
    .map(
      (t, i) =>
        `<button class="tab${i === 0 ? " on" : ""}" type="button" role="tab" data-tab="${t.id}" aria-selected="${i === 0}">${t.label}</button>`
    )
    .join("")}</div>${items
    .map(
      (t, i) =>
        `<div class="tab-panel${i === 0 ? " on" : ""}" role="tabpanel" data-panel="${t.id}">${code(t.lang, t.code, t.label)}</div>`
    )
    .join("")}</div>`;

export const ep = (method, path) =>
  `<div class="ep"><span class="m m-${method.toLowerCase()}">${method}</span><code class="ep-path">${esc(path)}</code></div>`;
