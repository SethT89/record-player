# Player Layout and Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full player UI around the existing `VinylRecord` component — two-column layout, a marquee-scrolling now-playing display with volume knob, and a chunky 5-button transport pad — driven by a tested play/pause/stop/skip state machine against mock track data (no real audio yet).

**Architecture:** A pure `playerReducer` (no React, no DOM) owns all state-transition logic and is unit-tested directly with Vitest. A thin `usePlayerState` hook wraps it in `useReducer`. `App` owns the hook and passes `status`/`track`/action functions down to presentational components (`VinylRecord`, `NowPlayingDisplay`, `VolumeKnob`, `TransportControls`), which are verified manually in the browser since their behavior is visual/animation-driven rather than logic-driven.

**Tech Stack:** React 19 + Vite (existing), Vitest (new, for the reducer only — no DOM/jsdom needed since the tested logic is plain JS).

---

## Reference: Design spec

Full design decisions (layout proportions, button visual language, marquee behavior, state machine rules) are in [`docs/superpowers/specs/2026-08-22-player-layout-and-mechanics-design.md`](../specs/2026-08-22-player-layout-and-mechanics-design.md). This plan implements that spec exactly — refer back to it if a task's rationale is unclear.

---

### Task 1: Add Vitest test runner

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add a test script**

In `package.json`, add a `"test"` entry to `"scripts"`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Verify the runner works with no tests yet**

Run: `npm test`
Expected: Vitest starts, reports `No test files found`, exits without crashing (confirms the install and script are wired up correctly — Task 3 adds the first real test).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add Vitest test runner"
```

---

### Task 2: Mock track data

**Files:**
- Create: `src/data/mockTracks.js`

- [ ] **Step 1: Create the mock track list**

```js
export const mockTracks = [
  {
    title: "Midnight Drive",
    album: "The Neon Hour",
    artist: "Night Voltage",
  },
  {
    title: "Static Bloom",
    album: "Static Bloom",
    artist: "Paper Satellites",
  },
  {
    title: "A Very Long Song Title That Definitely Will Not Fit On One Line",
    album: "Overflow Test",
    artist: "The Marquee Testers",
  },
];
```

The third entry is deliberately long — it's what will exercise the `MarqueeText` overflow/scroll path later.

- [ ] **Step 2: Commit**

```bash
git add src/data/mockTracks.js
git commit -m "Add mock track data"
```

---

### Task 3: Player state reducer (TDD)

**Files:**
- Create: `src/player/playerReducer.js`
- Test: `src/player/playerReducer.test.js`

This is the one piece of real logic in this feature (latching rules, wrap-around, forced-pause-on-skip), so it's the one piece that gets unit tests — pure JS, no DOM needed.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import { createInitialPlayerState, playerReducer } from "./playerReducer";

const tracks = [
  { title: "Track A", album: "Album A", artist: "Artist A" },
  { title: "Track B", album: "Album B", artist: "Artist B" },
  { title: "Track C", album: "Album C", artist: "Artist C" },
];

describe("createInitialPlayerState", () => {
  it("starts stopped at the first track", () => {
    const state = createInitialPlayerState(tracks);
    expect(state.status).toBe("stopped");
    expect(state.currentTrackIndex).toBe(0);
  });
});

describe("playerReducer", () => {
  it("PLAY sets status to playing", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "PLAY" });
    expect(next.status).toBe("playing");
  });

  it("PAUSE sets status to paused", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "PAUSE" });
    expect(next.status).toBe("paused");
  });

  it("STOP sets status to stopped from playing", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "STOP" });
    expect(next.status).toBe("stopped");
  });

  it("STOP sets status to stopped from paused", () => {
    const state = { ...createInitialPlayerState(tracks), status: "paused" };
    const next = playerReducer(state, { type: "STOP" });
    expect(next.status).toBe("stopped");
  });

  it("SKIP_NEXT advances the track index", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.currentTrackIndex).toBe(1);
  });

  it("SKIP_NEXT wraps from the last track back to the first", () => {
    const state = { ...createInitialPlayerState(tracks), currentTrackIndex: 2 };
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.currentTrackIndex).toBe(0);
  });

  it("SKIP_PREV wraps from the first track back to the last", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "SKIP_PREV" });
    expect(next.currentTrackIndex).toBe(2);
  });

  it("SKIP_NEXT forces status to paused even while playing", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.status).toBe("paused");
  });

  it("SKIP_PREV forces status to paused even while playing", () => {
    const state = {
      ...createInitialPlayerState(tracks),
      status: "playing",
      currentTrackIndex: 1,
    };
    const next = playerReducer(state, { type: "SKIP_PREV" });
    expect(next.status).toBe("paused");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './playerReducer'` (the file doesn't exist yet).

- [ ] **Step 3: Implement the reducer**

```js
export function createInitialPlayerState(tracks) {
  return {
    status: "stopped",
    currentTrackIndex: 0,
    tracks,
  };
}

export function playerReducer(state, action) {
  switch (action.type) {
    case "PLAY":
      return { ...state, status: "playing" };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "STOP":
      return { ...state, status: "stopped" };
    case "SKIP_NEXT":
      return {
        ...state,
        status: "paused",
        currentTrackIndex: (state.currentTrackIndex + 1) % state.tracks.length,
      };
    case "SKIP_PREV":
      return {
        ...state,
        status: "paused",
        currentTrackIndex:
          (state.currentTrackIndex - 1 + state.tracks.length) %
          state.tracks.length,
      };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/player/playerReducer.js src/player/playerReducer.test.js
git commit -m "Add player state reducer with tests"
```

---

### Task 4: usePlayerState hook

**Files:**
- Create: `src/hooks/usePlayerState.js`

Thin wrapper around the already-tested reducer — no new logic, so no dedicated test. It gets exercised indirectly via manual browser verification in Task 11.

- [ ] **Step 1: Create the hook**

```js
import { useReducer } from "react";
import {
  createInitialPlayerState,
  playerReducer,
} from "../player/playerReducer";

export function usePlayerState(tracks) {
  const [state, dispatch] = useReducer(
    playerReducer,
    tracks,
    createInitialPlayerState
  );

  return {
    status: state.status,
    track: state.tracks[state.currentTrackIndex],
    play: () => dispatch({ type: "PLAY" }),
    pause: () => dispatch({ type: "PAUSE" }),
    stop: () => dispatch({ type: "STOP" }),
    skipNext: () => dispatch({ type: "SKIP_NEXT" }),
    skipPrev: () => dispatch({ type: "SKIP_PREV" }),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePlayerState.js
git commit -m "Add usePlayerState hook"
```

---

### Task 5: TransportKey component (chunky button primitive)

**Files:**
- Create: `src/components/TransportKey.jsx`
- Create: `src/components/TransportKey.css`

Visual language locked in during brainstorming: vertical rectangle, stacked hard-edged shadow for a visible "side," diagonal sink-in press, debossed icon. Verified manually in Task 11 (pure visual/CSS, not unit-testable in a meaningful way).

- [ ] **Step 1: Create the component**

```jsx
import "./TransportKey.css";

export function TransportKey({ icon, label, onClick, latched = false }) {
  return (
    <button
      type="button"
      className={`transport-key${latched ? " transport-key--latched" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={latched}
    >
      <span className="transport-key__icon">{icon}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create the styles**

```css
.transport-key {
  width: 52px;
  height: 88px;
  border: none;
  border-radius: 7px;
  background: linear-gradient(180deg, #63666a 0%, #3d4044 60%, #34363a 100%);
  box-shadow:
    0 3px 0 0 #2c2e31,
    0 6px 0 0 #26282b,
    0 9px 0 0 #202225,
    0 12px 0 0 #1a1c1e,
    0 15px 16px rgba(0, 0, 0, 0.5);
  transform: translate(0, 0);
  transition: transform 0.09s ease, box-shadow 0.09s ease;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14px;
  box-sizing: border-box;
}

.transport-key:active,
.transport-key--latched {
  transform: translate(2px, 13px);
  box-shadow:
    0 1px 0 0 #2c2e31,
    0 2px 6px rgba(0, 0, 0, 0.4);
}

.transport-key__icon {
  font-size: 13px;
  color: #3a3c40;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.35),
    0 -1px 1px rgba(0, 0, 0, 0.7);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TransportKey.jsx src/components/TransportKey.css
git commit -m "Add TransportKey chunky button component"
```

---

### Task 6: VolumeKnob component

**Files:**
- Create: `src/components/VolumeKnob.jsx`
- Create: `src/components/VolumeKnob.css`

Visual/interactive only for this pass — tracks a local `volume` value via vertical pointer drag, not wired to any audio output yet.

- [ ] **Step 1: Create the component**

```jsx
import { useCallback, useRef, useState } from "react";
import "./VolumeKnob.css";

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

export function VolumeKnob({ initialVolume = 70 }) {
  const [volume, setVolume] = useState(initialVolume);
  const dragState = useRef(null);

  const handlePointerDown = useCallback(
    (event) => {
      dragState.current = { startY: event.clientY, startVolume: volume };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [volume]
  );

  const handlePointerMove = useCallback((event) => {
    if (!dragState.current) return;
    const deltaY = dragState.current.startY - event.clientY;
    const nextVolume = Math.min(
      100,
      Math.max(0, dragState.current.startVolume + deltaY)
    );
    setVolume(nextVolume);
  }, []);

  const handlePointerUp = useCallback((event) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const angle = MIN_ANGLE + (volume / 100) * (MAX_ANGLE - MIN_ANGLE);

  return (
    <div
      className="volume-knob"
      role="slider"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(volume)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="volume-knob__indicator"
        style={{ transform: `rotate(${angle}deg)` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the styles**

```css
.volume-knob {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #6a6d70, #2c2d2f 75%);
  box-shadow:
    0 3px 0 #141516,
    0 5px 8px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
  position: relative;
  cursor: grab;
  touch-action: none;
}

.volume-knob__indicator {
  position: absolute;
  top: 4px;
  left: 50%;
  width: 3px;
  height: 14px;
  margin-left: -1.5px;
  background: #e5e5e5;
  border-radius: 2px;
  transform-origin: 50% 18px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/VolumeKnob.jsx src/components/VolumeKnob.css
git commit -m "Add VolumeKnob component"
```

---

### Task 7: MarqueeText component

**Files:**
- Create: `src/components/MarqueeText.jsx`
- Create: `src/components/MarqueeText.css`

Measures its own text against its container width. If it fits, renders statically. If it overflows, renders the text twice back-to-back and scrolls the pair — the loop point is visually identical to the start, so it appears to loop seamlessly. Verified manually in Task 11 (DOM measurement doesn't produce meaningful results under jsdom).

- [ ] **Step 1: Create the component**

```jsx
import { useLayoutEffect, useRef, useState } from "react";
import "./MarqueeText.css";

export function MarqueeText({ text }) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const checkOverflow = () => {
      setIsOverflowing(measure.scrollWidth > container.clientWidth);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [text]);

  return (
    <div className="marquee" ref={containerRef}>
      <span className="marquee__measure" ref={measureRef}>
        {text}
      </span>
      {isOverflowing ? (
        <div className="marquee__track marquee__track--scrolling">
          <span className="marquee__copy">{text}</span>
          <span className="marquee__copy" aria-hidden="true">
            {text}
          </span>
        </div>
      ) : (
        <div className="marquee__track">
          <span className="marquee__copy">{text}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the styles**

```css
.marquee {
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.marquee__measure {
  position: absolute;
  visibility: hidden;
  white-space: nowrap;
  pointer-events: none;
}

.marquee__track {
  display: flex;
  width: max-content;
}

.marquee__copy {
  white-space: nowrap;
  padding-right: 32px;
}

.marquee__track--scrolling {
  animation: marquee-scroll 10s linear infinite;
}

@keyframes marquee-scroll {
  0%,
  15% {
    transform: translateX(0);
  }
  95%,
  100% {
    transform: translateX(-50%);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MarqueeText.jsx src/components/MarqueeText.css
git commit -m "Add MarqueeText scrolling component"
```

---

### Task 8: NowPlayingDisplay component

**Files:**
- Create: `src/components/NowPlayingDisplay.jsx`
- Create: `src/components/NowPlayingDisplay.css`

- [ ] **Step 1: Create the component**

```jsx
import { MarqueeText } from "./MarqueeText";
import "./NowPlayingDisplay.css";

export function NowPlayingDisplay({ track }) {
  return (
    <div className="now-playing">
      <MarqueeText text={`${track.title} — ${track.album}`} />
      <MarqueeText text={track.artist} />
    </div>
  );
}
```

- [ ] **Step 2: Create the styles**

```css
.now-playing {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  background: #1c1d1f;
  border-radius: 8px;
  padding: 14px 16px;
  color: #e5e5e5;
  font-size: 15px;
  min-width: 0;
}

.now-playing :last-child {
  font-size: 13px;
  color: #9a9a9a;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NowPlayingDisplay.jsx src/components/NowPlayingDisplay.css
git commit -m "Add NowPlayingDisplay component"
```

---

### Task 9: TransportControls component

**Files:**
- Create: `src/components/TransportControls.jsx`
- Create: `src/components/TransportControls.css`

Renders the 5 keys in order (skip-back, play, pause, skip-forward, stop). Only Play and Pause receive `latched` — Stop and the skip keys are always momentary.

- [ ] **Step 1: Create the component**

```jsx
import { TransportKey } from "./TransportKey";
import "./TransportControls.css";

export function TransportControls({
  status,
  onPlay,
  onPause,
  onStop,
  onSkipNext,
  onSkipPrev,
}) {
  return (
    <div className="transport-controls">
      <TransportKey icon="◀◀" label="Skip back" onClick={onSkipPrev} />
      <TransportKey
        icon="▶"
        label="Play"
        onClick={onPlay}
        latched={status === "playing"}
      />
      <TransportKey
        icon="❙❙"
        label="Pause"
        onClick={onPause}
        latched={status === "paused"}
      />
      <TransportKey icon="▶▶" label="Skip forward" onClick={onSkipNext} />
      <TransportKey icon="■" label="Stop" onClick={onStop} />
    </div>
  );
}
```

- [ ] **Step 2: Create the styles**

```css
.transport-controls {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  background: #1c1d1f;
  border-radius: 10px;
  padding: 20px 16px;
  flex: 1;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TransportControls.jsx src/components/TransportControls.css
git commit -m "Add TransportControls component"
```

---

### Task 10: Wire everything into App

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`

Replaces the temporary local `playing` toggle button from the earlier scaffolding commit with the full layout and real player state.

- [ ] **Step 1: Replace App.jsx**

```jsx
import { VinylRecord } from "./components/VinylRecord";
import { NowPlayingDisplay } from "./components/NowPlayingDisplay";
import { VolumeKnob } from "./components/VolumeKnob";
import { TransportControls } from "./components/TransportControls";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import "./App.css";

function App() {
  const { status, track, play, pause, stop, skipNext, skipPrev } =
    usePlayerState(mockTracks);

  return (
    <div className="player">
      <div className="player__record-column">
        <VinylRecord playing={status === "playing"} />
      </div>
      <div className="player__control-column">
        <div className="player__display-row">
          <NowPlayingDisplay track={track} />
          <VolumeKnob />
        </div>
        <TransportControls
          status={status}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onSkipNext={skipNext}
          onSkipPrev={skipPrev}
        />
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Replace App.css**

```css
.player {
  min-height: 100svh;
  display: flex;
  box-sizing: border-box;
}

.player__record-column {
  flex: 1.8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.player__control-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 24px 24px 0;
  min-width: 240px;
}

.player__display-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

@media (max-width: 640px) {
  .player {
    flex-direction: column;
  }

  .player__control-column {
    padding: 0 20px 24px;
    min-width: 0;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "Wire full player layout and state into App"
```

---

### Task 11: Manual browser verification

No automated test covers the visual/interactive pieces (animation, drag, layout), so this task is the real check for the feature as a whole. Use the existing `record-player-dev` preview config (`.claude/launch.json`) to run the dev server.

- [ ] **Step 1: Start the dev server and load the app**

Start the `record-player-dev` preview server and open it in the browser pane.

- [ ] **Step 2: Verify Play/Pause latching**

Click Play: record spins, Play key visually sinks in and stays down, Pause key is up.
Click Pause: record freezes in place (does not reset rotation), Pause key sinks in and stays down, Play key pops up.
Click Play again: record resumes spinning from where it froze.

- [ ] **Step 3: Verify Stop**

While playing (or paused), click Stop: record freezes in place, both Play and Pause pop up, and the Stop key itself pops back up immediately rather than staying latched.

- [ ] **Step 4: Verify Skip forward/back**

Click Skip forward repeatedly: track display updates through all 3 mock tracks and wraps back to the first after the last. Whatever the play state was before, it becomes paused after each skip.
Click Skip back from the first track: wraps to the last track.

- [ ] **Step 5: Verify the marquee display**

Skip to "A Very Long Song Title That Definitely Will Not Fit On One Line": confirm that line scrolls (holds, scrolls smoothly, loops with no visible jump). Confirm the shorter track titles/artist names stay static with no animation.

- [ ] **Step 6: Verify the volume knob**

Click-drag the knob up and down: the indicator rotates smoothly between its two extremes and doesn't visually overshoot past them.

- [ ] **Step 7: Verify responsive layout**

Resize the browser pane to a narrow (phone-width) viewport: layout stacks vertically (record on top, display+volume row, then buttons), nothing overflows horizontally.

- [ ] **Step 8: Fix any issues found, then commit**

If any of the above steps surface a bug, fix it in the relevant component file and re-verify.

```bash
git add -A
git commit -m "Fix issues found in manual verification"
```

(Skip this commit if no fixes were needed.)
