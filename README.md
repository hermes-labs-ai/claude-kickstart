# Claude Kickstart

Claude Code becomes much more useful once it understands who you are, what you care about, and how you like to work.

Claude Kickstart gives new users a guided first experience. You speak or type naturally, it learns enough about your world to generate useful possibilities, and then it helps you make or explore something real.

**You do not need to know how to code.** You can ramble, use dictation, make typos, change your mind, or reject every suggestion.

## Start here

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) and Node.js 18 or newer.

Open Claude Code in an empty folder and paste this sentence:

> Help me install Claude Kickstart from https://github.com/hermes-labs-ai/claude-kickstart in this current empty folder. I am completely new to Claude Code. Before you download anything, briefly explain what it is, confirm everything will stay inside this project, and tell me that I will close and reopen Claude Code once so the native project command and safety settings can load. Then install it and give me the exact folder plus copy-paste steps to exit, reopen Claude Code there, and type `/kickstart`, including what to do if that command is not recognized.

Claude will explain the download before doing it, install everything in the current folder, and then print the exact path and commands for the one required reopen. Claude Code discovers newly installed project commands and settings when a session starts, so this reopen is part of installation—not an error.

The handoff will look like this, using your actual folder path:

1. Type `/exit` in Claude Code.
2. Run the exact `cd` command the installer gives you.
3. Run `claude`.
4. If Claude Code shows a workspace trust screen, confirm it names the folder the installer printed, review the project permissions, and choose **Yes, I trust this folder**.
5. In the newly opened session, type:

```text
/kickstart
```

That is the only Kickstart command you need to begin.

## What your first session feels like

Claude Kickstart will:

1. ask how carefully it should handle actions in the folder;
2. invite you to describe yourself in your own words;
3. ask two or three follow-up questions based on what you actually said;
4. show what it heard as facts and what it is only tentatively inferring;
5. offer several specific things you could make, explore, understand, or improve;
6. let you choose, combine, change, or reject those ideas; and
7. begin one real thing with you immediately.

The choices appear in Claude Code's built-in selector when it is available. A free-text path is always available, so the menu never limits what you can ask for.

After that, ordinary language is the interface. Try things like:

> Make the second idea more playful.

> None of those. Surprise me in a different direction.

> I feel overwhelmed. Give me one tiny next step.

> Explain what you just changed.

## Stop, resume, or correct it

Leave guided mode without deleting anything:

```text
/leave-kickstart
```

You can also say “turn this off” or “go back to normal Claude.” Starting a fresh Claude Code session gives you the cleanest normal context.

If onboarding is interrupted, run `/kickstart` again. It resumes from the saved stage.

Your portrait is plain Markdown in `claude-kickstart/state/user-portrait.md`. At any time, say:

- “Show me what you think you know about me.”
- “That is wrong—update my portrait.”
- “Delete my portrait.”
- “Use simpler guidance.”
- “Let me take more control.”

Deletion and reset require confirmation. Reset preserves everything in `claude-kickstart/creations/`.

## Safety and privacy

Claude Kickstart stays inside this project by default. It does not change your global Claude settings, inspect unrelated personal files, read common credential files, bypass permissions, or publish anything for you. Consequential actions still require an explanation and your approval.

Your portrait, interview notes, progress state, and creations remain local files in the project. They are ignored by Git so they are not accidentally committed. You can read, edit, or delete them.

This is defense in depth, not an operating-system sandbox. Always read Claude Code's permission prompts before approving them.

## Manual installation

If you already downloaded the repository, open a terminal inside it and run:

macOS or Linux:

```sh
bash install.sh
```

Windows PowerShell:

```powershell
.\install.ps1
```

Installation is project-local and repeatable. It initializes only missing state and never overwrites your portrait, history, or creations.

To stop using it, run `/leave-kickstart`. Because the installation is self-contained, you can then archive or remove the repository whenever you no longer need the local portrait or creations. Nothing global needs uninstalling.

## If something does not work

- **`/kickstart` is not recognized:** type `/exit`; run the exact `cd` command printed by the installer; run `claude`; and try `/kickstart` again. If it still fails, tell Claude: “Verify `.claude/commands/kickstart.md` in this folder and repair only this project-local installation.”
- **Claude says a required file is missing:** make sure you opened the downloaded `claude-kickstart` folder, then run the installer again. It will explain what is missing without guessing or overwriting files.
- **Node.js is missing or too old:** install Node.js 18 or newer, confirm `node --version` works, and rerun the installer.
- **You see a workspace trust screen:** confirm the folder came from `hermes-labs-ai/claude-kickstart`, review the listed project permissions, and proceed only if you trust it.
- **You stopped halfway through:** reopen the same folder and run `/kickstart`; your pending stage should resume.

If the problem remains, open a [GitHub issue](https://github.com/hermes-labs-ai/claude-kickstart/issues) without including private portrait or session content.

## Requirements and honest limits

- Claude Code 2.1 or newer
- Node.js 18 or newer
- Tested on macOS with the current Claude Code CLI
- One close-and-reopen is required after the first installation so Claude Code can discover Kickstart's project command, safety settings, and lifecycle hooks
- Shell installer exercised on macOS; the PowerShell installer is syntax- and logic-checked but has not been run on Windows in this release
- Claude generates the adaptive questions and possibilities at runtime, so exact wording varies
- If Claude Code's native selector is unavailable, Kickstart uses a numbered text fallback
- The thin project-command files use Claude Code's legacy custom-command surface; Anthropic may eventually require a compatibility update

## How it works

Claude Kickstart is a small stateful harness, not a personality quiz or a single sequential prompt. A project command loads its runtime contract; a local state engine records onboarding checkpoints, safe exit, portrait ownership, and evidence-based changes in guidance. Synthetic fixtures verify that different people receive materially different possibilities.

See [DEMO.md](DEMO.md) for a ten-minute friend demo and [DEVELOPMENT.md](DEVELOPMENT.md) for architecture and test commands.

## License

[MIT](LICENSE)
