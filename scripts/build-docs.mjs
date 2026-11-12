/*
 * Generator dokumentasi statis: node scripts/build-docs.mjs
 *
 * Konten ada di scripts/docs/content.mjs. Hasil (HTML statis) ditulis ke public/docs/
 * dan di-commit, jadi deploy Vercel tetap tidak butuh build command.
 * Tanpa dependency tambahan.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groups, pages } from "./docs/content.mjs";
import { esc, href } from "./docs/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "docs");
const SITE = "https://tikobox.vercel.app";

/* ---------- urutan navigasi ---------- */
const ordered = groups.flatMap((g) => pages.filter((p) => p.group === g.id));
const groupTitle = Object.fromEntries(groups.map((g) => [g.id, g.title]));

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/* ---------- ekstrak h2 (toc + search) ---------- */
function sections(body) {
  const parts = body.split(/(?=<h2 id=")/);
  return parts
    .map((part) => {
      const m = part.match(/^<h2 id="([^"]+)">(.*?)<a class="anchor"/);
      const text = strip(part.replace(/<pre>[\s\S]*?<\/pre>/g, " "));
      return m ? { id: m[1], title: strip(m[2]), text } : { id: "", title: "", text };
    })
    .filter((s) => s.text);
}

/* ---------- template ---------- */
function navHtml(current) {
  return groups
    .map((g) => {
      const items = pages.filter((p) => p.group === g.id);
      return `<div class="dx-group"><div class="dx-group-title">${esc(g.title)}</div>${items
        .map((p) => {
          const on = p === current;
          return `<a class="dx-link${on ? " on" : ""}" href="${href(p.slug)}"${on ? ' aria-current="page"' : ""}>${esc(p.nav || p.title)}</a>`;
        })
        .join("")}</div>`;
    })
    .join("");
}

function render(page, i) {
  const secs = sections(page.body).filter((s) => s.id);
  const prev = ordered[i - 1];
  const next = ordered[i + 1];
  const url = SITE + href(page.slug);
  const fullTitle = page.slug ? `${page.title} - Tikobox Docs` : "Dokumentasi API - Tikobox";
  const tocList = secs.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`).join("");

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f6f5ef">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(page.desc)}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Tikobox">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(page.desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <meta property="og:image:alt" content="Logo Tikobox">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(page.desc)}">
  <meta name="twitter:image" content="${SITE}/og-image.png">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="stylesheet" href="/assets/css/docs.css">
  <meta name="monetag" content="cf97f76e709b8bde5c0e811e064a9711">
</head>
<body class="dx-body">
<nav class="nav">
  <a class="brand" href="/"><span>TIKO</span>BOX</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a class="active" href="/docs/">Docs</a>
  </div>
</nav>
<div class="dx-bar">
  <button id="menuBtn" class="btn btn-sm" type="button" aria-expanded="false" aria-controls="side">MENU</button>
  <button id="searchBtn" class="btn btn-sm btn-blue" type="button">CARI</button>
  <span class="dx-crumb">${esc(groupTitle[page.group])}</span>
</div>
<div class="dx">
  <aside class="dx-side" id="side" aria-label="Navigasi dokumentasi">
    <div class="dx-search">
      <label class="sr" for="q">Cari dokumentasi</label>
      <input id="q" type="search" placeholder="Cari dokumentasi" autocomplete="off" spellcheck="false">
      <kbd aria-hidden="true">/</kbd>
    </div>
    <div id="results" class="dx-results" hidden></div>
    <nav id="navlist">${navHtml(page)}</nav>
  </aside>
  <div class="dx-overlay" id="overlay" hidden></div>
  <main class="dx-main">
    <article class="doc-content">
      <div class="badge">${esc(groupTitle[page.group].toUpperCase())}</div>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.desc)}</p>
      ${secs.length > 1 ? `<details class="toc-inline"><summary>Di halaman ini</summary><ul>${tocList}</ul></details>` : ""}
      ${page.body}
      <div class="pager">
        ${prev ? `<a class="pager-a" href="${href(prev.slug)}"><small>Sebelumnya</small><b>${esc(prev.nav || prev.title)}</b></a>` : "<span></span>"}
        ${next ? `<a class="pager-a pager-next" href="${href(next.slug)}"><small>Berikutnya</small><b>${esc(next.nav || next.title)}</b></a>` : "<span></span>"}
      </div>
    </article>
  </main>
  <aside class="dx-toc" aria-label="Daftar isi">
    ${secs.length > 1 ? `<div class="dx-toc-in"><b>DI HALAMAN INI</b><ul>${tocList}</ul></div>` : ""}
  </aside>
</div>
<footer>
  <span>© 2026 Tikobox</span>
  <span>Dokumentasi API</span>
</footer>
<script src="/assets/js/docs.js" defer></script>
</body>
</html>
`;
}

/* ---------- build ---------- */
rmSync(out, { recursive: true, force: true });

const index = [];
const lint = [];
const ids = new Map();

ordered.forEach((page, i) => {
  const dir = path.join(out, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), render(page, i));

  const secs = sections(page.body);
  ids.set(href(page.slug), new Set(sections(page.body).map((s) => s.id).filter(Boolean)));
  for (const s of secs) {
    index.push({
      t: page.slug ? page.title : "Beranda",
      s: s.title,
      u: href(page.slug) + (s.id ? `#${s.id}` : ""),
      g: groupTitle[page.group],
      x: s.text.slice(0, 400)
    });
  }

  /* aturan penulisan: tanpa titik di akhir kalimat (abaikan yang berakhir kode) */
  const blocks = [
    ...page.body.matchAll(/<(p|li|td)[^>]*>([\s\S]*?)<\/\1>/g),
    ...page.body.matchAll(/<(div) class="note[^"]*">([\s\S]*?)<\/div>/g)
  ];
  for (const m of blocks) {
    const inner = m[2];
    if (/<(p|li|td|div|ul|ol|table)\b/.test(inner)) continue;
    if (/<\/code>(<\/a>)?\s*$/.test(inner)) continue;
    const text = strip(inner);
    if (/\.\s*$/.test(text)) lint.push(`${href(page.slug)}: "${text.slice(-60)}"`);
  }
});

writeFileSync(path.join(out, "search-index.json"), JSON.stringify(index));

/* ---------- cek link internal ---------- */
const bad = [];
for (const page of ordered) {
  for (const m of page.body.matchAll(/href="(\/docs\/[^"#]*)(#[^"]*)?"/g)) {
    const [, p, h] = m;
    if (!ids.has(p)) bad.push(`${href(page.slug)} -> ${p}`);
    else if (h && !ids.get(p).has(h.slice(1))) bad.push(`${href(page.slug)} -> ${p}${h}`);
  }
}

console.log(`${ordered.length} halaman ditulis ke public/docs/`);
if (lint.length) console.log(`\nPERINGATAN titik di akhir kalimat (${lint.length}):\n` + lint.join("\n"));
if (bad.length) {
  console.error(`\nLINK RUSAK:\n` + bad.join("\n"));
  process.exitCode = 1;
}
