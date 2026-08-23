import { TransportKey } from "./TransportKey";
import "./TransportControls.css";

/*
  Icons share one 24x24 viewBox with each shape scaled to fill a similar
  footprint (roughly 12-18px), so a single-shape icon (Play, Stop) reads
  as visually similar in weight to a two-shape icon (the skip icons,
  Pause) — plain text glyphs at the same font-size vary wildly in
  rendered size depending on the character, which is what this replaces.
*/
function SkipBackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M12 12L21 5V19Z" />
      <path d="M3 12L12 5V19Z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M12 12L3 5V19Z" />
      <path d="M21 12L12 5V19Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M7 4V20L20 12Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <rect x="6" y="4" width="5" height="16" rx="1" />
      <rect x="13" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function TransportControls({
  status,
  onPlay,
  onPause,
  onStop,
  onSkipNext,
  onSkipPrev,
}) {
  return (
    <div className="transport-controls" role="group" aria-label="Playback controls">
      <TransportKey icon={<SkipBackIcon />} label="Skip back" onClick={onSkipPrev} />
      <TransportKey
        icon={<PlayIcon />}
        label="Play"
        onClick={onPlay}
        latched={status === "playing"}
        isToggle
      />
      <TransportKey
        icon={<PauseIcon />}
        label="Pause"
        onClick={onPause}
        latched={status === "paused"}
        isToggle
      />
      <TransportKey icon={<StopIcon />} label="Stop" onClick={onStop} />
      <TransportKey icon={<SkipForwardIcon />} label="Skip forward" onClick={onSkipNext} />
    </div>
  );
}
