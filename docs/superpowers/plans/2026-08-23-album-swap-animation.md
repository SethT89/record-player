# Album Swap Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a new album loads, animate the old vinyl record sliding off screen while the new one slides in to take its place — top-down on desktop, right-to-left on mobile.

**Architecture:** A new `VinylRecordStage` wrapper component watches a reducer-owned `albumVersion` counter (bumped only on `LOAD_ALBUM`). When it changes, the stage briefly renders two `VinylRecord`s absolutely stacked in a clipped container and lets CSS keyframe animations, gated by the existing 640px breakpoint, slide them past each other; cleanup happens on the incoming record's `animationend`.

**Tech Stack:** React 19, plain CSS (`@keyframes`, CSS custom properties), Vitest for the reducer unit tests. No new dependencies.

---

### Task 1: Add `albumVersion` to the player reducer

**Files:**
- Modify: `src/player/playerReducer.js`
- Test: `src/player/playerReducer.test.js`

- [ ] **Step 1: Write the failing tests**

Add these two `it` blocks inside the existing `describe("playerReducer", ...)` block in `src/player/playerReducer.test.js` (after the last `LOAD_ALBUM` test), and add a new assertion to the existing `describe("createInitialPlayerState", ...)` block:

In `describe("createInitialPlayerState", ...)`, add to the existing test:

```js
describe("createInitialPlayerState", () => {
  it("starts stopped at the first track", () => {
    const state = createInitialPlayerState(tracks);
    expect(state.status).toBe("stopped");
    expect(state.currentTrackIndex).toBe(0);
    expect(state.albumVersion).toBe(0);
  });
});
```

In `describe("playerReducer", ...)`, add after the `LOAD_ALBUM` test:

```js
  it("LOAD_ALBUM increments albumVersion", () => {
    const state = createInitialPlayerState(tracks);
    const newTracks = [{ title: "New Track", album: "New Album", artist: "New Artist" }];
    const next = playerReducer(state, { type: "LOAD_ALBUM", tracks: newTracks });
    expect(next.albumVersion).toBe(1);
  });

  it("LOAD_ALBUM increments albumVersion again on a second load", () => {
    const state = { ...createInitialPlayerState(tracks), albumVersion: 1 };
    const newTracks = [{ title: "Another Track", album: "Another Album", artist: "Another Artist" }];
    const next = playerReducer(state, { type: "LOAD_ALBUM", tracks: newTracks });
    expect(next.albumVersion).toBe(2);
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL — `state.albumVersion` is `undefined`, so `toBe(0)` and `toBe(1)`/`toBe(2)` assertions fail.

- [ ] **Step 3: Implement the reducer change**

In `src/player/playerReducer.js`, update `createInitialPlayerState`:

```js
export function createInitialPlayerState(tracks) {
  return {
    status: "stopped",
    currentTrackIndex: 0,
    tracks,
    albumVersion: 0,
  };
}
```

And update the `LOAD_ALBUM` case inside `playerReducer`:

```js
    case "LOAD_ALBUM":
      return {
        ...state,
        status: "stopped",
        currentTrackIndex: 0,
        tracks: action.tracks,
        albumVersion: state.albumVersion + 1,
      };
```

- [ ] **Step 4: Run tests to verify everything passes**

Run: `npm test`
Expected: PASS — all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/player/playerReducer.js src/player/playerReducer.test.js
git commit -m "$(cat <<'EOF'
Track albumVersion in player reducer

Increments only on LOAD_ALBUM, giving the UI a signal to distinguish an
actual new album from an ordinary track change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Expose `albumVersion` from `usePlayerState`

**Files:**
- Modify: `src/hooks/usePlayerState.js`

- [ ] **Step 1: Add `albumVersion` to the returned object**

In `src/hooks/usePlayerState.js`, add `albumVersion: state.albumVersion,` to the object returned by the hook:

```js
export function usePlayerState(tracks) {
  const [state, dispatch] = useReducer(
    playerReducer,
    tracks,
    createInitialPlayerState
  );

  return {
    status: state.status,
    track: state.tracks[state.currentTrackIndex],
    albumVersion: state.albumVersion,
    play: () => dispatch({ type: "PLAY" }),
    pause: () => dispatch({ type: "PAUSE" }),
    stop: () => dispatch({ type: "STOP" }),
    skipNext: () => dispatch({ type: "SKIP_NEXT" }),
    skipPrev: () => dispatch({ type: "SKIP_PREV" }),
    trackEnded: () => dispatch({ type: "TRACK_ENDED" }),
    loadAlbum: (tracks) => dispatch({ type: "LOAD_ALBUM", tracks }),
  };
}
```

- [ ] **Step 2: Run the test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — this hook has no dedicated test file (matches the rest of the codebase, which only unit-tests the pure reducer), so this just confirms the reducer suite is still green.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlayerState.js
git commit -m "$(cat <<'EOF'
Expose albumVersion from usePlayerState

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extract the vinyl record's size into a shared CSS variable

**Files:**
- Modify: `src/components/VinylRecord.css`

- [ ] **Step 1: Replace the hardcoded `clamp()` with a shared custom property**

In `src/components/VinylRecord.css`, change the top of the file from:

```css
.vinyl-record {
  width: clamp(280px, min(80vw, 80vh), 1000px);
  height: clamp(280px, min(80vw, 80vh), 1000px);
  border-radius: 50%;
```

to:

```css
:root {
  --vinyl-record-size: clamp(280px, min(80vw, 80vh), 1000px);
}

.vinyl-record {
  width: var(--vinyl-record-size);
  height: var(--vinyl-record-size);
  border-radius: 50%;
```

The rest of the file is unchanged. This variable will be read by `VinylRecordStage.css` in Task 5 so the stage container can never drift out of sync with the record's own size.

- [ ] **Step 2: Run the test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS (this is a CSS-only change; the reducer suite is unaffected). Visual confirmation happens in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/VinylRecord.css
git commit -m "$(cat <<'EOF'
Extract vinyl record size into a shared CSS variable

Lets VinylRecordStage size its swap-animation container to exactly match
the record without duplicating the clamp() value.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Let `VinylRecord` accept a `className` and pass through extra props

**Files:**
- Modify: `src/components/VinylRecord.jsx`

- [ ] **Step 1: Add `className` and prop spreading**

Replace the full contents of `src/components/VinylRecord.jsx` with:

```jsx
import "./VinylRecord.css";

/*
  VinylRecord
  -----------
  Props:
    - playing: boolean — controls whether the disc spins
    - albumArt: string (optional) — image URL for the center label.
        Falls back to a plain gradient placeholder if not provided.
    - onClick: function (optional) — invoked when the record is clicked.
        Used to open the source-selection menu, same action as clicking
        the now-playing display.
    - className: string (optional) — extra class(es) appended after the
        base "vinyl-record" class. Used by VinylRecordStage to position
        this record inside its swap animation.
    - ...rest — any other native <button> props (e.g. aria-hidden,
        tabIndex, onAnimationEnd) are spread onto the root button. Used by
        VinylRecordStage to hide the outgoing copy from assistive tech and
        to detect when the incoming copy's slide-in animation finishes.
*/
export function VinylRecord({ playing, albumArt, onClick, className, ...rest }) {
  const rootClassName = className ? `vinyl-record ${className}` : "vinyl-record";
  return (
    <button
      type="button"
      className={rootClassName}
      onClick={onClick}
      aria-label="Choose a music source"
      {...rest}
    >
      <div className="vinyl-record__sheen" />
      <div className="vinyl-record__tint" />
      <div
        className={`vinyl-record__disc${playing ? " vinyl-record__disc--playing" : ""}`}
      >
        <div className="vinyl-record__label">
          {albumArt ? (
            <img src={albumArt} alt="" className="vinyl-record__album-img" />
          ) : (
            <span className="vinyl-record__label-text">ALBUM ART</span>
          )}
        </div>
        <div className="vinyl-record__spindle" />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Run the test suite and lint to confirm nothing broke**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 3: Commit**

```bash
git add src/components/VinylRecord.jsx
git commit -m "$(cat <<'EOF'
Let VinylRecord accept a className and pass through extra props

Preps it to be used as both the outgoing and incoming record inside
VinylRecordStage's swap animation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create `VinylRecordStage`

**Files:**
- Create: `src/components/VinylRecordStage.jsx`
- Create: `src/components/VinylRecordStage.css`

- [ ] **Step 1: Create `VinylRecordStage.css`**

```css
.vinyl-record-stage {
  position: relative;
  width: var(--vinyl-record-size);
  height: var(--vinyl-record-size);
  overflow: hidden;
}

.vinyl-record-stage__record {
  position: absolute;
  inset: 0;
}

.vinyl-record-stage__record--outgoing {
  pointer-events: none;
}

.vinyl-record-stage__record--incoming,
.vinyl-record-stage__record--outgoing {
  animation-duration: 700ms;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

@media (min-width: 641px) {
  .vinyl-record-stage__record--incoming {
    animation-name: vinyl-slide-in-top;
  }

  .vinyl-record-stage__record--outgoing {
    animation-name: vinyl-slide-out-bottom;
  }
}

@media (max-width: 640px) {
  .vinyl-record-stage__record--incoming {
    animation-name: vinyl-slide-in-right;
  }

  .vinyl-record-stage__record--outgoing {
    animation-name: vinyl-slide-out-left;
  }
}

@keyframes vinyl-slide-in-top {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes vinyl-slide-out-bottom {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes vinyl-slide-in-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes vinyl-slide-out-left {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}
```

Note: `.vinyl-record-stage` deliberately does **not** have `border-radius: 50%`. The record is a circle inscribed in a square of side `--vinyl-record-size`, so clipping to that square only trims the corners outside the circle (invisible either way) and cleanly clips whichever record is mid-slide, without carving weird partial-circle slivers out of a circular mask.

- [ ] **Step 2: Create `VinylRecordStage.jsx`**

```jsx
import { useEffect, useRef, useState } from "react";
import { VinylRecord } from "./VinylRecord";
import "./VinylRecordStage.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/*
  VinylRecordStage
  ----------------
  Wraps VinylRecord to animate a "swap" transition whenever albumVersion
  changes: the previous record's art slides out while the new one slides
  in (top-down on desktop, right-to-left on mobile — see
  VinylRecordStage.css). Plain track changes within the same album don't
  touch albumVersion, so they never trigger this.

  Props: everything VinylRecord takes (playing, albumArt, onClick) plus
    - albumVersion: number — bumped by the player reducer on LOAD_ALBUM.
*/
export function VinylRecordStage({ playing, albumArt, onClick, albumVersion }) {
  const [outgoingCoverArt, setOutgoingCoverArt] = useState(null);
  const lastAlbumArtRef = useRef(albumArt);
  const lastAlbumVersionRef = useRef(albumVersion);

  useEffect(() => {
    if (albumVersion !== lastAlbumVersionRef.current) {
      lastAlbumVersionRef.current = albumVersion;
      if (!prefersReducedMotion()) {
        setOutgoingCoverArt(lastAlbumArtRef.current);
      }
    }
    lastAlbumArtRef.current = albumArt;
  }, [albumVersion, albumArt]);

  const isTransitioning = outgoingCoverArt !== null;

  return (
    <div className="vinyl-record-stage">
      {isTransitioning && (
        // Keying by albumVersion forces a fresh DOM node (and therefore a
        // fresh animation start) if a new album interrupts a transition
        // already in progress, instead of the browser continuing whatever
        // stale animation the old node was mid-way through.
        <VinylRecord
          key={`outgoing-${albumVersion}`}
          playing={false}
          albumArt={outgoingCoverArt}
          className="vinyl-record-stage__record vinyl-record-stage__record--outgoing"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <VinylRecord
        key={`incoming-${albumVersion}`}
        playing={playing}
        albumArt={albumArt}
        onClick={onClick}
        className={
          isTransitioning
            ? "vinyl-record-stage__record vinyl-record-stage__record--incoming"
            : "vinyl-record-stage__record"
        }
        onAnimationEnd={isTransitioning ? () => setOutgoingCoverArt(null) : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the test suite and lint to confirm nothing broke**

Run: `npm test && npm run lint`
Expected: PASS on both. No new automated tests are added here — this component has no dedicated test infra in this project (only `playerReducer` is unit-tested; everything visual is verified manually in-browser, same convention as the rest of the codebase). Task 7 covers manual verification.

- [ ] **Step 4: Commit**

```bash
git add src/components/VinylRecordStage.jsx src/components/VinylRecordStage.css
git commit -m "$(cat <<'EOF'
Add VinylRecordStage swap animation component

Renders the outgoing and incoming record briefly stacked in a clipped
container, animated via CSS keyframes gated on the existing 640px
breakpoint, cleaned up on the incoming record's animationend. Not wired
into App yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Wire `VinylRecordStage` into `App.jsx`

**Files:**
- Modify: `src/App.jsx:1-25` (imports and hook destructuring)
- Modify: `src/App.jsx:120-126` (record column JSX)

- [ ] **Step 1: Swap the import**

In `src/App.jsx`, change:

```js
import { VinylRecord } from "./components/VinylRecord";
```

to:

```js
import { VinylRecordStage } from "./components/VinylRecordStage";
```

- [ ] **Step 2: Destructure `albumVersion` from the hook**

Change:

```js
  const {
    status,
    track,
    play,
    pause,
    stop,
    skipNext,
    skipPrev,
    trackEnded,
    loadAlbum,
  } = usePlayerState(mockTracks);
```

to:

```js
  const {
    status,
    track,
    albumVersion,
    play,
    pause,
    stop,
    skipNext,
    skipPrev,
    trackEnded,
    loadAlbum,
  } = usePlayerState(mockTracks);
```

- [ ] **Step 3: Replace the `VinylRecord` usage**

Change:

```jsx
      <div className="player__record-column">
        <VinylRecord
          playing={status === "playing"}
          albumArt={track.coverArt}
          onClick={openSourceMenu}
        />
      </div>
```

to:

```jsx
      <div className="player__record-column">
        <VinylRecordStage
          playing={status === "playing"}
          albumArt={track.coverArt}
          onClick={openSourceMenu}
          albumVersion={albumVersion}
        />
      </div>
```

- [ ] **Step 4: Run the test suite and lint to confirm nothing broke**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "$(cat <<'EOF'
Wire VinylRecordStage into the player

Album loads now animate the record swap instead of snapping straight to
the new album art.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server preview**

Use the `preview_start` tool with `{"name": "record-player-dev"}` (already configured in `.claude/launch.json` from earlier work).

- [ ] **Step 2: Verify the desktop (top-down) swap**

At the default desktop viewport: open the source menu, load an album via the Deezer Demo search (e.g. search "daft punk", pick an album). Confirm the record visibly slides in from the top over roughly 700ms. Immediately after, use `read_page` (or a `javascript_tool` query for `document.querySelectorAll('.vinyl-record-stage__record').length`) to confirm exactly **one** `.vinyl-record-stage__record` element remains — the outgoing copy must be fully removed from the DOM after the animation finishes, not just visually hidden.

- [ ] **Step 3: Verify a second desktop swap (real outgoing art, not the placeholder)**

From the already-loaded album, open the source menu again and load a *different* album. Confirm the previous album's art visibly slides out the bottom while the new one slides in from the top, and re-check via `javascript_tool` that only one `.vinyl-record-stage__record` remains afterward.

- [ ] **Step 4: Verify interrupting a swap mid-flight restarts cleanly**

Trigger another album load, and this time — while it's still visibly mid-slide (within the ~700ms window) — immediately trigger a third album load. Confirm the animation visibly restarts from the top (rather than the record appearing to "jump" partway through, or two records briefly overlapping/blending), and that afterward exactly one `.vinyl-record-stage__record` remains in the DOM.

- [ ] **Step 5: Verify the mobile (right-to-left) swap**

Call `resize_window` with the `mobile` preset, then reload the page (mobile emulation needs a reload for load-time gates, per the tool's own guidance — though this app's mobile behavior is CSS-only via media query, so a reload isn't strictly required, but do it for a clean state anyway). Load a new album via the Deezer search flow again. Confirm the record slides in from the right while the previous one exits to the left. Re-check via `javascript_tool` that only one `.vinyl-record-stage__record` remains afterward.

- [ ] **Step 6: Verify `prefers-reduced-motion: reduce` skips the animation**

While still in the browser tab, run this via `javascript_tool` to force `matchMedia` to report reduced motion, before triggering a load:

```js
window.matchMedia = new Proxy(window.matchMedia, {
  apply(target, thisArg, args) {
    if (args[0] === "(prefers-reduced-motion: reduce)") {
      return { matches: true, media: args[0], addEventListener() {}, removeEventListener() {} };
    }
    return Reflect.apply(target, thisArg, args);
  },
});
```

Then load another album through the UI. Confirm via `javascript_tool` (`document.querySelectorAll('.vinyl-record-stage__record--outgoing').length`) that it stays `0` throughout — no outgoing copy is ever rendered, i.e. the swap is skipped entirely and the new art just appears immediately.

- [ ] **Step 7: Check the console for errors**

Use `read_console_messages` with `onlyErrors: true` across all the steps above. Expected: no errors.

- [ ] **Step 8: Report results to the user**

Summarize what was verified (desktop direction, mobile direction, DOM cleanup, reduced-motion behavior) and flag anything that didn't match the spec before considering the feature done.
