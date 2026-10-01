# wavess - portfolio

A portfolio that is a terminal. One window in the middle of the page - with a
title bar you can drag it by, minimise and fullscreen - and two ways to look
around inside it: click through a sidebar, or type commands at a prompt.
Nothing executes; the shell is simulated, and both modes read the same
content.

Next.js (App Router), TypeScript, Tailwind v4. No backend, no database, no
runtime dependencies beyond React. Deploys to Vercel as-is.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Where everything lives

```
lib/content.ts      every word on the site
lib/filesystem.ts   the fake ~ directory, built from content.ts
lib/shell.ts        the command engine for manual mode
components/         the two modes, the shared output renderer, the runner
app/globals.css     colour tokens, and the running figure's gait
```

**`lib/content.ts` is the only place to edit text.** Guided mode and manual
mode both render from it through `components/TerminalOutput.tsx`, so they
cannot drift apart. The fake filesystem is derived from the same file, which
means adding a section adds its file to `ls` automatically.

## Adding a writeup

The three entries in `writeups` are placeholders. To make one real: keep the
fields, fill in `problem` and `body`, and delete `placeholder: true`.

```ts
{
  slug: "hology-retain",          // also the filename: writeups/hology-retain.txt
  competition: "HOLOGY",
  challenge: "Retain",
  category: "Digital Forensics",  // or "Reverse Engineering"
  problem: "The challenge text as competitors saw it.",
  body: [
    { t: "p", text: "How it went." },
    { t: "note", text: "a plain-language gloss for anything jargony" },
  ],
}
```

Both modes pick it up with no other changes: guided mode lists it, and
`cat writeups/<slug>.txt` prints it.

## Adding a section that is a list

Writeups and the CTF challenges are the same shape: a directory you pick
from, then one item printed in full. A section becomes one by setting
`kind: "dir"` and adding a case to `listingFor` and `detailBlocks` in
`content.ts`. Nothing else needs touching - the fake filesystem, the
chooser in manual mode, and guided mode's detail panel all read those two
functions rather than knowing section names, which is what stops a third
list from being a third copy of the same code.

Projects is a directory with no listing, so it prints flat. That is the
behaviour `listingFor` returning nothing gets you.

## The other swappable bits

- **CV** - the `cv` blocks in `content.ts` are a placeholder. Replace them
  with the real thing as plain text; it stays in-page rather than becoming a
  PDF download.
- **Avatar** - `components/Avatar.tsx` draws initials in a circle. Swap the
  `<span>` for an `<img>` with the same classes.
- **Org logos** - `public/logos/`, referenced by the `org` blocks in
  `content.ts`. They're downscaled to 128px; the originals were 10417px and
  4MB, which is not a thing to put in a bundle for a 26px mark.
- **Projects** - ByteSec and HealthyEats have a repo link but no description
  yet, so they print a short "coming soon" note. Add a `body` to remove it.

## Notes

- `components/Boot.tsx` is the screen the site starts on. The log prints for
  three seconds, then the notice about the two modes appears with a button;
  the visitor leaves when they choose to, so the three seconds pace the log
  rather than gate the notice. Every row is laid out from the first frame and
  the pending ones are only made invisible, so the panel holds its height
  instead of growing a line at a time under the reader. The checks are real -
  the section count is read from `sections`, so it can't go stale. Under
  `prefers-reduced-motion` it is all there at once rather than skipped,
  because skipping it would skip the notice.
- The site is a small desktop. `components/Workspace.tsx` owns the list of
  terminals; `TerminalWindow.tsx` is one window's chrome; `TerminalSession.tsx`
  is what's inside one. Each window has its own session, so two terminals can
  be on different sections with different transcripts.
- `lib/workspace.ts` holds the geometry - spawn position, drag clamping,
  resize, and the tiled layout - as pure functions, so the tiling can be
  reasoned about without a browser.
- Window geometry is absolute (`fixed` with left/top/width/height). That makes
  floating, dragging, resizing and tiling all the same operation: change the
  rectangle. CSS eases those four properties so tiling glides; the window
  turns the easing off while a pointer is driving it, or it lags the cursor.
- Minimising and closing play the same exit animation; only the ending
  differs, and `Workspace` decides which. Minimising hides the window rather
  than unmounting it, so its transcript and whichever section it was on both
  survive.
- Tiling is per window, not per workspace. Dragging a tiled window's title
  bar pulls that one loose and leaves the rest tiled, which is what makes it
  behave like snapped windows; it comes back at the size it had before, held
  at the same point along the bar you grabbed.
- Each terminal carries a tone from `TONES`, used for its focused border,
  its title and its taskbar swatch, so one window is tellable from the next. Dragging and resizing are off
  below 768px, where tiling stacks into rows instead of columns.
- The window is two nested elements on purpose: the outer one owns the drag
  offset, the inner one owns the open/close/resize animation. Both want to
  write `transform`, and an animation beats an inline style, so a dragged
  window would snap back to centre mid-animation if they shared an element.
- Those three animations use `element.animate()` rather than CSS keyframes -
  closing has to finish before the window is hidden, which needs a callback.
  They're skipped entirely under `prefers-reduced-motion`, and nothing
  animates on first load.
- Achievements are hand-ordered and never sorted in code. The order in
  `content.ts` is the order that ships.
- Colours are CSS custom properties in `app/globals.css`, exposed to Tailwind
  through `@theme inline`. Change them in one place and both themes follow.
- Base styles sit in `@layer base` deliberately - unlayered CSS outranks every
  Tailwind utility, which would quietly break things like `outline-none`.
- The background is one low-resolution canvas filling the viewport, upscaled
  by a whole-number factor with `image-rendering: pixelated` so every scene
  pixel lands on the same number of screen pixels.
- The scene is Central Park: a skyline furthest back, then two depths of
  trees, the path, things beside it, the figure, and a strip of ground in
  front. Building windows are their own layer so the lights can be brighter
  than the walls, and are precomputed rather than rolled every frame.
- Light mode is daytime and dark mode is night, so the theme decides whether
  the sun or the moon is up - `--sky-night` is read with the colours. Both
  drift on a slow lissajous so they aren't stickers; the sun's corona
  breathes with it.
- Stars are simply out at night. A third of them flicker; a whole sky of
  flickering stars is a fairground.
- Daytime gets clouds in their place, built from four shapes - a heap, a
  stack, a lone tuft and streaks with no body - because one puff repeated
  reads as wallpaper. Each is filled row by row rather than lobe by lobe,
  so a handful of circles comes out as one silhouette with a flat bottom
  instead of a clump of balls, and each drifts at its own share of the
  wind, which is why they go to `forBand` one at a time.
- The Little Prince sits on the moon with his rose. Eleven pixels across, so
  the hair, the scarf and the rose each get their own colour to do the
  identifying at that size.
- Buildings are capped well short of the canvas top. Taller and they fill the
  frame, which reads as a canyon and leaves the moon nowhere to hang that a
  tower won't swallow.
- The figure's x-position is locked and the scenery scrolls past him. A fixed
  forest behind a figure running on the spot reads as a treadmill; moving the
  world instead reads as covering ground. Layer speed is depth.
- Solid things in the scene are drawn OPAQUE, back to front, onto one
  surface. Distance is carried by colour - each depth pre-washed toward the
  sky, atmospheric-perspective style - not by alpha. Per-layer alpha was the
  old approach and it meant nothing ever occluded anything: you could see the
  skyline straight through a tree and the whole scene read as glass. Only
  actual light (coronas, lamp bloom) is still translucent.
- Neighbouring trees and towers pick from a small ramp of shades, or same
  coloured neighbours merge into one silhouette once they're opaque.
- Theme tokens come back from `getPropertyValue` **as authored**, so they
  arrive as hex while `cs.color` arrives as `rgb()`. The colour parser has to
  handle both - miss that and every scene colour silently falls back to grey.
- The figure's near and far limbs use the same trick, plus an alpha threshold
  to hard on/off, so joints never double up.
  `prefers-reduced-motion` draws one held mid-stride pose.
- The terminal's background is `--glass`, a translucent `--surface`, which is
  what lets the figure read through the window. Adjust that alpha and the
  canvas's `opacity` together - they multiply.
- The page texture is two fixed pseudo-elements on `body`: `::before` is a
  fine display mesh built from `--scan`, `::after` is inline SVG grain. Both
  sit below the terminal, so nothing crosses the reading surface.
- The scenery is hazed across the middle of the screen, where the terminal
  sits - a `destination-in` gradient punched through each finished layer.
  The figure is exempt, so he still shows through the glass while the trees
  keep out from behind the text. That, rather than a blanket opacity change,
  is what stops the window feeling stacked on the forest.
- `.page-meta` is a solid top bar on purpose. Translucent, its type lost
  contrast against whatever scenery drifted behind it.
- The title-bar clock shows minutes, not seconds, so the running figure stays
  the only moving thing on the page.
