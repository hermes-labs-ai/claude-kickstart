#!/usr/bin/env bash
set -eu

ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
CHANGED="no"

fail() {
  printf '%s\n' "Claude Kickstart could not be initialized."
  printf '%s\n' "What happened: $1"
  printf '%s\n' "What changed: ${2:-nothing}"
  printf '%s\n' "Safest next action: ${3:-fix the item above, then run 'bash install.sh' again from this folder.}"
  exit 1
}

command -v claude >/dev/null 2>&1 || fail \
  "Claude Code is not available in your command path." \
  "nothing" \
  "install or repair Claude Code, confirm 'claude --version' works, then run this installer again."

command -v node >/dev/null 2>&1 || fail \
  "Node.js is required by this version-zero state engine but was not found." \
  "nothing" \
  "install Node.js 18 or newer, then run this installer again."

NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])')
[ "$NODE_MAJOR" -ge 18 ] || fail \
  "Node.js 18 or newer is required; this computer has $(node --version)." \
  "nothing" \
  "update Node.js, then run this installer again."

for required in \
  ".claude/commands/kickstart.md" \
  ".claude/commands/leave-kickstart.md" \
  ".claude/settings.json" \
  "claude-kickstart/RUNTIME.md" \
  "claude-kickstart/SAFETY.md" \
  "claude-kickstart/bin/kickstart-state.mjs"
do
  [ -f "$ROOT/$required" ] || fail \
    "A required repository file is missing: $required" \
    "$CHANGED" \
    "download a fresh copy of the repository; do not create a guessed replacement file."
done

node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' \
  "$ROOT/.claude/settings.json" >/dev/null 2>&1 || fail \
  ".claude/settings.json is not valid JSON." \
  "$CHANGED" \
  "restore the repository copy of .claude/settings.json, then retry."

chmod u+x "$ROOT/claude-kickstart/bin/kickstart-state.mjs" 2>/dev/null || true

if ! INIT_OUTPUT=$(cd "$ROOT" && node claude-kickstart/bin/kickstart-state.mjs init 2>&1); then
  fail "$INIT_OUTPUT" "$CHANGED"
fi

if printf '%s' "$INIT_OUTPUT" | grep -q '"changed": true'; then
  CHANGED="only missing project-local state files were created"
fi

if ! DOCTOR_OUTPUT=$(cd "$ROOT" && node claude-kickstart/bin/kickstart-state.mjs doctor 2>&1); then
  fail "$DOCTOR_OUTPUT" "$CHANGED"
fi

printf '%s\n' "Claude Kickstart is ready in this folder."
printf '%s\n' "What changed: $CHANGED."
printf '%s\n' "Nothing was written to global Claude Code settings or outside this repository."
printf '%s\n' "In Claude Code, run: /kickstart"
