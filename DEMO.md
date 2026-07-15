# Ten-minute friend demo

## Before they arrive

1. Open a terminal in this repository.
2. Run `bash install.sh`.
3. Run `node claude-kickstart/bin/kickstart-state.mjs doctor` and confirm `"ok": true`.
4. If this copy contains rehearsal data, ask Claude to reset it and confirm; verify `claude-kickstart/creations/` was preserved.
5. Start a fresh Claude Code session in this folder.

## Live script

Say: “I am going to show you a terminal that does not expect you to speak terminal.”

Have your friend type:

```text
/kickstart
```

Let them choose the safest option. Then encourage dictation or typing:

> Do not organize this for the computer. Tell it what your days are like, what you care about, what keeps recurring, and what you wish were easier or possible.

Do not steer the content. The proof is that the follow-ups and possibilities reflect their language.

When the portrait appears, ask them to correct one thing—even if minor. Then have them choose, combine, or alter a possibility. The demo succeeds when something real starts to exist in `claude-kickstart/creations/`, not when onboarding ends.

Useful natural-language demonstrations:

- “Make the second one less practical and more playful.”
- “None of those. Use what I said, but surprise me differently.”
- “I am overwhelmed. Give me one tiny next step.”
- “Show me what you think you know about me.”
- “Let me do more of this myself.”

Exit with:

```text
/leave-kickstart
```

Show that the portrait and creation remain. Start a new session if you want to demonstrate a completely clean normal-Claude context.

## Recovery beat

For a deliberate resume demonstration, leave after the self-description, start Claude again, and run `/kickstart`. It should identify the saved pending stage and continue from the next generated follow-up rather than asking the opening questions again.
