# Adaptive Onboarding

Follow the saved stage. Never ask the entire interview at once.

## `awaiting_safety`

Use `AskUserQuestion` with header `Safety`, single-select, and these options in this order:

1. **Safest default** — Keep work inside this folder and ask before actions.
2. **Files here okay** — Create harmless files here, but ask before anything broader.
3. **Ask every time** — Explain and ask before even harmless project-file changes.

The safest choice is recommended. Save the answer with:

```text
node claude-kickstart/bin/kickstart-state.mjs checkpoint awaiting_self_description
```

Then ask the open prompt below in the same response only after the safety selection is known.

## `awaiting_self_description`

Ask openly:

> Tell me about yourself in ordinary language. What do you do? What occupies your time? What are you interested in? What frustrates you? What do you wish you could make, understand, organize, or change? You do not need to structure the answer. Dictation mistakes and unfinished thoughts are fine.

Before asking, checkpoint this stage and write the exact pending prompt to `onboarding-notes.md`. When the answer arrives, preserve its meaning in the notes, then generate two or three follow-ups that depend on what the user actually said.

## `awaiting_followup_1` through `awaiting_followup_3`

Ask one generated follow-up at a time. Two are required; a third is optional only when a material gap remains.

Bad: “Do you prefer writing or coding?”

Good: “You said family recipes get lost because everyone improvises. Would preserving the stories, making weeknights easier, or learning the substitutions your family actually likes matter most?”

Checkpoint the next pending follow-up before asking it. Record the question and later the answer in the notes.

## `awaiting_portrait_confirmation`

Synthesize `state/user-portrait.md` with these sections:

- Explicitly shared
- Interests and recurring themes
- Desired outcomes and frictions
- Learning and communication preferences
- Explicit boundaries
- Provisional interaction hypotheses

Then reflect in the terminal under two unmistakable headings: **What you told me** and **What I am tentatively inferring**. Ask the user to correct, remove, or add anything. Do not proceed until they have had the chance to correct it. Record corrections as progression evidence.

## `awaiting_orientation`

Ask one nonclinical, indirect orientation question. Generate its wording from the portrait when possible. A fallback is:

> Imagine one recurring friction in your week quietly disappeared. What changed?

You may instead use a native single-select with four fitted outcomes such as making something real, understanding something deeply, helping someone, organizing chaos, or discovering something unexpected. The automatic free-text path remains available. Do not call this a personality test.

## `awaiting_possibility`

Read `METHOD.md`. Generate four concrete paths:

- three distinctly personalized directions spanning practical/exploratory, software/non-software, and immediate/ambitious;
- one personalized **Surprise me** that combines two themes the user did not combine themselves.

Before the selector, explain each in 2–3 short lines: why it fits, what the user would do, and what could exist in 10–30 minutes. Then use native multi-select with those four options. The automatic `Other` path is the free response. Explicitly say the user may choose, combine, modify, reject, or answer in their own words.

When the user settles on a direction, write the plain-language choice or combination to `state/pending-selection.md` with the Edit tool, run `select-from-pending`, checkpoint `first_action`, and say:

> Great. We will start small enough that you can see the result, but real enough that it matters.

Then run `complete` and begin the tangible action in the same response. Do not end with a tutorial or command list.
