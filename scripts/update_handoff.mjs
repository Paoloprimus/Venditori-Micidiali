// scripts/update_handoff.mjs
// Auto-update Handoff docs per Next.js + Supabase + Vercel
// Nessuna dipendenza extra: solo Node core
// Genera docs/handoff/* e docs/handoff_share/*

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(_exec);
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/handoff");
const SHARE_DIR = path.join(ROOT, "docs/handoff_share");
const MIG_DIR = path.join(ROOT, "supabase/migrations");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".vercel"
]);

// --------------------- UTILS ---------------------
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }
function block(lang, s) { return "```" + lang + "\n" + (s ?? "").trimEnd() + "\n```"; }

// --------------------- SCANSIONI ---------------------
async function fileTree(root, base = root) {
  const dirents = await fs.readdir(root, { withFileTypes: true });
  dirents.sort((a,b)=> Number(b.isDirectory())-Number(a.isDirectory()) || a.name.localeCompare(b.name));
  const lines = [];
  for (const d of dirents) {
    if (IGNORE_DIRS.has(d.name)) continue;
    const full = path.join(root, d.name);
    const rel = path.relative(base, full).replace(/\\/g, "/");
    lines.push(rel + (d.isDirectory() ? "/" : ""));
    if (d.isDirectory()) lines.push(await fileTree(full, base));
  }
  return lines.filter(Boolean).join("\n");
}

async function listApiRoutes() {
  const candidates = ["pages/api", "app/api"];
  const found = [];
  for (const rel of candidates) {
    const base = path.join(ROOT, rel);
    if (!(await exists(base))) continue;
    const stack = [base];
    while (stack.length) {
      const d = stack.pop();
      const items = await fs.readdir(d, { withFileTypes: true });
      for (const it of items) {
        const p = path.join(d, it.name);
        if (it.isDirectory()) stack.push(p);
        else if (/\.(ts|tsx|js|mjs|cjs)$/.test(it.name)) {
          found.push(path.relative(ROOT, p).replace(/\\/g, "/"));
        }
      }
    }
  }
  found.sort();
  return found;
}

async function buildRoutesManifest() {
  const pages = [];
  const appDir = path.join(ROOT, "app");
  const pagesDir = path.join(ROOT, "pages");

  async function walk(dir) {
    if (!(await exists(dir))) return;
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      const items = await fs.readdir(d, { withFileTypes: true });
      for (const it of items) {
        const p = path.join(d, it.name);
        if (it.isDirectory()) stack.push(p);
        else if (/\.(tsx?|jsx?)$/.test(it.name)) {
          const rel = path.relative(ROOT, p).replace(/\\/g, "/");
          if (/\/(page|route)\.(tsx?|jsx?)$/.test(rel) || rel.startsWith("pages/")) {
            let kind = "page";
            if (/\/api\//.test(rel) || /route\.(tsx?|jsx?)$/.test(rel)) kind = "api";
            // Heuristica metodi HTTP
            let methods = [];
            try {
              const txt = await fs.readFile(p, "utf-8");
              const m = txt.match(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g);
              if (m) methods = [...new Set(m.map(s => s.replace(/^.*\b(GET|POST|PUT|PATCH|DELETE)\b.*$/,'$1')))];
            } catch {}
            pages.push({ rel, kind, methods });
          }
        }
      }
    }
  }
  await walk(appDir);
  await walk(pagesDir);
  pages.sort((a,b)=> a.rel.localeCompare(b.rel));

  const lines = pages.map(p => `- ${p.kind.toUpperCase()} ${p.rel}${p.kind==="api" && p.methods.length ? " — ["+p.methods.join(", ")+"]" : ""}`);
  return `# Routes Manifest\n\n${lines.length ? lines.join("\n") : "_(nessuna route trovata)_"}`;
}

async function readPkgJson() {
  const p = path.join(ROOT, "package.json");
  if (!(await exists(p))) return null;
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

async function collectEnvFiles() {
  const names = [".env", ".env.local", ".env.development", ".env.production", ".env.example"];
  const res = [];
  for (const n of names) {
    const p = path.join(ROOT, n);
    if (await exists(p)) {
      const raw = await fs.readFile(p, "utf-8");
      const scrub = raw.replace(/(^\s*#.*$)/gm, "").trim();
      res.push({ name: n, content: scrub });
    }
  }
  return res;
}

async function getGitSummary() {
  const window = process.env.GIT_WINDOW || "30.days";
  try {
    const { stdout } = await exec(`git log --since='${window}' --pretty=format:'- %h %ad %s' --date=short`);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function scanTodos() {
  const patterns = ["TODO", "FIXME", "@todo", "@fixme"];
  const res = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (IGNORE_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs|sql|md)$/.test(e.name)) {
        const rel = path.relative(ROOT, full).replace(/\\/g, "/");
        const text = await fs.readFile(full, "utf-8");
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (patterns.some(p => line.includes(p))) {
            res.push(`${rel}:${i+1}: ${line.trim()}`);
          }
        });
      }
    }
  }
  await walk(ROOT);
  return res.join("\n");
}

async function readChangelog() {
  const p = path.join(ROOT, "CHANGELOG.md");
  return (await exists(p)) ? await fs.readFile(p, "utf-8") : "";
}

async function dumpSupabaseSchema() {
  try {
    const { stdout: ver } = await exec("supabase --version");
    if (ver && process.env.SUPABASE_DB_URL) {
      const tmp = path.join(os.tmpdir(), `schema_${Date.now()}.sql`);
      const cmd = `supabase db dump --db-url "${process.env.SUPABASE_DB_URL}" --schema public --role-level-policies --file ${tmp}`;
      await exec(cmd);
      if (await exists(tmp)) {
        const sql = await fs.readFile(tmp, "utf-8");
        if (sql.trim()) return { method: "supabase-cli", sql };
      }
    }
  } catch {}
  if (await exists(MIG_DIR)) {
    const files = (await fs.readdir(MIG_DIR)).filter(f => f.endsWith(".sql")).sort();
    let sql = "";
    for (const f of files) {
      const p = path.join(MIG_DIR, f);
      sql += `-- ${f}\n` + await fs.readFile(p, "utf-8") + "\n\n";
    }
    if (sql.trim()) return { method: "migrations", sql };
  }
  return { method: "fallback", sql: "-- Nessuno schema trovato." };
}

// --------------------- SEZIONI ---------------------
async function quickstartSection(pkg, envs) {
  const run = pkg?.scripts?.dev ? "npm run dev" : (pkg?.scripts?.start ? "npm start" : "npx next dev");
  const envKeys = envs.flatMap(e => (e.content || "").split(/\r?\n/).map(l => l.split("=")[0]));
  const mustHave = envKeys.filter(k => /KEY|SECRET|URL|TOKEN|PROJECT|SUPABASE|OPENAI/i.test(k));
  const publicEnv = envKeys.filter(k => /^NEXT_PUBLIC_/i.test(k));

  return `## Quickstart

**Avvio locale**
\`\`\`
${run}
\`\`\`

**Variabili importanti**
${mustHave.length ? mustHave.map(k => "- " + k).join("\n") : "_(nessuna individuata)_"}

**Variabili pubbliche**
${publicEnv.length ? publicEnv.map(k => "- " + k).join("\n") : "_(nessuna individuata)_"}
`;
}

async function buildOverview({ pkg, apiRoutes, envs }) {
  const scripts = pkg?.scripts ? block("json", JSON.stringify(pkg.scripts, null, 2)) : "_(nessuno)_";
  const deps = pkg?.dependencies ? block("json", JSON.stringify(pkg.dependencies, null, 2)) : "_(nessuno)_";
  const routes = apiRoutes.length ? block("", apiRoutes.join("\n")) : "_(nessuna API)_";
  const envSection = envs.length ? envs.map(e => `### ${e.name}\n${block("", e.content)}`).join("\n\n") : "_(nessun file .env)_";

  return `# Handoff Overview

## Scripts npm
${scripts}

## Dependencies
${deps}

## API Routes
${routes}

## Env
${envSection}
`;
}

async function buildRepoTree(tree) {
  return `# Repo Tree\n\n${block("", tree)}\n`;
}

async function buildDbSchema(method, sql) {
  return `# DB Schema\n\n${block("sql", sql || "--")}\n`;
}

async function buildTasks({ todos, gitlog, changelog }) {
  return `# Handoff Tasks

## TODO/FIXME
${todos ? block("", todos) : "_(nessuno)_"}

## Commits recenti
${gitlog ? block("", gitlog) : "_(vuoto)_"}

## CHANGELOG
${changelog || "_(assente)_"}
`;
}

async function buildPack(parts) {
  return `# Handoff Pack

> Documento unico per onboarding rapido.

---

${parts.quickstart}

---

${parts.overview}

---

${parts.routesManifest}

---

${parts.repoTree}

---

${parts.dbSchema}

---

${parts.tasks}
`;
}

// --------------------- SHARE ---------------------
async function chunkString(str, maxLen = 100000) {
  const chunks = [];
  for (let i = 0; i < str.length; i += maxLen) {
    chunks.push(str.slice(i, i + maxLen));
  }
  return chunks;
}

async function writeSharePack(fullPack) {
  await ensureDir(SHARE_DIR);
  const chunks = await chunkString(fullPack, 100000);
  const indexLines = [];
  for (let i = 0; i < chunks.length; i++) {
    const fname = `handoff_pack_part_${String(i + 1).padStart(2, "0")}.md`;
    await fs.writeFile(path.join(SHARE_DIR, fname), chunks[i], "utf-8");
    indexLines.push(`- ${fname}`);
  }
  const starter = `COPIA QUESTO TESTO COME PRIMO MESSAGGIO NELLA NUOVA CHAT:

Ti passo il pacchetto di handoff a pezzi (PARTI numerate).
Leggi tutto e poi rispondi con:
1) riassunto operativo
2) rischi/ambiguità
3) prossimi passi

Inizio a incollare PARTI ora. Dimmi "OK" quando sei pronto.`;

  await fs.writeFile(path.join(SHARE_DIR, "handoff_prompt_starter.txt"), starter, "utf-8");
  await fs.writeFile(path.join(SHARE_DIR, "handoff_index.md"), `# Index\n\n${indexLines.join("\n")}`, "utf-8");
}

// --------------------- MAIN ---------------------
(async () => {
  await ensureDir(OUT_DIR);

  const pkg = await readPkgJson();
  const apiRoutes = await listApiRoutes();
  const envs = await collectEnvFiles();
  const tree = await fileTree(ROOT, ROOT);
  const routesManifest = await buildRoutesManifest();
  const quickstart = await quickstartSection(pkg, envs);

  const overview = await buildOverview({ pkg, apiRoutes, envs });
  const repoTree = await buildRepoTree(tree);
  const { method, sql } = await dumpSupabaseSchema();
  const dbSchema = await buildDbSchema(method, sql);

  const todos = await scanTodos();
  const gitlog = await getGitSummary();
  const changelog = await readChangelog();
  const tasks = await buildTasks({ todos, gitlog, changelog });

  await fs.writeFile(path.join(OUT_DIR, "handoff_overview.md"), overview, "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "routes_manifest.md"), routesManifest, "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "repo_tree.md"), repoTree, "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "db_schema.md"), dbSchema, "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "handoff_tasks.md"), tasks, "utf-8");

  const pack = await buildPack({ quickstart, overview, routesManifest, repoTree, dbSchema, tasks });
  await fs.writeFile(path.join(OUT_DIR, "handoff_pack.md"), pack, "utf-8");

  await writeSharePack(pack);

  console.log("✅ Handoff aggiornato in docs/handoff + docs/handoff_share");
})().catch(err => {
  console.error("Errore update_handoff:", err);
  process.exit(1);
});
