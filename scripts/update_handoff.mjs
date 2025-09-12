// scripts/update_handoff.mjs
// Auto-update Handoff docs per Next.js + Supabase + Vercel
// - Nessuna dipendenza: usa solo Node core.
// - Funziona in locale e in GitHub Actions.
// - Se SUPABASE_DB_URL è settata e la CLI "supabase" è presente,
//   fa il dump schema con RLS; altrimenti concatena le migrations.

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(_exec);
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs/handoff");
const MIG_DIR = path.join(ROOT, "supabase/migrations");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".vercel"
]);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function exists(p) {
  try { await fs.stat(p); return true; } catch { return false; }
}

function block(lang, s) {
  return "```" + lang + "\n" + s.trimEnd() + "\n```";
}

async function fileTree(root, base = root) {
  const dirents = await fs.readdir(root, { withFileTypes: true });
  // ordina: directory prima
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
  // ultimi 30 giorni (modifica tramite env GIT_WINDOW)
  const window = process.env.GIT_WINDOW || "30.days";
  try {
    const { stdout } = await exec(`git log --since='${window}' --pretty=format:'- %h %ad %s' --date=short`);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function scanTodos() {
  // TODO/FIXME nei file sorgenti
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
  // 1) Se CLI presente e SUPABASE_DB_URL impostata, usa dump con RLS
  try {
    const { stdout: ver } = await exec("supabase --version");
    if (ver && process.env.SUPABASE_DB_URL) {
      const tmp = path.join(os.tmpdir(), `schema_${Date.now()}.sql`);
      const cmd = `supabase db dump --db-url "${process.env.SUPABASE_DB_URL}" --schema public --role-level-policies --file ${tmp}`;
      const { stdout, stderr } = await exec(cmd);
      const ok = await exists(tmp);
      if (ok) {
        const sql = await fs.readFile(tmp, "utf-8");
        if (sql.trim()) return { method: "supabase-cli", sql };
      }
    }
  } catch { /* ignore */ }

  // 2) Fallback: concatena tutte le migrations .sql
  if (await exists(MIG_DIR)) {
    const files = (await fs.readdir(MIG_DIR))
      .filter(f => f.endsWith(".sql"))
      .sort();
    let sql = "";
    for (const f of files) {
      const p = path.join(MIG_DIR, f);
      sql += `-- ${f}\n` + await fs.readFile(p, "utf-8") + "\n\n";
    }
    if (sql.trim()) return { method: "migrations", sql };
  }

  // 3) Ultimo fallback
  return { method: "fallback", sql: "-- Nessuno schema trovato. Aggiungi SUPABASE_DB_URL o le migrations in supabase/migrations." };
}

async function writeFileSafe(p, content) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, content, "utf-8");
}

async function buildOverview({ pkg, apiRoutes, envs }) {
  const scripts = pkg?.scripts ? block("json", JSON.stringify(pkg.scripts, null, 2)) : "_(nessuno)_";
  const deps = pkg?.dependencies ? block("json", JSON.stringify(pkg.dependencies, null, 2)) : "_(nessuno)_";
  const devDeps = pkg?.devDependencies ? block("json", JSON.stringify(pkg.devDependencies, null, 2)) : "_(nessuno)_";
  const routes = apiRoutes.length ? block("", apiRoutes.join("\n")) : "_(nessuna API trovata)_";
  const envSection = envs.length
    ? envs.map(e => `### ${e.name}\n${block("", e.content || "_(vuoto)_")}`).join("\n\n")
    : "_(nessun file .env trovato)_";

  return `# Handoff Overview

## Stack & Deploy
- **Frontend**: Next.js (React)
- **Backend**: API Routes Next.js
- **DB**: Supabase (Postgres + RLS)
- **Deploy**: Vercel (app) / Supabase (DB)

## Scripts npm
${scripts}

## Dependencies
${deps}

## DevDependencies
${devDeps}

## API Routes rilevate
${routes}

## Env files rilevati
${envSection}
`;
}

async function buildRepoTree(tree) {
  return `# Repo Tree

${block("", tree)}
`;
}

async function buildDbSchema(method, sql) {
  const note = method === "supabase-cli"
    ? "> Schema generato via **Supabase CLI** con RLS.\n"
    : method === "migrations"
      ? "> Schema generato concatenando le **migrations**.\n"
      : "> **ATTENZIONE**: nessuno schema disponibile.\n";

  return `# DB Schema (Supabase)

${note}
${block("sql", sql || "--")}
`;
}

async function buildTasks({ todos, gitlog, changelog }) {
  return `# Handoff Tasks

## TODO / FIXME (scan sorgente)
${todos ? block("", todos) : "_(nessuno trovato)_"}

## Commits recenti
${gitlog ? block("", gitlog) : "_(vuoto)_"}

## CHANGELOG (estratto)
${changelog ? changelog : "_(assente)_"}
`;
}

async function buildPack(parts) {
  return `# Handoff Pack

> Documento unico per onboarding rapido.  
> Copia questo file nella nuova chat.

---

${parts.overview}

---

${parts.repoTree}

---

${parts.dbSchema}

---

${parts.tasks}
`;
}

(async () => {
  const pkg = await readPkgJson();
  const apiRoutes = await listApiRoutes();
  const envs = await collectEnvFiles();
  const tree = await fileTree(ROOT, ROOT);

  const overview = await buildOverview({ pkg, apiRoutes, envs });
  const repoTree = await buildRepoTree(tree);

  const { method, sql } = await dumpSupabaseSchema();
  const dbSchema = await buildDbSchema(method, sql);

  const todos = await scanTodos();
  const gitlog = await getGitSummary();
  const changelog = await readChangelog();
  const tasks = await buildTasks({ todos, gitlog, changelog });

  await writeFileSafe(path.join(OUT_DIR, "handoff_overview.md"), overview);
  await writeFileSafe(path.join(OUT_DIR, "repo_tree.md"), repoTree);
  await writeFileSafe(path.join(OUT_DIR, "db_schema.md"), dbSchema);
  await writeFileSafe(path.join(OUT_DIR, "handoff_tasks.md"), tasks);

  const pack = await buildPack({ overview, repoTree, dbSchema, tasks });
  await writeFileSafe(path.join(OUT_DIR, "handoff_pack.md"), pack);

  console.log("Handoff aggiornato in docs/handoff ✅");
})().catch(err => {
  console.error("Errore update_handoff:", err);
  process.exit(1);
});
