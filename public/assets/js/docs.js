/* Dokumentasi Tikobox: Base URL dinamis, highlight kode, tombol salin, tab bahasa, pencarian, navigasi mobile, daftar isi aktif */
(() => {
  document.documentElement.classList.add("js");

  const SITE = "https://tikobox.my.id";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };

  /* ---------- Base URL mengikuti domain yang membuka dokumentasi ---------- */
  const origin = location.origin;
  if (origin && origin !== SITE) {
    const walker = document.createTreeWalker($(".doc-content"), NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.includes(SITE)) nodes.push(walker.currentNode);
    nodes.forEach((n) => (n.nodeValue = n.nodeValue.split(SITE).join(origin)));
  }

  /* ---------- Salin ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      return ok;
    }
  }

  function flash(btn, ok) {
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = ok ? "TERSALIN" : "GAGAL";
    clearTimeout(btn._t);
    btn._t = setTimeout(() => (btn.textContent = old), 1500);
  }

  $$(".copy").forEach((btn) =>
    btn.addEventListener("click", async () => flash(btn, await copyText($("code", btn.closest(".code")).textContent)))
  );

  [["copyBase", "baseUrl"], ["copyApi", "apiUrl"]].forEach(([b, t]) => {
    const btn = document.getElementById(b);
    const el = document.getElementById(t);
    btn?.addEventListener("click", async () => flash(btn, await copyText(el.textContent.trim())));
  });

  /* ---------- Highlight sintaks ---------- */
  const KW = {
    js: "const let var function return if else for while await async import from export new class try catch finally throw of in typeof default null true false undefined",
    python: "import from def class return if elif else for while in not and or with as try except finally raise None True False pass lambda yield",
    php: "function return if else elseif foreach for while as new class try catch throw public private static const use namespace null true false array",
    bash: "if then else elif fi for do done while in function echo exit set curl jq chmod read local",
    json: "true false null",
    http: ""
  };
  const ALIAS = { javascript: "js", mjs: "js", py: "python", sh: "bash", shell: "bash" };

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const span = (cls, s) => `<span class="tk-${cls}">${esc(s)}</span>`;

  function highlight(src, langRaw) {
    const lang = ALIAS[langRaw] || langRaw;
    const kw = new Set((KW[lang] || "").split(" ").filter(Boolean));
    const hash = lang === "python" || lang === "bash";
    const slash = lang === "js" || lang === "php";

    const parts = [
      hash ? "(#[^\\n]*)" : slash ? "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*)" : "(\\b\\B)",
      lang === "js" ? '("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\[\\s\\S])*`)' : '("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\')',
      "(\\b\\d+(?:\\.\\d+)?\\b)",
      lang === "bash" ? "(\\$\\{?\\w+\\}?|\\s--?[A-Za-z][\\w-]*)" : lang === "php" ? "(\\$\\w+)" : "(\\b\\B)",
      "([A-Za-z_]\\w*)"
    ];
    const re = new RegExp(parts.join("|"), "g");

    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = m.index + m[0].length;
      const [t, com, str, num, v, word] = m;
      if (com) out += span("c", t);
      else if (str) {
        const isKey = lang === "json" && /^\s*:/.test(src.slice(last));
        out += span(isKey ? "key" : "s", t);
      } else if (num) out += span("n", t);
      else if (v) out += span("b", t);
      else if (word) {
        if (kw.has(word)) out += span(word === "null" || word === "true" || word === "false" || word === "None" || word === "True" || word === "False" ? "b" : "k", t);
        else if (/^\s*\(/.test(src.slice(last)) && lang !== "json" && lang !== "http") out += span("f", t);
        else out += esc(t);
      }
    }
    return out + esc(src.slice(last));
  }

  $$("pre code[data-lang]").forEach((el) => {
    const lang = el.dataset.lang;
    if (lang === "http") {
      el.innerHTML = esc(el.textContent).replace(/^([\w-]+)(:)/gm, '<span class="tk-key">$1</span><span class="tk-p">$2</span>');
      return;
    }
    el.innerHTML = highlight(el.textContent, lang);
  });

  /* ---------- Tab bahasa (pilihan diingat di semua halaman) ---------- */
  const LANG_KEY = "tikobox-docs-lang";
  function selectLang(id) {
    $$(".tabs").forEach((tabs) => {
      const tab = $(`.tab[data-tab="${id}"]`, tabs);
      if (!tab) return;
      $$(".tab", tabs).forEach((t) => {
        const on = t === tab;
        t.classList.toggle("on", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$(".tab-panel", tabs).forEach((p) => p.classList.toggle("on", p.dataset.panel === id));
    });
  }
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      store.set(LANG_KEY, t.dataset.tab);
      selectLang(t.dataset.tab);
    })
  );
  const savedLang = store.get(LANG_KEY);
  if (savedLang) selectLang(savedLang);

  /* ---------- Sidebar mobile ---------- */
  const side = $("#side");
  const overlay = $("#overlay");
  const menuBtn = $("#menuBtn");
  const mq = window.matchMedia("(max-width:900px)");

  function setMenu(open) {
    side.classList.toggle("open", open);
    overlay.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("dx-lock", open);
  }
  menuBtn.addEventListener("click", () => setMenu(!side.classList.contains("open")));
  overlay.addEventListener("click", () => setMenu(false));
  $$("#navlist a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  mq.addEventListener?.("change", () => setMenu(false));

  function navHeight() {
    const nav = $(".nav");
    if (nav) document.body.style.setProperty("--navh", nav.offsetHeight + "px");
  }
  navHeight();
  addEventListener("resize", navHeight);

  /* ---------- Pencarian ---------- */
  const input = $("#q");
  const results = $("#results");
  const navlist = $("#navlist");
  let index = null;
  let loading = null;
  let active = -1;

  function loadIndex() {
    if (index) return Promise.resolve(index);
    loading ??= fetch("/docs/search-index.json")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((d) => (index = d));
    return loading;
  }

  const norm = (s) => s.toLowerCase();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function search(q) {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .map((e) => {
        const title = norm(e.t + " " + e.s);
        const body = norm(e.x);
        let score = 0;
        for (const t of terms) {
          if (title.includes(t)) score += 10 + (norm(e.s).startsWith(t) ? 4 : 0);
          else if (body.includes(t)) score += 3;
          else return null;
        }
        return { e, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.e);
  }

  function mark(text, terms) {
    const safe = esc(text);
    if (!terms.length) return safe;
    return safe.replace(new RegExp("(" + terms.map((t) => reEsc(esc(t))).join("|") + ")", "gi"), "<mark>$1</mark>");
  }

  function snippet(e, terms) {
    const text = e.x;
    const low = norm(text);
    let at = -1;
    for (const t of terms) { at = low.indexOf(t); if (at >= 0) break; }
    const start = Math.max(0, at - 30);
    return (start > 0 ? "..." : "") + text.slice(start, start + 90) + (text.length > start + 90 ? "..." : "");
  }

  function render(q) {
    const list = search(q);
    const terms = norm(q).split(/\s+/).filter(Boolean);
    active = -1;
    results.hidden = false;
    navlist.hidden = true;
    if (!list.length) {
      results.innerHTML = '<div class="empty">Tidak ada hasil</div>';
      return;
    }
    results.innerHTML = list
      .map(
        (e) =>
          `<a href="${e.u}"><b>${mark(e.s ? `${e.t} / ${e.s}` : e.t, terms)}</b><small>${mark(snippet(e, terms), terms)}</small></a>`
      )
      .join("");
  }

  function clearSearch() {
    results.hidden = true;
    results.innerHTML = "";
    navlist.hidden = false;
    active = -1;
  }

  input.addEventListener("focus", loadIndex);
  input.addEventListener("input", async () => {
    const q = input.value.trim();
    if (!q) return clearSearch();
    await loadIndex();
    if (input.value.trim() === q) render(q);
  });
  input.addEventListener("keydown", (e) => {
    const links = $$("a", results);
    if (e.key === "Escape") {
      input.value = "";
      clearSearch();
      input.blur();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && links.length) {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle("on", i === active));
      links[active].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && links.length) {
      e.preventDefault();
      location.href = (links[active] || links[0]).getAttribute("href");
    }
  });
  results.addEventListener("click", () => setMenu(false));

  $("#searchBtn").addEventListener("click", () => {
    setMenu(true);
    setTimeout(() => input.focus(), 50);
  });

  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      if (mq.matches) setMenu(true);
      input.focus();
      input.select();
    } else if (e.key === "Escape" && side.classList.contains("open")) {
      setMenu(false);
    }
  });

  /* ---------- Daftar isi aktif ---------- */
  const tocLinks = $$(".dx-toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const map = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const heads = $$(".doc-content h2[id]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            tocLinks.forEach((a) => a.classList.remove("on"));
            map.get(en.target.id)?.classList.add("on");
          }
        });
      },
      { rootMargin: "-90px 0px -70% 0px" }
    );
    heads.forEach((h) => io.observe(h));
  }
})();
