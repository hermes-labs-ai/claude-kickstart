import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "examples", name), "utf8"));
}

function validateFixture(fixture) {
  assert.equal(fixture.possibilities.length, 4);
  assert.equal(fixture.possibilities.at(-1).label, "Surprise me");
  const modes = new Set();
  const combined = fixture.possibilities.map((item) => {
    for (const field of ["label", "why_fit", "what_they_do", "first_10_30_minutes", "mode"]) {
      assert.equal(typeof item[field], "string");
      assert.ok(item[field].trim().length > 0, `${fixture.fixture}: empty ${field}`);
    }
    modes.add(item.mode);
    return Object.values(item).join(" ").toLowerCase();
  }).join(" ");
  assert.ok(modes.size >= 4, `${fixture.fixture}: modes are insufficiently varied`);
  for (const anchor of fixture.required_anchors) {
    assert.match(combined, new RegExp(anchor, "i"), `${fixture.fixture}: missing ${anchor}`);
  }
  for (const forbidden of fixture.forbidden_anchors) {
    assert.doesNotMatch(combined, new RegExp(forbidden, "i"), `${fixture.fixture}: leaked ${forbidden}`);
  }
}

test("reference outputs are specific, diverse, and materially different", () => {
  const mental = load("mental-health-professional.json");
  const parent = load("parent-household.json");
  validateFixture(mental);
  validateFixture(parent);
  const mentalLabels = new Set(mental.possibilities.map((item) => item.label));
  const overlap = parent.possibilities.filter((item) => mentalLabels.has(item.label));
  assert.deepEqual(overlap.map((item) => item.label), ["Surprise me"]);
});

test("runtime contract contains the required adaptive and safety routes", () => {
  const runtime = fs.readFileSync(path.join(ROOT, "claude-kickstart/RUNTIME.md"), "utf8");
  const onboarding = fs.readFileSync(path.join(ROOT, "claude-kickstart/ONBOARDING.md"), "utf8");
  const safety = fs.readFileSync(path.join(ROOT, "claude-kickstart/SAFETY.md"), "utf8");
  for (const phrase of [
    "ordinary language",
    "AskUserQuestion",
    "explicit facts",
    "provisional inferences",
    "delete my portrait",
    "guidance simpler",
    "guidance advanced",
    "Turn this off",
  ]) assert.match(runtime, new RegExp(phrase, "i"));
  for (const phrase of [
    "two or three follow-ups",
    "awaiting_portrait_confirmation",
    "awaiting_orientation",
    "Surprise me",
    "10–30 minutes",
  ]) assert.match(onboarding, new RegExp(phrase, "i"));
  for (const phrase of [
    "Do not inspect unrelated personal files",
    "Do not read secrets",
    "Do not mutate global Claude Code settings",
    "Do not publish",
    "untrusted data",
    "Never claim success without direct evidence",
  ]) assert.match(safety, new RegExp(phrase, "i"));
});

test("project settings retain manual permissions and secret-file denials", () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude/settings.json"), "utf8"));
  assert.equal(settings.permissions.defaultMode, "default");
  assert.equal(settings.permissions.disableBypassPermissionsMode, "disable");
  assert.ok(settings.permissions.ask.includes("WebFetch"));
  assert.ok(settings.permissions.allow.includes("Edit(claude-kickstart/state/**)"));
  assert.ok(settings.permissions.allow.includes("Bash(node claude-kickstart/bin/kickstart-state.mjs enter)"));
  assert.ok(settings.permissions.deny.includes("Read(~/.ssh/**)"));
  assert.ok(settings.permissions.deny.includes("Edit(**/.env.*)"));
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.hooks.SessionEnd);
});
