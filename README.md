# Typewriter Mode

**Live:** https://vishnuvsdevtech.github.io/typewriter-mode/

A writing surface with the one feature that actually changes how writing feels:
an audible, variable response to every keystroke.

Nothing about the editor is novel — it is a `<textarea>`. What changed is the
**feedback loop**, which is the whole lesson:

- **Clack per key**, synthesised in the browser from filtered noise plus a low
  thump. Pitch and level vary per stroke; identical clicks read as a machine gun.
- **Margin bell** when a line passes 62 columns, once per line, the way a
  mechanical bell warns you. 
- **Carriage return** on Enter: a noise sweep down, then a mechanical stop.
- **Caret band**: the text scrolls so the caret sits at 45% of the page height,
  instead of your eye chasing the bottom edge.
- **Two modes** — typewriter (warm paper, mono, sound) and modern (dark, sans,
  silent) — so you can feel the difference a modality makes.

## No assets

Every sound is an oscillator or a noise buffer. The repo is a few KB with no
fonts, no sample packs, no dependencies, no build step. `AudioContext` starts
suspended under browser autoplay policy, so it initialises on the first gesture.

## Honest notes

- The bell fires on a column threshold, not on a true visual line wrap: inside a
  textarea there is no cheap way to ask "did this word break the line".
- Caret height is estimated from newlines and character count, so a line with
  many wide glyphs can drift a few pixels from the true caret.
- Autosave is `localStorage`, per browser. Export writes a `.txt`.

## What transfers

A feature that changes *how* an action feels is cheap to build and
disproportionately remembered. The butterflies and cats elsewhere in this
portfolio are the same trick applied to a page instead of a keyboard.
