# Player layout and mechanics — design

## Context

The project has a working `VinylRecord` component (spins/pauses via CSS
`animation-play-state`, ported from the Claude Chat handoff). This spec
covers the full app layout around it: where the record, now-playing
display, volume control, and transport buttons live, how the chunky
cassette-style buttons look and behave, and the player state machine that
drives them. Real audio playback is explicitly out of scope — this pass
builds the interactive UI against mock track data.

## Layout

Full-viewport, no header/nav/page chrome — the player fills the browser
window edge-to-edge.

- **Left column (~65% width on desktop):** the `VinylRecord`, sized as
  large as the column allows, using its existing responsive `clamp()`
  sizing.
- **Right column (~35% width):**
  - **Display row:** `NowPlayingDisplay` (flex-grow) beside the
    `VolumeKnob` (fixed small size), side by side.
  - **Button pad:** `TransportControls` below the display row, filling
    the remaining vertical space.

**Responsive behavior:** below a phone-width breakpoint, the layout
stacks vertically — record on top, display+volume row below it, button
pad at the bottom.

## Components

```
App
├── VinylRecord            (existing)
└── right column
    ├── display row
    │   ├── NowPlayingDisplay
    │   │   ├── MarqueeText (track + album line)
    │   │   └── MarqueeText (artist line)
    │   └── VolumeKnob
    └── TransportControls
        └── TransportKey × 5 (skip-back, play, pause, skip-forward, stop)
```

### `MarqueeText`

Generic single-line scrolling text component. Props: `text: string`.

- Measures whether `text` overflows its container width.
- If it fits: renders centered, static, no animation.
- If it overflows: renders the text twice back-to-back (`text` + gap +
  `text`) inside a track that scrolls left. Because the second copy
  starts exactly where the first one started, the loop point is visually
  identical to the resting frame — no jump/reset flash.
- Animation rhythm: hold at the start position briefly, scroll smoothly
  to the loop point, repeat indefinitely. Implemented as a single CSS
  `@keyframes` with hold/scroll segments (e.g. 0–15% hold at
  `translateX(0)`, 15–95% linear scroll to `translateX(-50%)`, 95–100%
  hold at the now-identical-to-start position), `animation-iteration-count: infinite`.
- Re-measures and restarts the animation whenever `text` changes (e.g. on
  track skip).

### `NowPlayingDisplay`

Props: `track: { title: string, album: string, artist: string }`.

- Line 1: `MarqueeText` with `"${title} — ${album}"`.
- Line 2: `MarqueeText` with `track.artist`.
- Each line scrolls independently based on its own overflow.

### `VolumeKnob`

Rotary dial. For this pass: purely visual/interactive (drag or scroll to
rotate, tracks a `volume: number` 0–100 in local state) — not wired to
any real audio output yet, since there's no audio element in this phase.

### `TransportKey`

The chunky button primitive. Visual language locked in during
brainstorming (subject to continued visual polish during implementation,
but this is the agreed direction):

- Vertical rectangle (taller than wide), not square.
- "Chunky, embedded" look via a stacked hard-edged `box-shadow` (several
  solid, unblurred offset layers in darkening shades) rather than a
  single soft/blurred shadow — this reads as a visible solid side of the
  block instead of a floating card.
- Press interaction: a diagonal `translate(x, y)` on `:active` (down and
  slightly sideways) that shrinks the visible stacked-shadow "side" down
  to a sliver, simulating the key sinking into its housing at an angle —
  not a straight vertical press, not a `rotateX` tilt (tried, looked
  unconvincing/flat).
- Icon rendered with a debossed/engraved look: icon color close to the
  button face color, with a light `text-shadow` offset down-right and a
  dark one offset up-left, so it reads as carved into the surface rather
  than printed on top.
- Props: `icon`, `onClick`, `latched: boolean` (visually forces the
  pressed/sunk-in state — see mechanics below), `label` (for
  `aria-label`).

### `TransportControls`

Renders the 5 `TransportKey`s in order: **skip-back, play, pause,
skip-forward, stop**. Owns the latching/state-transition logic described
below and calls into the player state.

## Mechanics — player state machine

State: `status: 'stopped' | 'playing' | 'paused'`, `currentTrackIndex`
into a hardcoded mock track list.

| Button | Behavior |
|---|---|
| **Play** | `status = 'playing'`. Record spins (`playing` prop → `animation-play-state: running`). Play key latches down (`latched = true`); Pause key pops up. |
| **Pause** | `status = 'paused'`. Record freezes in place (`animation-play-state: paused`, holds current rotation). Pause key latches down; Play key pops up. |
| **Stop** | Momentary press (visually presses and immediately releases — never stays latched). `status = 'stopped'`. Record freezes in place — visually identical to paused, no rotation reset. Both Play and Pause pop up (unlatch). |
| **Skip back / forward** | Momentary press (no latching). Changes `currentTrackIndex` by ∓1, wrapping at the ends of the mock track list. Always sets `status = 'paused'` regardless of prior state. Display updates to the new track and both `MarqueeText` lines reset/restart their animation. |

Only Play and Pause are latching (mutually exclusive — pressing one
un-latches the other). Stop and the two skip buttons are momentary.

Initial state on load: a mock track loaded, `status = 'stopped'`, no
buttons latched, record at rest (not spinning).

## Data

A small hardcoded array of mock tracks (e.g. 3–5 entries with `title`,
`album`, `artist`) lives alongside the player state for this pass, purely
to exercise the display and skip logic. No audio files, no `<audio>`
element yet.

## Explicitly out of scope for this pass

- Real audio playback / `<audio>` element wiring.
- Progress/seek bar.
- The "swap record" track-change transition (noted in the original
  handoff doc as a future idea, still not implemented).
- Any queue/playlist UI.
- Volume knob actually controlling sound output.

## Testing

Manual verification in-browser (per project convention so far): exercise
each button transition, confirm latching/unlatching pairs correctly,
confirm the record spins/freezes appropriately, confirm marquee only
animates when text overflows and loops seamlessly, confirm skip wraps
correctly at list boundaries and resets marquee animations.
