import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function copyRepo() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "kickstart install "));
  const repo = path.join(base, "project with spaces");
  fs.cpSync(SOURCE, repo, { recursive: true });
  return repo;
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function install(repo, home) {
  return spawnSync("bash", [path.join(repo, "install.sh")], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });
}

test("shell installer works by absolute path, is repeatable, and writes no temporary HOME", () => {
  const repo = copyRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "kickstart-home-"));
  const state = path.join(repo, "claude-kickstart/state/status.json");
  fs.rmSync(state, { force: true });
  const first = install(repo, home);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /installation succeeded/);
  assert.match(first.stdout, new RegExp(`Open this exact folder: ${repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(first.stdout, /must be closed and reopened once/);
  assert.match(first.stdout, /type: \/exit/);
  assert.match(first.stdout, /Run: claude/);
  assert.match(first.stdout, /workspace trust screen/);
  assert.match(first.stdout, /Yes, I trust this folder/);
  assert.match(first.stdout, /type: \/kickstart/);
  assert.match(first.stdout, /If \/kickstart is not recognized/);
  assert.equal(JSON.parse(fs.readFileSync(state, "utf8")).mode, "inactive");
  const before = digest(state);
  const second = install(repo, home);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.equal(digest(state), before);
  assert.deepEqual(fs.readdirSync(home), []);
});

test("installer never overwrites a locally modified runtime", () => {
  const repo = copyRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "kickstart-home-"));
  const runtime = path.join(repo, "claude-kickstart/RUNTIME.md");
  fs.appendFileSync(runtime, "\nLOCAL SENTINEL\n");
  const before = digest(runtime);
  const result = install(repo, home);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(digest(runtime), before);
  assert.match(fs.readFileSync(runtime, "utf8"), /LOCAL SENTINEL/);
});

test("missing required file produces beginner-readable failure with no guessed replacement", () => {
  const repo = copyRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "kickstart-home-"));
  const missing = path.join(repo, ".claude/commands/kickstart.md");
  fs.rmSync(missing);
  const result = install(repo, home);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /What happened:/);
  assert.match(result.stdout, /What changed:/);
  assert.match(result.stdout, /Safest next action:/);
  assert.equal(fs.existsSync(missing), false);
});

test("beginner quick start explains and completes the one required reopen", () => {
  const readme = fs.readFileSync(path.join(SOURCE, "README.md"), "utf8");
  const demo = fs.readFileSync(path.join(SOURCE, "DEMO.md"), "utf8");
  for (const text of [readme, demo]) {
    assert.match(text, /I am completely new to Claude Code/);
    assert.match(text, /Before you download anything/);
    assert.match(text, /everything will stay inside this project/);
    assert.match(text, /close and reopen Claude Code once/);
    assert.match(text, /exact folder plus copy-paste steps/);
    assert.match(text, /if that command is not recognized/);
  }
  assert.match(readme, /type `\/exit`/);
  assert.match(readme, /Run the exact `cd` command/);
  assert.match(readme, /Run `claude`/);
});

test("installer scripts pass local static checks", () => {
  const bashCheck = spawnSync("bash", ["-n", path.join(SOURCE, "install.sh")], { encoding: "utf8" });
  assert.equal(bashCheck.status, 0, bashCheck.stderr);
  const ps = fs.readFileSync(path.join(SOURCE, "install.ps1"), "utf8");
  for (const expected of [
    "Set-StrictMode -Version Latest",
    "$ErrorActionPreference = 'Stop'",
    "$PSScriptRoot",
    "Join-Path",
    "Test-Path -LiteralPath",
    "ConvertFrom-Json",
    "installation succeeded",
    "Open this exact folder:",
    "must be closed and reopened once",
    "type: /exit",
    "Run: claude",
    "workspace trust screen",
    "Yes, I trust this folder",
    "type: /kickstart",
    "If /kickstart is not recognized",
  ]) assert.match(ps, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
