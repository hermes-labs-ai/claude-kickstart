---
description: Leave the guided beginner experience without deleting work
disable-model-invocation: true
---

Run `node claude-kickstart/bin/kickstart-state.mjs leave` from the project root, then plainly tell the user:

- guided mode is inactive;
- their portrait, possibility history, and creations were preserved;
- normal Claude Code behavior resumes for later prompts;
- starting a fresh Claude Code session is the strongest way to remove residual guided instructions from this already-open conversation.

Do not delete, reset, or modify their creations. Do not keep applying the Claude Kickstart interaction style after acknowledging the exit.
