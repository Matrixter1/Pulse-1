#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TMP_DIR = path.join(ROOT, "tmp", "pulse-media");
const GENERATED_DIR = path.join(TMP_DIR, "generated");
const PREVIEW_DIR = path.join(ROOT, "artifacts", "pulse-preview");
const STATE_PATH = path.join(TMP_DIR, "state.json");
const QUESTION_SELECT = [
  "id",
  "text",
  "type",
  "category",
  "options",
  "brief",
  "featured",
  "archived",
  "image_url",
  "thumbnail_url",
  "created_at",
].join(",");

const DEFAULT_SCOPE = "live";
const DEFAULT_QUALITY = "medium";
const DEFAULT_SIZE = "1536x1024";
const DEFAULT_COUNT = 5;
const DEFAULT_POLL_INTERVAL = 5;
const DEFAULT_POLL_TIMEOUT = 240;
const DEFAULT_CLOUDINARY_FOLDER = "pulse/questions";
const ACTIVE_STATUSES = new Set(["submitted", "generated", "uploaded"]);

const MOOD_BY_CATEGORY = {
  Consumer: "fun",
  Entertainment: "fun",
  Food: "fun",
  Health: "thought-provoking",
  Lifestyle: "fun",
  Personality: "fun",
  Politics: "thought-provoking",
  Relationships: "engaging",
  Spirituality: "thought-provoking",
  Technology: "engaging",
  Travel: "fun",
};

const PROMPT_PERSONA =
  "You are a world-class graphic design specialist, brought in to create incredible artsy, thought-provoking and fun content to match the world-leading Pulse website that is here to change humanity.";

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (!command || options.help) {
    printHelp();
    return;
  }

  const config = await loadConfig();

  switch (command) {
    case "list":
      await cmdList(config, options);
      return;
    case "preview":
      await cmdPreview(config, options);
      return;
    case "preview-batch":
      await cmdPreviewBatch(config, options);
      return;
    case "submit":
      await cmdSubmit(config, options);
      return;
    case "poll":
      await cmdPoll(config, options);
      return;
    case "status":
      await cmdStatus();
      return;
    case "promote-local":
      await cmdPromoteLocal(config, options);
      return;
    case "reset-state":
      await cmdResetState();
      return;
    default:
      throw new Error(`Unknown command "${command}". Run with --help for usage.`);
  }
}

function printHelp() {
  console.log(`Pulse media CLI

Usage:
  npm run pulse:media -- <command> [options]

Commands:
  list        Show questions from live Supabase and whether they already have media
  preview     Generate one local-only preview image
  preview-batch Generate multiple local-only preview images without uploading
  submit      Queue background image jobs for questions missing media
  poll        Harvest completed jobs, upload to Cloudinary, patch Supabase
  status      Show local job-state summary
  promote-local Upload approved local preview PNGs and patch Supabase
  reset-state Delete the local async state file

Examples:
  npm run pulse:media -- list --scope live --has-media no
  npm run pulse:media -- preview --id <question-id>
  npm run pulse:media -- preview-batch --ids <id1,id2> --count 2
  npm run pulse:media -- submit --scope live --count 5
  npm run pulse:media -- promote-local --ids <id1,id2> --input-dir artifacts/pulse-preview/review-v2-six
  npm run pulse:media -- poll

Notes:
  - Create .env.media.local from .env.media.example before using submit or poll.
  - This account tier has a rate limit of about 5 image submissions per rolling minute.
  - State is stored in tmp/pulse-media/state.json.
`);
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  const options = { _: [] };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
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
    openaiKey: (merged.OPENAI_API_KEY || "").trim(),
    supabaseUrl: supabaseUrl.trim(),
    supabaseServiceKey: (
      merged.PULSE_SUPABASE_SERVICE_ROLE_KEY ||
      merged.SUPABASE_SERVICE_ROLE_KEY ||
      ""
    ).trim(),
    cloudinaryCloudName: (
      merged.PULSE_CLOUDINARY_CLOUD_NAME ||
      merged.CLOUDINARY_CLOUD_NAME ||
      ""
    ).trim(),
    cloudinaryApiKey: (
      merged.PULSE_CLOUDINARY_API_KEY ||
      merged.CLOUDINARY_API_KEY ||
      ""
    ).trim(),
    cloudinaryApiSecret: (
      merged.PULSE_CLOUDINARY_API_SECRET ||
      merged.CLOUDINARY_API_SECRET ||
      ""
    ).trim(),
    cloudinaryFolder: (
      merged.PULSE_CLOUDINARY_FOLDER ||
      DEFAULT_CLOUDINARY_FOLDER
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
    throw new Error(
      `Missing required config: ${missing.join(", ")}. Create .env.media.local from .env.media.example.`,
    );
  }
  if (config.supabaseUrl && config.supabaseUrl.includes("abcdefghijkl.supabase.co")) {
    throw new Error(
      "Supabase URL is still the placeholder value from .env. Put the real project URL in .env.media.local.",
    );
  }
}

function parseCsv(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePipeList(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeScope(value) {
  const scope = String(value || DEFAULT_SCOPE).toLowerCase();
  if (!["live", "archived", "all"].includes(scope)) {
    throw new Error(`Invalid --scope "${value}". Use live, archived, or all.`);
  }
  return scope;
}

function normalizeHasMedia(value, fallback = "all") {
  const normalized = String(value || fallback).toLowerCase();
  if (!["yes", "no", "all"].includes(normalized)) {
    throw new Error(`Invalid --has-media "${value}". Use yes, no, or all.`);
  }
  return normalized;
}

function parseCount(value, fallback) {
  if (value === undefined || value === true) {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid numeric value "${value}".`);
  }
  return parsed;
}

function hasMedia(question) {
  return Boolean(question.image_url || question.thumbnail_url);
}

function parseQuestionOptions(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!raw) {
    return [];
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (_) {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseQuestionBrief(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function slugify(value) {
  return String(value || "question")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60) || "question";
}

function pickMood(category) {
  return MOOD_BY_CATEGORY[category] || "engaging";
}

function buildPrompt(question) {
  const options = parseQuestionOptions(question.options);
  const brief = parseQuestionBrief(question.brief);
  const plainEnglish =
    typeof brief?.plain_english === "string"
      ? brief.plain_english.trim()
      : typeof brief?.plainEnglish === "string"
        ? brief.plainEnglish.trim()
        : "";
  const background =
    typeof brief?.background === "string" ? brief.background.trim() : "";
  const title = typeof brief?.title === "string" ? brief.title.trim() : "";
  const lines = [
    PROMPT_PERSONA,
    "",
    `Your first task: create a ${pickMood(question.category)} image for the following Pulse website question.`,
    "It should feel cinematic, premium, editorial, emotionally intelligent, and designed for a dark luxury interface.",
    "Do not put text, typography, letters, numbers, logos, badges, interface chrome, charts, or labels on the image.",
    "Prefer symbolic storytelling, rich atmosphere, strong focal composition, and a clean subject that reads clearly even when cropped inside a card.",
    "",
    `Question type: ${String(question.type || "statement").trim()}.`,
    `Category: ${String(question.category || "General").trim()}.`,
    `"${String(question.text || "").trim()}"`,
  ];

  if (title) {
    lines.push("");
    lines.push(`Concept title: ${title}`);
  }

  if (plainEnglish) {
    lines.push("");
    lines.push(`In plain English: ${plainEnglish}`);
  }

  if (background) {
    lines.push("");
    lines.push(`Context: ${background}`);
  }

  if (options.length > 0) {
    lines.push("answers");
    lines.push("");
    lines.push(...options.map((option) => `- ${option}`));
    lines.push("");
    lines.push(
      "The image should suggest the emotional terrain of these answers without literally typesetting or diagramming them.",
    );
  }

  return lines.join("\n");
}

async function ensureDirectories() {
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
}

async function loadState() {
  await ensureDirectories();
  try {
    const text = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(text);
    return {
      version: 1,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { version: 1, jobs: [] };
    }
    throw error;
  }
}

async function saveState(state) {
  await ensureDirectories();
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function fetchQuestions(config, filters = {}) {
  requireConfig(config, ["supabaseUrl", "supabaseServiceKey"]);
  const scope = normalizeScope(filters.scope);
  const ids = filters.ids || [];
  const url = new URL(`${config.supabaseUrl}/rest/v1/questions`);
  url.searchParams.set("select", QUESTION_SELECT);
  url.searchParams.set("order", "created_at.desc");

  if (scope === "live") {
    url.searchParams.set("archived", "eq.false");
  } else if (scope === "archived") {
    url.searchParams.set("archived", "eq.true");
  }

  if (ids.length === 1) {
    url.searchParams.set("id", `eq.${ids[0]}`);
  } else if (ids.length > 1) {
    url.searchParams.set("id", `in.(${ids.join(",")})`);
  }

  const { data } = await fetchJson(url.toString(), {
    method: "GET",
    headers: supabaseHeaders(config.supabaseServiceKey),
  });

  let questions = Array.isArray(data) ? data : [];

  if (filters.category) {
    questions = questions.filter((question) => question.category === filters.category);
  }
  if (filters.featuredOnly) {
    questions = questions.filter((question) => Boolean(question.featured));
  }

  const hasMediaFilter = normalizeHasMedia(filters.hasMedia, "all");
  if (hasMediaFilter === "yes") {
    questions = questions.filter(hasMedia);
  } else if (hasMediaFilter === "no") {
    questions = questions.filter((question) => !hasMedia(question));
  }

  return questions;
}

async function cmdList(config, options) {
  const questions = await fetchQuestions(config, {
    scope: options.scope,
    hasMedia: options["has-media"],
    category: options.category,
    featuredOnly: Boolean(options["featured-only"]),
    ids: parseCsv(options.ids),
  });

  const withMedia = questions.filter(hasMedia).length;
  const withoutMedia = questions.length - withMedia;

  console.log(`Questions returned: ${questions.length}`);
  console.log(`With media: ${withMedia}`);
  console.log(`Missing media: ${withoutMedia}`);
  console.log("");

  for (const question of questions) {
    const flag = question.featured ? "*" : " ";
    const mediaLabel = hasMedia(question) ? "media" : "missing";
    console.log(
      `${flag} ${question.id} | ${question.category} | ${question.type || "statement"} | ${mediaLabel} | ${question.text}`,
    );
  }
}

async function cmdPreview(config, options) {
  requireConfig(config, ["openaiKey"]);

  let question;
  if (options.id) {
    const questions = await fetchQuestions(config, {
      ids: [String(options.id)],
      scope: "all",
      hasMedia: "all",
    });
    question = questions[0];
    if (!question) {
      throw new Error(`Question ${options.id} was not found.`);
    }
  } else {
    if (!options.question) {
      throw new Error("preview requires --id or --question.");
    }
    question = {
      id: options.slug || `preview-${Date.now()}`,
      text: options.question,
      type: options.type || "statement",
      category: options.category || "Consumer",
      options: parsePipeList(options.options),
    };
  }

  await ensureDirectories();
  const quality = String(options.quality || DEFAULT_QUALITY);
  const size = String(options.size || DEFAULT_SIZE);
  const prompt = buildPrompt(question);
  const response = await submitOpenAiGeneration(config.openaiKey, prompt, quality, size);

  console.log(`response_id=${response.id}`);
  const completed = await pollOpenAiGeneration(config.openaiKey, response.id, {
    intervalSeconds: parseCount(options["poll-interval"], DEFAULT_POLL_INTERVAL),
    timeoutSeconds: parseCount(options.timeout, DEFAULT_POLL_TIMEOUT),
  });

  const imageBytes = extractImageBytes(completed);
  if (!imageBytes) {
    throw new Error("Preview completed without image bytes.");
  }

  const baseName = `${new Date().toISOString().slice(0, 10)}-${slugify(question.text)}`;
  const outputPath = options.output
    ? path.resolve(ROOT, String(options.output))
    : path.join(PREVIEW_DIR, `${baseName}.png`);
  const metaPath = outputPath.replace(/\.png$/u, ".json");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, imageBytes);
  await fs.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        response_id: response.id,
        question,
        quality,
        size,
        prompt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`saved=${outputPath}`);
  console.log(`meta=${metaPath}`);
}

async function cmdPreviewBatch(config, options) {
  requireConfig(config, ["openaiKey", "supabaseUrl", "supabaseServiceKey"]);
  await ensureDirectories();

  const ids = parseCsv(options.ids);
  if (ids.length === 0) {
    throw new Error("preview-batch requires --ids.");
  }

  const count = parseCount(options.count, ids.length);
  const quality = String(options.quality || DEFAULT_QUALITY);
  const size = String(options.size || DEFAULT_SIZE);
  const outputDir = options["output-dir"]
    ? path.resolve(ROOT, String(options["output-dir"]))
    : path.join(PREVIEW_DIR, `batch-${new Date().toISOString().slice(0, 10)}-${Date.now()}`);

  await fs.mkdir(outputDir, { recursive: true });

  const questions = await fetchQuestions(config, {
    ids,
    scope: "all",
    hasMedia: "all",
  });

  if (questions.length === 0) {
    throw new Error("No matching questions found for preview-batch.");
  }

  const selected = ids
    .map((id) => questions.find((question) => question.id === id))
    .filter(Boolean)
    .slice(0, count);

  console.log(`Submitting ${selected.length} local preview job(s) at quality=${quality}, size=${size}.`);

  const jobs = [];
  for (const question of selected) {
    const prompt = buildPrompt(question);
    const response = await submitOpenAiGeneration(config.openaiKey, prompt, quality, size);
    jobs.push({ question, prompt, responseId: response.id });
    console.log(`- ${question.id} -> ${response.id}`);
  }

  const deadline = Date.now() + parseCount(options.timeout, DEFAULT_POLL_TIMEOUT) * 1000;
  const remaining = new Map(jobs.map((job) => [job.responseId, job]));
  const completed = [];

  while (remaining.size > 0) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${remaining.size} preview job(s).`);
    }

    for (const [responseId, job] of [...remaining.entries()]) {
      const payload = await fetchOpenAiResponse(config.openaiKey, responseId);
      if (payload.status === "queued" || payload.status === "in_progress") {
        continue;
      }
      if (payload.status === "failed") {
        throw new Error(`Preview batch job failed for ${job.question.id}: ${JSON.stringify(payload.error || {})}`);
      }
      if (payload.status !== "completed") {
        continue;
      }

      const imageBytes = extractImageBytes(payload);
      if (!imageBytes) {
        throw new Error(`Preview batch job completed without image bytes for ${job.question.id}.`);
      }

      const baseName = `${job.question.id}-${slugify(job.question.text)}`;
      const pngPath = path.join(outputDir, `${baseName}.png`);
      const jsonPath = path.join(outputDir, `${baseName}.json`);
      await fs.writeFile(pngPath, imageBytes);
      await fs.writeFile(
        jsonPath,
        `${JSON.stringify(
          {
            response_id: responseId,
            question: job.question,
            quality,
            size,
            prompt: job.prompt,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      completed.push({ id: job.question.id, pngPath, jsonPath });
      remaining.delete(responseId);
      console.log(`  completed ${job.question.id} -> ${pngPath}`);
    }

    if (remaining.size > 0) {
      await sleep(parseCount(options["poll-interval"], DEFAULT_POLL_INTERVAL) * 1000);
    }
  }

  console.log("");
  console.log(`Saved ${completed.length} preview(s) to ${outputDir}`);
}

async function cmdSubmit(config, options) {
  requireConfig(config, ["openaiKey", "supabaseUrl", "supabaseServiceKey"]);

  const state = await loadState();
  const activeQuestionIds = new Set(
    state.jobs
      .filter((job) => ACTIVE_STATUSES.has(job.status))
      .map((job) => job.q_id),
  );

  const scope = normalizeScope(options.scope);
  const count = parseCount(options.count, DEFAULT_COUNT);
  const quality = String(options.quality || DEFAULT_QUALITY);
  const size = String(options.size || DEFAULT_SIZE);
  const ids = parseCsv(options.ids);
  const hasMediaFilter = options.force ? "all" : normalizeHasMedia(options["has-media"], "no");

  let questions = await fetchQuestions(config, {
    scope,
    hasMedia: hasMediaFilter,
    category: options.category,
    featuredOnly: Boolean(options["featured-only"]),
    ids,
  });

  questions = questions.filter((question) => !activeQuestionIds.has(question.id)).slice(0, count);

  if (questions.length === 0) {
    console.log("Nothing to submit.");
    return;
  }

  console.log(`Submitting ${questions.length} job(s) at quality=${quality}, size=${size}.`);
  for (const question of questions) {
    const prompt = buildPrompt(question);
    const response = await submitOpenAiGeneration(config.openaiKey, prompt, quality, size);
    state.jobs.push({
      q_id: question.id,
      q_text: question.text,
      q_type: question.type || "statement",
      q_category: question.category,
      q_options: parseQuestionOptions(question.options),
      featured: Boolean(question.featured),
      archived: Boolean(question.archived),
      prompt,
      quality,
      size,
      resp_id: response.id,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    console.log(`- ${question.id} -> ${response.id}`);
  }

  await saveState(state);
  console.log("");
  console.log("Tip: keep submissions to 5 per rolling minute on this account tier.");
  console.log(`State saved to ${STATE_PATH}`);
}

async function cmdPoll(config, options) {
  requireConfig(config, [
    "openaiKey",
    "supabaseUrl",
    "supabaseServiceKey",
    "cloudinaryCloudName",
    "cloudinaryApiKey",
    "cloudinaryApiSecret",
  ]);

  const state = await loadState();
  const limit = parseCount(options.limit, Number.MAX_SAFE_INTEGER);
  const jobs = state.jobs
    .filter((job) => ACTIVE_STATUSES.has(job.status))
    .slice(0, limit);

  if (jobs.length === 0) {
    console.log("No active jobs.");
    await cmdStatus();
    return;
  }

  for (const job of jobs) {
    console.log(`${job.q_id} | ${job.status}`);

    if (job.status === "submitted") {
      const payload = await fetchOpenAiResponse(config.openaiKey, job.resp_id);
      const status = payload.status;
      if (status === "queued" || status === "in_progress") {
        console.log(`  response status=${status}`);
        continue;
      }
      if (status === "failed") {
        job.status = "failed";
        job.error = JSON.stringify(payload.error || { message: "generation failed" });
        console.log(`  failed=${job.error}`);
        continue;
      }
      if (status !== "completed") {
        console.log(`  skipped unexpected response status=${status}`);
        continue;
      }

      const imageBytes = extractImageBytes(payload);
      if (!imageBytes) {
        job.status = "failed";
        job.error = "completed response had no image_generation output";
        console.log(`  failed=${job.error}`);
        continue;
      }

      const localPaths = await writeGeneratedArtifact(job, imageBytes);
      job.local_png_path = localPaths.pngPath;
      job.local_meta_path = localPaths.metaPath;
      job.status = "generated";
      job.generated_at = new Date().toISOString();
      console.log(`  saved local artifact=${job.local_png_path}`);
    }

    if (job.status === "generated") {
      const imageBytes = await fs.readFile(job.local_png_path);
      const upload = await uploadToCloudinary(config, imageBytes, `${job.q_id}.png`);
      const urls = buildCloudinaryUrls(config.cloudinaryCloudName, upload.public_id);
      job.public_id = upload.public_id;
      job.image_url = urls.image_url;
      job.thumbnail_url = urls.thumbnail_url;
      job.status = "uploaded";
      job.uploaded_at = new Date().toISOString();
      console.log(`  uploaded public_id=${job.public_id}`);
    }

    if (job.status === "uploaded") {
      const result = await patchQuestionMedia(config, job.q_id, job.image_url, job.thumbnail_url);
      job.status = "synced";
      job.synced_at = new Date().toISOString();
      delete job.error;
      console.log(`  synced rows=${result.updatedCount}`);
    }
  }

  await saveState(state);
  console.log("");
  await cmdStatus();
}

async function cmdStatus() {
  const state = await loadState();
  const counts = {};
  for (const job of state.jobs) {
    counts[job.status] = (counts[job.status] || 0) + 1;
  }

  console.log(`State: ${STATE_PATH}`);
  console.log(
    `submitted=${counts.submitted || 0} generated=${counts.generated || 0} uploaded=${counts.uploaded || 0} synced=${counts.synced || 0} failed=${counts.failed || 0}`,
  );

  for (const job of state.jobs.slice(-20)) {
    console.log(
      `- ${job.q_id} | ${job.q_category} | ${job.q_type} | ${job.status}${job.public_id ? ` | ${job.public_id}` : ""}${job.error ? ` | ERROR ${job.error}` : ""}`,
    );
  }
}

async function cmdPromoteLocal(config, options) {
  requireConfig(config, [
    "supabaseUrl",
    "supabaseServiceKey",
    "cloudinaryCloudName",
    "cloudinaryApiKey",
    "cloudinaryApiSecret",
  ]);

  const ids = parseCsv(options.ids);
  if (ids.length === 0) {
    throw new Error("promote-local requires --ids.");
  }

  const inputDir = options["input-dir"]
    ? path.resolve(ROOT, String(options["input-dir"]))
    : null;
  if (!inputDir) {
    throw new Error("promote-local requires --input-dir.");
  }

  const files = await fs.readdir(inputDir);
  const questions = await fetchQuestions(config, {
    ids,
    scope: "all",
    hasMedia: "all",
  });
  const questionById = new Map(questions.map((question) => [question.id, question]));

  for (const id of ids) {
    const question = questionById.get(id);
    if (!question) {
      throw new Error(`Question ${id} was not found.`);
    }

    const filename = files.find((file) => file.startsWith(`${id}-`) && file.endsWith(".png"));
    if (!filename) {
      throw new Error(`No local PNG found for ${id} in ${inputDir}.`);
    }

    const pngPath = path.join(inputDir, filename);
    const imageBytes = await fs.readFile(pngPath);
    const upload = await uploadToCloudinary(config, imageBytes, `${id}.png`);
    const urls = buildCloudinaryUrls(config.cloudinaryCloudName, upload.public_id);
    const result = await patchQuestionMedia(config, id, urls.image_url, urls.thumbnail_url);

    console.log(`${id} | uploaded ${upload.public_id} | patched rows=${result.updatedCount}`);
  }
}

async function cmdResetState() {
  try {
    await fs.unlink(STATE_PATH);
    console.log(`Deleted ${STATE_PATH}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("State file did not exist.");
      return;
    }
    throw error;
  }
}

function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function patchQuestionMedia(config, questionId, imageUrl, thumbnailUrl) {
  const url = new URL(`${config.supabaseUrl}/rest/v1/questions`);
  url.searchParams.set("id", `eq.${questionId}`);

  const { data, responseText } = await fetchJson(url.toString(), {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(config.supabaseServiceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
    }),
  });

  const updatedCount = Array.isArray(data) ? data.length : 0;
  if (updatedCount !== 1) {
    throw new Error(
      `Supabase patch for ${questionId} did not affect exactly one row. Response: ${responseText}`,
    );
  }

  return { updatedCount };
}

async function submitOpenAiGeneration(apiKey, prompt, quality, size) {
  const { data } = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: prompt,
      tools: [{ type: "image_generation", quality, size }],
      background: true,
    }),
  });

  return data;
}

async function fetchOpenAiResponse(apiKey, responseId) {
  const { data } = await fetchJson(`https://api.openai.com/v1/responses/${responseId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return data;
}

async function pollOpenAiGeneration(apiKey, responseId, options) {
  const timeoutSeconds = options.timeoutSeconds || DEFAULT_POLL_TIMEOUT;
  const intervalSeconds = options.intervalSeconds || DEFAULT_POLL_INTERVAL;
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const payload = await fetchOpenAiResponse(apiKey, responseId);
    const status = payload.status;
    if (status !== lastStatus) {
      console.log(`status=${status}`);
      lastStatus = status;
    }
    if (status === "completed") {
      return payload;
    }
    if (status === "failed") {
      throw new Error(JSON.stringify(payload.error || { message: "generation failed" }));
    }
    await sleep(intervalSeconds * 1000);
  }

  throw new Error(`Timed out waiting for response ${responseId}`);
}

function extractImageBytes(payload) {
  for (const item of payload.output || []) {
    if (item.type === "image_generation_call" && item.result) {
      return Buffer.from(item.result, "base64");
    }
  }
  return null;
}

async function writeGeneratedArtifact(job, imageBytes) {
  await ensureDirectories();
  const safeBase = `${job.q_id}-${slugify(job.q_text)}`;
  const pngPath = path.join(GENERATED_DIR, `${safeBase}.png`);
  const metaPath = path.join(GENERATED_DIR, `${safeBase}.json`);

  await fs.writeFile(pngPath, imageBytes);
  await fs.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        q_id: job.q_id,
        text: job.q_text,
        type: job.q_type,
        category: job.q_category,
        options: job.q_options,
        prompt: job.prompt,
        response_id: job.resp_id,
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return { pngPath, metaPath };
}

async function uploadToCloudinary(config, imageBytes, filename) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`folder=${config.cloudinaryFolder}&timestamp=${timestamp}${config.cloudinaryApiSecret}`)
    .digest("hex");

  const form = new FormData();
  form.set("file", new Blob([imageBytes], { type: "image/png" }), filename);
  form.set("api_key", config.cloudinaryApiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", config.cloudinaryFolder);
  form.set("signature", signature);

  const { data } = await fetchJson(
    `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  return data;
}

function buildCloudinaryUrls(cloudName, publicId) {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;
  return {
    image_url: `${base}/w_1800,c_limit,q_auto:good,f_auto/${publicId}`,
    thumbnail_url: `${base}/w_900,c_limit,q_auto:eco,f_auto/${publicId}`,
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : JSON.stringify(data || { status: response.status });
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${message}`);
  }

  return { data, responseText };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
