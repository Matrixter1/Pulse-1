#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const batchPath = resolveBatchPath(options.file);
  const config = await loadConfig();
  requireConfig(config, ["supabaseUrl", "supabaseServiceKey"]);

  const questions = await loadBatch(batchPath);
  const payload = questions.map(normalizeQuestion);

  if (options["dry-run"]) {
    console.log(`Validated ${payload.length} question(s) from ${batchPath}`);
    for (const question of payload) {
      console.log(`- ${question.id} | ${question.category} | ${question.type} | ${question.text}`);
    }
    return;
  }

  const url = new URL(`${config.supabaseUrl}/rest/v1/questions`);
  url.searchParams.set("on_conflict", "id");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      apikey: config.supabaseServiceKey,
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Supabase import failed (${response.status} ${response.statusText}): ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  const rows = Array.isArray(data) ? data : [];
  console.log(`Upserted ${rows.length || payload.length} question(s) from ${path.basename(batchPath)}.`);
  for (const question of payload) {
    console.log(`- ${question.id} | ${question.category} | ${question.type}`);
  }
}

function printHelp() {
  console.log(`Import a Pulse question batch into live Supabase.

Usage:
  node tools/import-question-batch.mjs --file tools/question-batches/2026-06-slate-01.json

Options:
  --file <path>    Batch JSON file relative to repo root or absolute path
  --dry-run        Validate only; do not write to Supabase
  --help           Show this message
`);
}

function parseCli(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function resolveBatchPath(fileOption) {
  const value = String(fileOption || "tools/question-batches/2026-06-slate-01.json");
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
}

async function loadBatch(batchPath) {
  const raw = await fs.readFile(batchPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Batch file ${batchPath} did not contain a question array.`);
  }
  return parsed;
}

function normalizeQuestion(question, index) {
  if (!question || typeof question !== "object") {
    throw new Error(`Question at index ${index} is not an object.`);
  }

  const id = String(question.id || "").trim();
  const text = normalizeText(question.text);
  const category = String(question.category || "").trim();
  const type = String(question.type || "").trim().toLowerCase();
  const featured = Boolean(question.featured);
  const archived = Boolean(question.archived);
  const revealMode = String(question.reveal_mode || "instant").trim().toLowerCase();
  const options = normalizeOptions(question.options, type);
  const brief = normalizeBrief(question.brief);

  if (!isUuid(id)) {
    throw new Error(`Question "${text || index}" is missing a valid UUID id.`);
  }
  if (!text) {
    throw new Error(`Question ${id} is missing text.`);
  }
  if (!category) {
    throw new Error(`Question ${id} is missing category.`);
  }
  if (!["statement", "choice", "ranked"].includes(type)) {
    throw new Error(`Question ${id} has invalid type "${question.type}".`);
  }
  if (!["instant", "threshold", "date"].includes(revealMode)) {
    throw new Error(`Question ${id} has invalid reveal_mode "${question.reveal_mode}".`);
  }

  return {
    id,
    text,
    category,
    type,
    options,
    brief,
    featured,
    archived,
    reveal_mode: revealMode,
  };
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/â€”/g, "-")
    .trim();
}

function normalizeOptions(raw, type) {
  if (type === "statement") {
    return null;
  }
  if (!Array.isArray(raw)) {
    throw new Error(`A ${type} question is missing an options array.`);
  }
  const options = raw.map((item) => normalizeText(item)).filter(Boolean);
  if (options.length < 2) {
    throw new Error(`A ${type} question must include at least 2 options.`);
  }
  return options;
}

function normalizeBrief(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const title = normalizeNullableText(raw.title);
  const plainEnglish = normalizeNullableText(raw.plain_english ?? raw.plainEnglish);
  const background = normalizeNullableText(raw.background);
  const answerInsights = normalizeObjectList(raw.answer_insights ?? raw.answerInsights, [
    ["answer", "answer"],
    ["insight", "insight"],
  ]);
  const keyTerms = normalizeObjectList(raw.key_terms ?? raw.keyTerms, [
    ["term", "term"],
    ["definition", "definition"],
  ]);
  const sources = normalizeObjectList(raw.sources, [
    ["label", "label"],
    ["url", "url"],
  ]);

  if (
    !title &&
    !plainEnglish &&
    !background &&
    answerInsights.length === 0 &&
    keyTerms.length === 0 &&
    sources.length === 0
  ) {
    return null;
  }

  return {
    title,
    plain_english: plainEnglish,
    background,
    answer_insights: answerInsights,
    key_terms: keyTerms,
    sources,
  };
}

function normalizeObjectList(raw, fieldMap) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const normalized = {};
      for (const [inputKey, outputKey] of fieldMap) {
        normalized[outputKey] = normalizeNullableText(item[inputKey]) ?? "";
      }
      const hasValue = Object.values(normalized).some(Boolean);
      return hasValue ? normalized : null;
    })
    .filter(Boolean);
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

async function loadConfig() {
  const merged = {};
  for (const envPath of [path.join(ROOT, ".env.media.local"), path.join(ROOT, ".env")]) {
    Object.assign(merged, await readEnvFile(envPath));
  }
  Object.assign(merged, process.env);

  const supabaseUrl =
    merged.PULSE_SUPABASE_URL ||
    merged.SUPABASE_URL ||
    merged.VITE_SUPABASE_URL ||
    "";

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseServiceKey: (
      merged.PULSE_SUPABASE_SERVICE_ROLE_KEY ||
      merged.SUPABASE_SERVICE_ROLE_KEY ||
      ""
    ).trim(),
  };
}

async function readEnvFile(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return parseEnvText(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function parseEnvText(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function requireConfig(config, keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(", ")}.`);
  }
  if (config.supabaseUrl.includes("abcdefghijkl.supabase.co")) {
    throw new Error("Supabase URL is still the placeholder value.");
  }
}
