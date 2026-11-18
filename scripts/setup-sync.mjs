#!/usr/bin/env node
// Sets up (or re-checks) Practicando's database from this Mac. Safe to run
// again: every step checks before it acts.
//
//   node scripts/setup-sync.mjs           apply migrations to BOTH schemas, expose them, add sign-in
//                                         URLs, set Netlify + .env.local
//   node scripts/setup-sync.mjs --status  print what's configured, change nothing
//
// Practicando lives inside Listo's Supabase project (the free plan allows two
// active projects), in two schemas of its own: `practicando` (production) and
// `practicando_dev` (dev branch deploy + local dev). So this script only ever
// *adds* to what the project shares: it never changes the site URL, Google
// sign-in or whether new accounts are allowed — those are Listo's
// (../listo/scripts/setup-sync.mjs). See SYNC_SETUP.md.
//
// Credentials come from the CLIs you're already signed in to: the Supabase CLI
// (SUPABASE_ACCESS_TOKEN, ~/.supabase/access-token, or the macOS Keychain) and
// the Netlify CLI. Nothing secret is printed or written to the repo.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_NAME = "listo"; // shared with Listo
const SCHEMAS = ["practicando", "practicando_dev"];
const SITE = "https://practicando-pwa.netlify.app";
const REDIRECTS = [`${SITE}/**`, "https://*--practicando-pwa.netlify.app/**", "http://localhost:3000/**"];
const API = "https://api.supabase.com/v1";

const STATUS_ONLY = process.argv.includes("--status");

const log = (msg) => console.log(msg);
const step = (msg) => console.log(`\n▸ ${msg}`);
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

// --- credentials ------------------------------------------------------------

function supabaseToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  // Where the Supabase CLI keeps its login when the Keychain can't be used.
  const file = join(homedir(), ".supabase", "access-token");
  if (existsSync(file)) {
    const token = readFileSync(file, "utf8").trim();
    if (token.startsWith("sbp_")) return token;
  }
  log("Reading your Supabase CLI login from the Keychain. If macOS asks, choose Allow (Always Allow stops it asking again).");
  try {
    let raw = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 600_000, // a person may need a minute to see the prompt
    }).trim();
    if (raw.startsWith("go-keyring-base64:")) raw = Buffer.from(raw.slice(18), "base64").toString("utf8");
    if (raw.startsWith("sbp_")) return raw;
  } catch {
    /* fall through */
  }
  fail(
    "No Supabase login. If a Keychain prompt appeared, choose Allow and run this again; otherwise run " +
      "`npx supabase@latest login` (or set SUPABASE_ACCESS_TOKEN in your shell).",
  );
}

const TOKEN = supabaseToken();

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${body?.message ?? text}`);
  return body;
}

const sql = (ref, query) => api(`/projects/${ref}/database/query`, { method: "POST", body: JSON.stringify({ query }) });

/** A comma-separated setting with `add` included, keeping everything already there. */
const union = (current, add) => [...new Set([...(current ?? "").split(",").map((s) => s.trim()).filter(Boolean), ...add])].join(",");

// --- project ------------------------------------------------------------------

async function findProject() {
  step("Supabase project");
  const project = (await api("/projects")).find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`No "${PROJECT_NAME}" project. Practicando shares Listo's; set that up first (../listo/SYNC_SETUP.md).`);
  log(`  using "${PROJECT_NAME}" (${project.id}, ${project.region}, ${project.status}), shared with Listo`);
  if (project.status !== "ACTIVE_HEALTHY") fail("The project isn't running (free projects pause after a week idle). Restore it in the dashboard, then run this again.");
  return project;
}

// --- migrations ---------------------------------------------------------------

async function migrate(ref) {
  step("Database migrations (one run per schema)");
  await sql(ref, `
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  `);
  const applied = new Set((await sql(ref, "select version from supabase_migrations.schema_migrations")).map((r) => r.version));
  const dir = join(ROOT, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    for (const schema of SCHEMAS) {
      // One history row per schema (version is the primary key); Listo's and Rocksteady's rows share the table.
      const key = `${version}_${schema}`;
      if (applied.has(key)) {
        log(`  ✓ ${file} → ${schema} (already applied)`);
        continue;
      }
      if (STATUS_ONLY) {
        log(`  · ${file} → ${schema} not applied yet`);
        continue;
      }
      await sql(ref, readFileSync(join(dir, file), "utf8").replaceAll("{{schema}}", schema));
      await sql(ref, `insert into supabase_migrations.schema_migrations (version, name, statements)
        values ('${key}', '${rest.join("_")}', array[]::text[]) on conflict do nothing`);
      log(`  ✓ ${file} → ${schema} applied`);
    }
  }
}

// --- the API has to serve the schema ----------------------------------------

async function exposeSchema(ref) {
  step(`Data API: expose ${SCHEMAS.join(" + ")}`);
  const current = await api(`/projects/${ref}/postgrest`);
  const next = union(current.db_schema, SCHEMAS);
  if (next !== current.db_schema && !STATUS_ONLY) {
    await api(`/projects/${ref}/postgrest`, { method: "PATCH", body: JSON.stringify({ db_schema: next }) });
  }
  const after = STATUS_ONLY ? current : await api(`/projects/${ref}/postgrest`);
  log(`  exposed schemas: ${after.db_schema}`);
}

// --- auth: only ever add -------------------------------------------------------

async function configureAuth(ref) {
  step("Sign-in settings (shared with Listo; Practicando only adds its URLs)");
  const current = await api(`/projects/${ref}/config/auth`);
  const allow = union(current.uri_allow_list, REDIRECTS);
  if (allow !== current.uri_allow_list && !STATUS_ONLY) {
    await api(`/projects/${ref}/config/auth`, { method: "PATCH", body: JSON.stringify({ uri_allow_list: allow }) });
  }
  const after = STATUS_ONLY ? current : await api(`/projects/${ref}/config/auth`);
  const missing = REDIRECTS.filter((r) => !(after.uri_allow_list ?? "").split(",").includes(r));
  log(`  redirects: ${after.uri_allow_list}`);
  if (missing.length) log(`  ✗ missing: ${missing.join(", ")}`);
  log(`  site URL: ${after.site_url} (Listo's; Practicando always says where to come back to)`);
  log(`  Google sign-in: ${after.external_google_enabled ? "on" : "OFF — turn it on with Listo's script: node ../listo/scripts/setup-sync.mjs --google"}`);
  log(`  new accounts: ${after.disable_signup ? "blocked (your account already exists, so you can sign in)" : "allowed — lock with: node ../listo/scripts/setup-sync.mjs --lock"}`);
  return after;
}

// --- keys, Netlify, .env.local -------------------------------------------------

async function browserKey(ref) {
  const keys = await api(`/projects/${ref}/api-keys`);
  const key = keys.find((k) => k.type === "publishable") ?? keys.find((k) => k.name === "anon");
  if (!key?.api_key) fail("Couldn't find the project's publishable key.");
  return key.api_key;
}

function netlifyEnv(name, value) {
  execFileSync("netlify", ["env:set", name, value, "--force"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
}

async function publish(ref) {
  step("Browser settings (Netlify + .env.local)");
  const url = `https://${ref}.supabase.co`;
  const key = await browserKey(ref);
  const vars = { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
  if (STATUS_ONLY) {
    log(`  NEXT_PUBLIC_SUPABASE_URL=${url}`);
    return;
  }
  // Both are safe in the browser: row-level security limits the key to your own rows.
  try {
    for (const [k, v] of Object.entries(vars)) netlifyEnv(k, v);
    log("  ✓ Netlify site variables set (practicando-pwa, all deploy contexts; the schema is derived per environment, not set here)");
  } catch (e) {
    log(`  ! Netlify not updated (${String(e.stderr || e.message).trim().split("\n")[0]}). Create/link the site (docs/deploy.md §1), then run this again.`);
  }
  const envFile = join(ROOT, ".env.local");
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n").filter((l) => l && !/^NEXT_PUBLIC_SUPABASE_/.test(l)) : [];
  writeFileSync(envFile, [...lines, ...Object.entries(vars).map(([k, v]) => `${k}=${v}`), ""].join("\n"));
  log("  ✓ .env.local written (git-ignored)");
}

// --- run ---------------------------------------------------------------------

const project = await findProject();
await migrate(project.id);
await exposeSchema(project.id);
await configureAuth(project.id);
await publish(project.id);
log(`\nDone. Project: https://supabase.com/dashboard/project/${project.id}`);
