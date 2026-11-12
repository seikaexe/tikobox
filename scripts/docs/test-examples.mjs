/*
 * Uji contoh kode di dokumentasi: node scripts/docs/test-examples.mjs [direktori-kerja]
 *
 * Menjalankan SEMUA contoh (cURL, Fetch, Node.js, Python, PHP) dan 5 klien lengkap
 * terhadap server tiruan lokal yang meniru kontrak API (rute, parameter, bentuk response).
 * Yang diuji adalah kode contohnya (sintaks, encoding parameter, penanganan response, retry 429),
 * BUKAN koneksi ke TikTok. Butuh: node, bash, curl, jq, python3 + requests, php.
 */
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, LANGS, LINK, MEDIA, examples } from "./examples.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const work = mkdtempSync(path.join(process.argv[2] || os.tmpdir(), "tikobox-ex-"));

/* ---------- server tiruan ---------- */
let mode = "video";
let limitFirst = false;
const seen = [];

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  seen.push({ path: decodeURIComponent(u.pathname), q: Object.fromEntries(u.searchParams), ua: req.headers["user-agent"] || "" });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  if (/^\/api\/(tiktok|user|hashtag)/.test(u.pathname) || u.pathname.startsWith("/api/@")) {
    if (limitFirst) {
      limitFirst = false;
      return send(429, { code: -1, msg: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { "retry-after": "1" });
    }
  }
  if (u.pathname === "/api/health") return send(200, { code: 0, msg: "success", data: { status: "ok" } });
  if (u.pathname === "/api/") return send(200, { code: 0, msg: "success", name: "Tikobox API", usage: {} });
  if (u.pathname === "/api/tiktok") {
    if (!u.searchParams.get("url")) return send(400, { code: -1, msg: "Link TikTok tidak valid." });
    const data = {
      id: "7300000000000000000", play: mode === "photo" ? "" : `${origin}/media/video.mp4`, music: `${origin}/media/music.mp3`,
      cookie: "ttwid=abc; x=y", ...(mode === "photo" ? { images: [`${origin}/media/1.jpg`, `${origin}/media/2.jpg`] } : {})
    };
    return send(200, { code: 0, msg: "success", processed_time: 0.1, data });
  }
  if (u.pathname === "/api/user" || u.pathname.startsWith("/api/@") || u.pathname.startsWith("/api/user/"))
    return send(200, { code: 0, msg: "success", data: { unique_id: "username" } });
  if (u.pathname === "/api/hashtag" || u.pathname.startsWith("/api/hashtag/"))
    return send(200, { code: 0, msg: "success", data: { name: "fyp" } });
  if (u.pathname === "/api/download") {
    const target = u.searchParams.get("url");
    if (!target) return send(400, { code: -1, msg: "URL media tidak diizinkan." });
    res.writeHead(200, { "content-type": "video/mp4" });
    return res.end(Buffer.from("FAKEBYTES"));
  }
  send(404, { code: -1, msg: "Endpoint tidak ditemukan." });
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const localize = (s) => s.replaceAll(BASE, origin);

/* ---------- eksekutor (asinkron: server tiruan hidup di proses ini) ---------- */
function run(cmd, args, opts) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), opts.timeout || 60000);
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
    p.on("error", (e) => { clearTimeout(timer); resolve({ status: -1, stdout, stderr: String(e) }); });
  });
}
const runners = {
  sh: (f, cwd) => run("bash", [f], { cwd }),
  js: (f, cwd) => run("node", [f], { cwd }),
  mjs: (f, cwd) => run("node", [f], { cwd }),
  py: (f, cwd) => run("python3", ["-I", f], { cwd }),
  php: (f, cwd) => run("php", [f], { cwd })
};

let pass = 0;
const fails = [];
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fails.push(`${name}${detail ? "\n    " + detail.trim().split("\n").slice(0, 6).join("\n    ") : ""}`);
}

/* ---------- 1. contoh per endpoint ---------- */
const specs = {
  "tiktok": { path: "/api/tiktok", params: { url: LINK }, expect: (r) => r.q.url === LINK },
  "user": { path: "/api/user", params: { unique_id: "username" }, expect: (r) => r.q.unique_id === "username" },
  "@user": { path: "/api/@username", params: {}, expect: (r) => r.path === "/api/@username" },
  "hashtag": { path: "/api/hashtag", params: { name: "fyp" }, expect: (r) => r.q.name === "fyp" },
  "health": { path: "/api/health", params: {}, expect: (r) => r.path === "/api/health" },
  "info": { path: "/api/", params: {}, raw: true, expect: (r) => r.path === "/api/" },
  "download": { path: "/api/download", params: { url: MEDIA, name: "video.mp4" }, save: "out.bin", expect: (r) => r.q.url === MEDIA && r.q.name === "video.mp4" }
};

for (const [key, spec] of Object.entries(specs)) {
  for (const e of examples(spec)) {
    const dir = path.join(work, `${key}-${e.id}`);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `ex.${e.file}`);
    // cURL: jalankan sebagai skrip bash; Fetch: modul ES (top-level await)
    const body = e.id === "fetch" ? `${localize(e.code)}\n` : localize(e.code);
    writeFileSync(file, e.id === "fetch" ? body : body);
    if (e.id === "fetch") writeFileSync(file.replace(/\.js$/, ".mjs"), body);
    const runFile = e.id === "fetch" ? file.replace(/\.js$/, ".mjs") : file;
    // contoh download menyimpan ke nama tertentu; sesuaikan nama file hasil
    const before = seen.length;
    const r = await runners[path.extname(runFile).slice(1)](runFile, dir);
    const reqs = seen.slice(before);
    const hit = reqs.find(spec.expect);
    const saved = spec.save && e.id !== "fetch" ? [spec.save, "video.mp4", "out.bin"].some((n) => existsSync(path.join(dir, n)) && statSync(path.join(dir, n)).size > 0) : true;
    check(`${key} / ${e.label}`, r.status === 0 && hit && saved, `exit=${r.status} hit=${!!hit} saved=${saved}\n${r.stderr}${r.stdout}`.slice(0, 400));
    // header User-Agent terkirim pada klien non-browser
    if (e.id !== "fetch" && hit) check(`${key} / ${e.label} (User-Agent)`, hit.ua.startsWith("MyTikoboxClient"), hit.ua);
  }
}

/* ---------- 2. klien lengkap (panduan) ---------- */
const clients = [
  ["curl", "tikobox.sh", "sh", [LINK]],
  ["nodejs", "client.mjs", "mjs", []],
  ["python", "client.py", "py", []],
  ["php", "client.php", "php", []]
];

for (const m of ["video", "photo"]) {
  mode = m;
  for (const [name, file, ext, args] of clients) {
    const dir = path.join(work, `client-${name}-${m}`);
    mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, file);
    writeFileSync(dest, localize(readFileSync(path.join(here, "snippets", file), "utf8")));
    limitFirst = name !== "curl"; // klien dengan retry harus lolos setelah 429 pertama
    const r = await run(ext === "sh" ? "bash" : ext === "php" ? "php" : ext === "py" ? "python3" : "node", [...(ext === "py" ? ["-I"] : []), dest, ...args], { cwd: dir, timeout: 90000 });
    limitFirst = false;
    const files = existsSync(dir) ? ["7300000000000000000.mp4", "7300000000000000000.mp3", "7300000000000000000-1.jpg", "7300000000000000000-2.jpg"].filter((f) => existsSync(path.join(dir, f))) : [];
    const want = m === "video" ? ["7300000000000000000.mp4", "7300000000000000000.mp3"] : ["7300000000000000000-1.jpg", "7300000000000000000-2.jpg", "7300000000000000000.mp3"];
    check(`klien ${name} (${m})`, r.status === 0 && want.every((f) => files.includes(f)), `exit=${r.status} files=${files}\n${r.stderr}${r.stdout}`);
  }
}

/* klien browser: hanya cek sintaks (butuh DOM untuk menjalankan) */
{
  const f = path.join(work, "browser.mjs");
  writeFileSync(f, localize(readFileSync(path.join(here, "snippets", "browser.js"), "utf8")));
  const r = spawnSync("node", ["--check", f], { encoding: "utf8" });
  check("klien browser (sintaks)", r.status === 0, r.stderr);
}

server.close();
console.log(`lulus: ${pass}`);
if (fails.length) {
  console.log(`GAGAL: ${fails.length}\n- ${fails.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Semua contoh kode berjalan terhadap server tiruan");
}
console.log(`direktori kerja: ${work}`);
