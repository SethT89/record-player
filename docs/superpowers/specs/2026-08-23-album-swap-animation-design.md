# Album swap animation — design

## Context

Picking a new album (via Deezer search or a local folder) currently just
snaps the `VinylRecord`'s album art straight to the new image — no
transition. The original handoff doc flagged a "swap record" animation as
a future idea (explicitly out of scope in the layout/mechanics pass); this
spec covers implementing it.

Goal: when a new album loads, the old record visually slides off screen
while the new one slides in to take its place — like one record physically
pushing the other out. Direction differs by viewport: swaps in from the
**top** on desktop, from the **right** on mobile.

## Trigger

Add an `albumVersion` counter to `playerReducer` state, incremented only
on `LOAD_ALBUM`. Exposed from `usePlayerState` alongside the existing
`track`. This is the only signal the animation reacts to — skip, play,
pause, and stop never touch it, so the swap fires exclusively on an actual
new album, never on an ordinary track change within the same album.

## Components

```
App
└── player__record-column
    └── VinylRecordStage        (new)
        └── VinylRecord × 1–2   (existing, unchanged)
```

`VinylRecord.jsx` gets no new props and no animation logic — it stays the
plain presentational component it is today.

### `VinylRecordStage` (new)

Props: same as `VinylRecord` today (`playing`, `albumArt`, `onClick`) plus
`albumVersion: number`.

- Keeps a ref tracking the most recently rendered `albumArt`, updated
  every render.
- When `albumVersion` changes from its previous value:
  - If `prefers-reduced-motion: reduce` is set, do nothing special — just
    render the new `VinylRecord` immediately (today's behavior).
  - Otherwise, snapshot the ref's previous `albumArt` into local state as
    `outgoingCoverArt`, entering a transitioning state.
- While transitioning, renders **two** `VinylRecord`s stacked inside a
  clipping container: the outgoing one (using `outgoingCoverArt`, not
  interactive) and the incoming one (today's real props).
- Clears the transitioning state — dropping the outgoing record — on the
  incoming record's `animationend` event.
- If `albumVersion` changes again while already transitioning, it just
  restarts: snapshot whatever's currently on screen as the new
  `outgoingCoverArt` and re-enter the transitioning state. No blending of
  two in-flight animations.

## Animation mechanics

New `VinylRecordStage.css`.

- The record's sizing (currently the `clamp(280px, min(80vw, 80vh),
  1000px)` in `VinylRecord.css`) moves to a shared CSS custom property
  (e.g. `--vinyl-record-size`) so the stage container and the record
  itself can't drift out of sync. `VinylRecord.css` references the
  variable instead of repeating the `clamp()`.
- Stage container: `width/height: var(--vinyl-record-size)`, `position:
  relative`, `overflow: hidden`. Both records inside are `position:
  absolute; inset: 0;` while inside the stage.
- Two `@keyframes` pairs, gated by the existing 640px breakpoint used
  elsewhere in `App.css`:
  - **Desktop (≥641px):** incoming `vinyl-slide-in-top`, `translateY(-100%)
    → translateY(0)`. Outgoing `vinyl-slide-out-bottom`, `translateY(0) →
    translateY(100%)` — same direction of travel, reads as a push.
  - **Mobile (≤640px):** incoming `vinyl-slide-in-right`, `translateX(100%)
    → translateX(0)`. Outgoing `vinyl-slide-out-left`, `translateX(0) →
    translateX(-100%)`.
- Duration: `700ms`, timing function `ease-in-out`, `animation-fill-mode:
  forwards`.
- Cleanup is driven by the incoming element's `animationend` listener, not
  a timer, so it can't drift if the duration is ever tuned later.

## Edge cases

- **Reduced motion:** checked via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  before entering the transitioning state. If set, skip straight to
  showing the new record — no dual-render, no animation classes applied.
- **Rapid re-selection mid-swap:** handled by the "restart" behavior
  above — acceptable given how infrequently album selection happens in
  this app. No special-cased blending.
- **Resize across the 640px breakpoint mid-swap:** directions are pure CSS
  media queries, so an in-flight animation just follows whichever rule is
  active at that instant. Rare, low-stakes, not specially handled.

## Explicitly out of scope

- Any transition on plain track change (skip/next) — only whole-album
  loads animate.
- Touch/drag-driven manual swiping between albums.
- Configurable/user-facing animation speed or direction settings.

## Testing

Manual verification in-browser: trigger an album load at desktop width
and confirm the top-down swap direction, timing, and that the outgoing
record is fully removed from the DOM afterward (no leftover duplicate).
Repeat at mobile width (`resize_window` to the mobile preset) and confirm
the right-to-left swap direction. Verify a second album load while the
first swap is still in flight restarts cleanly. Verify with
`prefers-reduced-motion: reduce` emulated that the swap is skipped
entirely.
