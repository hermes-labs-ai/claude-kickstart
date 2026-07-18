#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const HARNESS = path.join(ROOT, "claude-kickstart");
const STATE_DIR = path.join(HARNESS, "state");
const CREATIONS_DIR = path.join(HARNESS, "creations");
const STATUS_FILE = path.join(STATE_DIR, "status.json");
const LEARNING_FILE = path.join(STATE_DIR, "learning-state.json");
const PORTRAIT_FILE = path.join(STATE_DIR, "user-portrait.md");
const HISTORY_FILE = path.join(STATE_DIR, "possibility-history.md");
const NOTES_FILE = path.join(STATE_DIR, "onboarding-notes.md");
const PENDING_SELECTION_FILE = path.join(STATE_DIR, "pending-selection.md");

const ONBOARDING_STATES = new Set([
  "not_started",
  "in_progress",
  "interrupted",
  "complete",
]);
const MODES = new Set(["active", "inactive"]);
const STAGES = new Set([
  "welcome",
  "awaiting_safety",
  "awaiting_self_description",
  "awaiting_followup_1",
  "awaiting_followup_2",
  "awaiting_followup_3",
  "awaiting_portrait_confirmation",
  "awaiting_orientation",
  "awaiting_possibility",
  "first_action",
]);
const EVIDENCE_TYPES = new Set([
  "modified_suggestion",
  "corrected_assumption",
  "understood_file_change",
  "chose_scope",
  "requested_control",
  "recovered_from_error",
  "asked_underlying_mechanism",
]);
const GUIDANCE_PREFERENCES = new Set(["adaptive", "simpler", "advanced"]);

function now() {
  return new Date().toISOString();
}

function stamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function defaultStatus() {
  return {
    schema_version: 1,
    installation: "initialized",
    mode: "inactive",
    onboarding_status: "not_started",
    stage: "welcome",
    reset_status: "none",
    safety_choice: null,
    selected_direction: null,
    interruption_count: 0,
    last_event: "initialized",
    last_updated: null,
  };
}

function defaultLearning() {
  return {
    schema_version: 1,
    stage: 0,
    label: "guided_passenger",
    guidance_preference: "adaptive",
    evidence: [],
    last_updated: null,
  };
}

const STAGE_LABELS = [
  "guided_passenger",
  "active_chooser",
  "collaborative_steerer",
  "capable_builder",
  "independent_user",
];

const PORTRAIT_TEMPLATE = `# User Portrait

This file belongs to the user. It is local, readable, editable, and deletable.

## Explicitly shared

_Not collected yet._

## Interests and recurring themes

_Not collected yet._

## Desired outcomes and frictions

_Not collected yet._

## Learning and communication preferences

_Not collected yet._

## Explicit boundaries

_Not collected yet._

## Provisional interaction hypotheses

_None yet. Hypotheses must be labeled as tentative and corrected when the user disagrees._
`;

const HISTORY_TEMPLATE = `# Possibility History

Generated, selected, modified, combined, and rejected directions are recorded here.
This is a working memory, not a list of permitted actions.
`;

const NOTES_TEMPLATE = `# Onboarding Notes

Resumable notes from the user's own words and the pending question are kept here.
The user can inspect, correct, or delete this file at any time.
`;

const PENDING_SELECTION_TEMPLATE = `# Pending Selection

_No direction is pending._
`;

function fail(message, details = {}) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message, ...details }, null, 2)}\n`);
  process.exitCode = 1;
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertLocalPath(target) {
  const rootReal = fs.realpathSync(ROOT);
  const existing = fs.existsSync(target)
    ? fs.realpathSync(target)
    : fs.realpathSync(path.dirname(target));
  if (!isInside(existing, rootReal)) {
    throw new Error(`Refusing a state path outside this repository: ${target}`);
  }
}

function ensureDirectories() {
  assertLocalPath(HARNESS);
  if (fs.existsSync(STATE_DIR) && fs.lstatSync(STATE_DIR).isSymbolicLink()) {
    const target = fs.realpathSync(STATE_DIR);
    if (!isInside(target, fs.realpathSync(ROOT))) {
      throw new Error("Refusing a state directory symlink that leaves this repository");
    }
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(CREATIONS_DIR, { recursive: true });
  assertLocalPath(STATE_DIR);
  assertLocalPath(CREATIONS_DIR);
}

function atomicWrite(file, content) {
  assertLocalPath(file);
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
}

function writeJson(file, value) {
  atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureFile(file, content) {
  if (!fs.existsSync(file)) atomicWrite(file, content);
}

function validateStatus(value) {
  if (!value || value.schema_version !== 1) throw new Error("unsupported status schema");
  if (value.installation !== "initialized") throw new Error("installation is not initialized");
  if (!MODES.has(value.mode)) throw new Error(`invalid mode: ${value.mode}`);
  if (!ONBOARDING_STATES.has(value.onboarding_status)) {
    throw new Error(`invalid onboarding status: ${value.onboarding_status}`);
  }
  if (!STAGES.has(value.stage)) throw new Error(`invalid onboarding stage: ${value.stage}`);
  if (!Number.isInteger(value.interruption_count) || value.interruption_count < 0) {
    throw new Error("invalid interruption count");
  }
  return value;
}

function validateLearning(value) {
  if (!value || value.schema_version !== 1) throw new Error("unsupported learning schema");
  if (!Number.isInteger(value.stage) || value.stage < 0 || value.stage > 4) {
    throw new Error("learning stage must be an integer from 0 to 4");
  }
  if (value.label !== STAGE_LABELS[value.stage]) throw new Error("learning label does not match stage");
  if (!GUIDANCE_PREFERENCES.has(value.guidance_preference)) {
    throw new Error("invalid guidance preference");
  }
  if (!Array.isArray(value.evidence)) throw new Error("learning evidence must be an array");
  return value;
}

function recoverJson(file, factory, validator) {
  const backup = `${file}.corrupt-${stamp()}.bak`;
  fs.renameSync(file, backup);
  const replacement = factory();
  writeJson(file, replacement);
  process.stderr.write(
    `Claude Kickstart recovered malformed state. The original was preserved at ${path.relative(ROOT, backup)}.\n`,
  );
  return validator(replacement);
}

function loadJson(file, factory, validator) {
  ensureDirectories();
  if (!fs.existsSync(file)) {
    const value = factory();
    writeJson(file, value);
    return validator(value);
  }
  assertLocalPath(file);
  try {
    return validator(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return recoverJson(file, factory, validator);
  }
}

function loadStatus() {
  return loadJson(STATUS_FILE, defaultStatus, validateStatus);
}

function loadLearning() {
  return loadJson(LEARNING_FILE, defaultLearning, validateLearning);
}

function initialize() {
  ensureDirectories();
  const created = [];
  const candidates = [
    [STATUS_FILE, `${JSON.stringify(defaultStatus(), null, 2)}\n`],
    [LEARNING_FILE, `${JSON.stringify(defaultLearning(), null, 2)}\n`],
    [PORTRAIT_FILE, PORTRAIT_TEMPLATE],
    [HISTORY_FILE, HISTORY_TEMPLATE],
    [NOTES_FILE, NOTES_TEMPLATE],
    [PENDING_SELECTION_FILE, PENDING_SELECTION_TEMPLATE],
  ];
  for (const [file, content] of candidates) {
    if (!fs.existsSync(file)) {
      ensureFile(file, content);
      created.push(path.relative(ROOT, file));
    }
  }
  loadStatus();
  loadLearning();
  return { ok: true, action: "init", created, changed: created.length > 0 };
}

function saveStatus(status, event) {
  status.last_event = event;
  status.last_updated = now();
  validateStatus(status);
  writeJson(STATUS_FILE, status);
}

function saveLearning(learning) {
  learning.label = STAGE_LABELS[learning.stage];
  learning.last_updated = now();
  validateLearning(learning);
  writeJson(LEARNING_FILE, learning);
}

function enter() {
  initialize();
  const status = loadStatus();
  let route;
  if (status.onboarding_status === "not_started") {
    route = "first_run";
    status.onboarding_status = "in_progress";
    status.stage = "awaiting_safety";
  } else if (["in_progress", "interrupted"].includes(status.onboarding_status)) {
    route = "resume_onboarding";
    if (status.onboarding_status === "interrupted") status.interruption_count += 1;
    status.onboarding_status = "in_progress";
  } else {
    route = status.mode === "active" ? "already_active" : "returning_user";
  }
  status.mode = "active";
  status.reset_status = "none";
  saveStatus(status, route);
  return { ok: true, action: "enter", route, status };
}

function checkpoint(stage, extra = {}) {
  if (!STAGES.has(stage)) throw new Error(`Unknown checkpoint stage: ${stage}`);
  const status = loadStatus();
  if (status.mode !== "active") throw new Error("Enter Claude Kickstart before checkpointing onboarding");
  status.onboarding_status = "in_progress";
  status.stage = stage;
  if (extra.safety_choice) status.safety_choice = extra.safety_choice;
  saveStatus(status, `checkpoint:${stage}`);
  return { ok: true, action: "checkpoint", stage, status };
}

function complete() {
  const status = loadStatus();
  if (status.mode !== "active") throw new Error("Enter Claude Kickstart before completing onboarding");
  status.onboarding_status = "complete";
  status.stage = "first_action";
  saveStatus(status, "onboarding_complete");
  return { ok: true, action: "complete", status };
}

function leave() {
  const status = loadStatus();
  if (status.onboarding_status === "in_progress") status.onboarding_status = "interrupted";
  status.mode = "inactive";
  saveStatus(status, "left_guided_mode");
  return {
    ok: true,
    action: "leave",
    preserved: [
      "claude-kickstart/state/user-portrait.md",
      "claude-kickstart/state/possibility-history.md",
      "claude-kickstart/creations/",
    ],
    clean_exit_note: "A fresh Claude Code session removes any residual instructions from the current conversation.",
    re_entry: "The user returns by typing /kickstart. Plain-language phrases will not re-enter guided mode in a fresh session; relay the exact command.",
    status,
  };
}

function sessionEnd() {
  const status = loadStatus();
  if (status.mode === "active" && status.onboarding_status === "in_progress") {
    status.onboarding_status = "interrupted";
    status.mode = "inactive";
    saveStatus(status, "session_interrupted");
  }
}

function requestReset() {
  const status = loadStatus();
  status.reset_status = "requested";
  saveStatus(status, "reset_requested");
  return { ok: true, action: "reset_requested", confirmation_required: true, status };
}

function resetConfirmed() {
  const previous = loadStatus();
  const reset = defaultStatus();
  reset.reset_status = "completed";
  reset.last_event = "reset_completed";
  reset.last_updated = now();
  reset.interruption_count = previous.interruption_count;
  writeJson(STATUS_FILE, reset);
  writeJson(LEARNING_FILE, defaultLearning());
  atomicWrite(PORTRAIT_FILE, PORTRAIT_TEMPLATE);
  atomicWrite(HISTORY_FILE, HISTORY_TEMPLATE);
  atomicWrite(NOTES_FILE, NOTES_TEMPLATE);
  atomicWrite(PENDING_SELECTION_FILE, PENDING_SELECTION_TEMPLATE);
  return {
    ok: true,
    action: "reset",
    preserved: ["claude-kickstart/creations/"],
    status: reset,
  };
}

function clearPortrait() {
  const status = loadStatus();
  atomicWrite(PORTRAIT_FILE, PORTRAIT_TEMPLATE);
  atomicWrite(NOTES_FILE, NOTES_TEMPLATE);
  if (status.mode === "active") {
    status.onboarding_status = "in_progress";
    status.stage = "awaiting_self_description";
  } else {
    status.onboarding_status = "not_started";
    status.stage = "welcome";
  }
  saveStatus(status, "portrait_deleted");
  return { ok: true, action: "portrait_deleted", creations_preserved: true, status };
}

function selectDirection(text) {
  const direction = text.trim();
  if (!direction) throw new Error("A selected direction is required");
  const status = loadStatus();
  status.selected_direction = direction;
  saveStatus(status, "direction_selected");
  fs.appendFileSync(
    HISTORY_FILE,
    `\n## Selected — ${now()}\n\n${direction}\n`,
    "utf8",
  );
  return { ok: true, action: "direction_selected", direction, status };
}

function selectFromPending() {
  if (!fs.existsSync(PENDING_SELECTION_FILE)) {
    throw new Error("The pending selection file is missing");
  }
  const content = fs.readFileSync(PENDING_SELECTION_FILE, "utf8");
  const direction = content
    .replace(/^# Pending Selection\s*/i, "")
    .replace(/^_No direction is pending\._\s*/i, "")
    .trim();
  if (!direction) throw new Error("Write the chosen or combined direction to state/pending-selection.md first");
  const result = selectDirection(direction);
  atomicWrite(PENDING_SELECTION_FILE, PENDING_SELECTION_TEMPLATE);
  return { ...result, action: "direction_selected_from_pending" };
}

function evidence(type, note) {
  if (!EVIDENCE_TYPES.has(type)) throw new Error(`Unknown evidence type: ${type}`);
  const learning = loadLearning();
  learning.evidence.push({ type, note: note || "", observed_at: now() });
  learning.evidence = learning.evidence.slice(-50);
  const unique = new Set(learning.evidence.map((item) => item.type));
  let recommendation = 0;
  if (unique.size >= 1) recommendation = 1;
  if (unique.size >= 2) recommendation = 2;
  if (unique.size >= 4 && (unique.has("requested_control") || unique.has("recovered_from_error"))) {
    recommendation = 3;
  }
  if (unique.size >= 6 && unique.has("asked_underlying_mechanism")) recommendation = 4;
  if (learning.guidance_preference === "adaptive") {
    learning.stage = Math.max(learning.stage, recommendation);
  }
  saveLearning(learning);
  return { ok: true, action: "evidence_recorded", type, recommendation, learning };
}

function setGuidance(preference) {
  if (!GUIDANCE_PREFERENCES.has(preference)) throw new Error(`Unknown guidance preference: ${preference}`);
  const learning = loadLearning();
  learning.guidance_preference = preference;
  if (preference === "simpler") learning.stage = Math.max(0, learning.stage - 1);
  if (preference === "advanced") learning.stage = Math.min(4, learning.stage + 1);
  saveLearning(learning);
  return { ok: true, action: "guidance_updated", learning };
}

function setLevel(level) {
  const parsed = Number(level);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4) {
    throw new Error("Level must be an integer from 0 to 4");
  }
  const learning = loadLearning();
  learning.stage = parsed;
  saveLearning(learning);
  return { ok: true, action: "level_updated", learning };
}

function doctor() {
  const required = [
    path.join(ROOT, ".claude", "commands", "kickstart.md"),
    path.join(ROOT, ".claude", "commands", "leave-kickstart.md"),
    path.join(ROOT, ".claude", "settings.json"),
    path.join(HARNESS, "RUNTIME.md"),
    path.join(HARNESS, "SAFETY.md"),
  ];
  const missing = required.filter((file) => !fs.existsSync(file)).map((file) => path.relative(ROOT, file));
  const status = loadStatus();
  const learning = loadLearning();
  let settingsValid = true;
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8"));
  } catch {
    settingsValid = false;
  }
  return {
    ok: missing.length === 0 && settingsValid,
    action: "doctor",
    repository: ROOT,
    node: process.version,
    missing,
    settings_valid: settingsValid,
    status_valid: Boolean(status),
    learning_valid: Boolean(learning),
  };
}

function creationFiles(directory = CREATIONS_DIR, relativeBase = CREATIONS_DIR, found = []) {
  if (!fs.existsSync(directory) || found.length >= 40) return found;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (found.length >= 40) break;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) creationFiles(absolute, relativeBase, found);
    if (entry.isFile() && entry.name !== ".gitkeep") found.push(path.relative(relativeBase, absolute));
  }
  return found;
}

function hookContext() {
  try {
    initialize();
    const status = loadStatus();
    if (status.mode !== "active") return;
    const learning = loadLearning();
    const creations = creationFiles();
    let portrait = "Portrait not completed.";
    if (fs.existsSync(PORTRAIT_FILE)) {
      portrait = fs.readFileSync(PORTRAIT_FILE, "utf8").slice(0, 1800);
    }
    const context = [
      "Claude Kickstart guided mode is ACTIVE for this project.",
      "Use ordinary language as the primary interface; do not require additional slash commands.",
      "Follow claude-kickstart/RUNTIME.md and claude-kickstart/SAFETY.md. Keep work project-local by default and use normal permission prompts.",
      "If the user asks to exit, inspect/correct/delete their portrait, simplify guidance, show more control, or generate possibilities, route that intent exactly as RUNTIME.md specifies.",
      `Durable status: ${JSON.stringify(status)}.`,
      `Guidance state: ${JSON.stringify({ stage: learning.stage, label: learning.label, preference: learning.guidance_preference })}.`,
      `Verified creation files: ${creations.length > 0 ? creations.join(", ") : "none yet"}. Do not claim this list is empty or nonempty without using this evidence or checking the directory.`,
      `Current local portrait excerpt:\n${portrait}`,
    ].join("\n");
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: context,
        },
      }),
    );
  } catch {
    // Hooks must never break Claude Code startup. Doctor surfaces details explicitly.
  }
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return {
    ok: false,
    usage: [
      "init | doctor | status | enter | leave | session-end",
      "checkpoint <stage> [safety-choice] | complete | select <direction> | select-from-pending",
      "request-reset | reset --confirm | portrait-clear --confirm",
      "evidence <type> [note] | guidance <adaptive|simpler|advanced>",
      "level <0..4> --confirm | hook-context",
    ],
  };
}

async function main() {
  const [command = "", ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case "init":
        print(initialize());
        break;
      case "doctor": {
        const result = doctor();
        print(result);
        if (!result.ok) process.exitCode = 1;
        break;
      }
      case "status":
        initialize();
        print({ ok: true, status: loadStatus(), learning: loadLearning() });
        break;
      case "enter":
        print(enter());
        break;
      case "checkpoint":
        print(checkpoint(args[0], { safety_choice: args.slice(1).join(" ") || null }));
        break;
      case "complete":
        print(complete());
        break;
      case "leave":
        print(leave());
        break;
      case "session-end":
        sessionEnd();
        break;
      case "request-reset":
        print(requestReset());
        break;
      case "reset":
        if (!args.includes("--confirm")) throw new Error("Reset requires --confirm after explicit user confirmation");
        print(resetConfirmed());
        break;
      case "portrait-clear":
        if (!args.includes("--confirm")) {
          throw new Error("Portrait deletion requires --confirm after explicit user confirmation");
        }
        print(clearPortrait());
        break;
      case "select":
        print(selectDirection(args.join(" ")));
        break;
      case "select-from-pending":
        print(selectFromPending());
        break;
      case "evidence":
        print(evidence(args[0], args.slice(1).join(" ")));
        break;
      case "guidance":
        print(setGuidance(args[0]));
        break;
      case "level":
        if (!args.includes("--confirm")) throw new Error("Changing level requires --confirm");
        print(setLevel(args[0]));
        break;
      case "hook-context":
        hookContext();
        break;
      default:
        print(usage());
        process.exitCode = 1;
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), {
      changed: false,
      next_action: "Run `node claude-kickstart/bin/kickstart-state.mjs doctor` from the repository root.",
    });
  }
}

await main();
