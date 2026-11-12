/*
 * Generator contoh kode per endpoint (cURL, Fetch, Node.js, Python, PHP).
 * Semua contoh dibuat dari satu spesifikasi supaya selalu konsisten dan
 * bisa diuji otomatis (lihat scripts/docs/test-examples.mjs).
 */

export const BASE = "https://tikobox.my.id";
export const UA = "MyTikoboxClient/1.0";
export const LINK = "https://vt.tiktok.com/ZSxxxxxxx/";
export const MEDIA = "https://v16m.tiktokcdn.com/xxxx/video.mp4";

const q = (s) => JSON.stringify(s);

function curl({ path, params, save }) {
  const keys = Object.keys(params);
  const flags = ["-sS"];
  if (save) flags.push("-f");
  const lines = [];
  if (keys.length) {
    lines.push(`curl ${flags.join(" ")} -G ${q(BASE + path)}`);
    lines.push(`  -A ${q(UA)}`);
    keys.forEach((k) => lines.push(`  --data-urlencode ${q(`${k}=${params[k]}`)}`));
  } else {
    lines.push(`curl ${flags.join(" ")} ${q(BASE + path)}`);
    lines.push(`  -A ${q(UA)}`);
  }
  if (save) lines.push(`  -o ${q(save)}`);
  return lines.join(" \\\n");
}

function fetchJs({ path, params, save, raw }) {
  const out = [`const url = new URL(${q(BASE + path)})`];
  for (const [k, v] of Object.entries(params)) out.push(`url.searchParams.set(${q(k)}, ${q(v)})`);
  out.push("");
  if (save) {
    out.push("const res = await fetch(url)");
    out.push("if (!res.ok) throw new Error((await res.json()).msg)");
    out.push("");
    out.push("const blob = await res.blob()");
    out.push("console.log(blob.type, blob.size)");
  } else {
    out.push("const res = await fetch(url)");
    out.push("const json = await res.json()");
    out.push("");
    out.push("if (json.code !== 0) throw new Error(`${res.status} ${json.msg}`)");
    out.push(raw ? "console.log(json)" : "console.log(json.data)");
  }
  return out.join("\n");
}

function nodeJs({ path, params, save, raw }) {
  const out = [`const url = new URL(${q(BASE + path)})`];
  for (const [k, v] of Object.entries(params)) out.push(`url.searchParams.set(${q(k)}, ${q(v)})`);
  out.push("");
  if (save) {
    out.unshift(
      'import { createWriteStream } from "node:fs"',
      'import { Readable } from "node:stream"',
      'import { pipeline } from "node:stream/promises"',
      ""
    );
    out.push(`const res = await fetch(url, { headers: { "User-Agent": ${q(UA)} } })`);
    out.push("if (!res.ok) throw new Error((await res.json()).msg)");
    out.push("");
    out.push(`await pipeline(Readable.fromWeb(res.body), createWriteStream(${q(save)}))`);
    out.push(`console.log("tersimpan:", ${q(save)})`);
  } else {
    out.push(`const res = await fetch(url, { headers: { "User-Agent": ${q(UA)} } })`);
    out.push("const json = await res.json()");
    out.push("");
    out.push("if (json.code !== 0) throw new Error(`${res.status} ${json.msg}`)");
    out.push(raw ? "console.log(json)" : "console.log(json.data)");
  }
  return out.join("\n");
}

function python({ path, params, save, raw }) {
  const out = ["import requests", ""];
  const args = [`    ${q(BASE + path)},`];
  const keys = Object.keys(params);
  if (keys.length) {
    args.push("    params={");
    keys.forEach((k) => args.push(`        ${q(k)}: ${q(params[k])},`));
    args.push("    },");
  }
  args.push(`    headers={"User-Agent": ${q(UA)}},`);
  if (save) args.push("    stream=True,");
  args.push("    timeout=35,");
  out.push("res = requests.get(", ...args, ")", "");
  if (save) {
    out.push("if not res.ok:", '    raise RuntimeError(res.json()["msg"])', "");
    out.push(`with open(${q(save)}, "wb") as f:`, "    for chunk in res.iter_content(chunk_size=65536):", "        f.write(chunk)");
  } else {
    out.push("data = res.json()", "");
    out.push("if data[\"code\"] != 0:", "    raise RuntimeError(f'{res.status_code} {data[\"msg\"]}')", "", raw ? "print(data)" : 'print(data["data"])');
  }
  return out.join("\n");
}

function php({ path, params, save, raw }) {
  const keys = Object.keys(params);
  const out = ["<?php", ""];
  if (keys.length) {
    out.push("$query = http_build_query([");
    keys.forEach((k) => out.push(`    ${q(k)} => ${q(params[k])},`));
    out.push("]);", "");
    out.push(`$ch = curl_init(${q(BASE + path)} . "?" . $query);`);
  } else {
    out.push(`$ch = curl_init(${q(BASE + path)});`);
  }
  if (save) {
    out.push(`$file = fopen(${q(save)}, "wb");`, "");
    out.push("curl_setopt_array($ch, [", "    CURLOPT_FILE => $file,", "    CURLOPT_FOLLOWLOCATION => false,", "    CURLOPT_TIMEOUT => 0,", `    CURLOPT_USERAGENT => ${q(UA)},`, "]);", "");
    out.push("if (!curl_exec($ch)) {", '    throw new RuntimeException(curl_error($ch));', "}", "");
    out.push("$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);", "fclose($file);", "");
    out.push("if ($status !== 200) {", `    unlink(${q(save)});`, '    throw new RuntimeException("HTTP $status");', "}");
  } else {
    out.push("curl_setopt_array($ch, [", "    CURLOPT_RETURNTRANSFER => true,", "    CURLOPT_TIMEOUT => 35,", `    CURLOPT_USERAGENT => ${q(UA)},`, "]);", "");
    out.push("$body = curl_exec($ch);", "if ($body === false) {", "    throw new RuntimeException(curl_error($ch));", "}", "");
    out.push("$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);", "$json = json_decode($body, true);", "");
    out.push('if (($json["code"] ?? -1) !== 0) {', '    throw new RuntimeException($status . " " . ($json["msg"] ?? "error"));', "}", "");
    out.push(raw ? "print_r($json);" : 'print_r($json["data"]);');
  }
  return out.join("\n");
}

export const LANGS = [
  { id: "curl", label: "cURL", lang: "bash", file: "sh", build: curl },
  { id: "fetch", label: "Fetch", lang: "js", file: "js", build: fetchJs },
  { id: "node", label: "Node.js", lang: "js", file: "mjs", build: nodeJs },
  { id: "python", label: "Python", lang: "python", file: "py", build: python },
  { id: "php", label: "PHP", lang: "php", file: "php", build: php }
];

/* spec: { path, params?, save? } -> [{ id, label, lang, file, code }] */
export function examples(spec) {
  const s = { params: {}, ...spec };
  return LANGS.map((l) => ({ id: l.id, label: l.label, lang: l.lang, file: l.file, code: l.build(s) }));
}
