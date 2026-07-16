# Ten-minute friend demo

## Before they arrive

1. Make sure Claude Code and Node.js 18 or newer are installed.
2. Create an empty folder and open Claude Code there.
3. Keep the public repository URL ready, but do not preinstall Kickstart. The installation handoff is part of the demo.

## Live script

Say: “I am going to show you a terminal that does not expect you to speak terminal.”

Have your friend paste:

> Help me install Claude Kickstart from https://github.com/hermes-labs-ai/claude-kickstart in this current empty folder. I am completely new to Claude Code. Before you download anything, briefly explain what it is, confirm everything will stay inside this project, and tell me that I will close and reopen Claude Code once so the native project command and safety settings can load. Then install it and give me the exact folder plus copy-paste steps to exit, reopen Claude Code there, and type `/kickstart`, including what to do if that command is not recognized.

Claude should explain the download first, install locally, and print the exact folder and commands. Have your friend follow them literally: `/exit`, the printed `cd` command, `claude`, approve the workspace trust screen after verifying the folder and permissions, then `/kickstart`. This one reopen is required by Claude Code's native project-command and settings lifecycle.

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
