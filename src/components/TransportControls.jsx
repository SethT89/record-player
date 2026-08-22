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
    <div className="transport-controls" role="group" aria-label="Playback controls">
      <TransportKey icon="◀◀" label="Skip back" onClick={onSkipPrev} />
      <TransportKey
        icon="▶"
        label="Play"
        onClick={onPlay}
        latched={status === "playing"}
        isToggle
      />
      <TransportKey
        icon="❙❙"
        label="Pause"
        onClick={onPause}
        latched={status === "paused"}
        isToggle
      />
      <TransportKey icon="▶▶" label="Skip forward" onClick={onSkipNext} />
      <TransportKey icon="■" label="Stop" onClick={onStop} />
    </div>
  );
}
