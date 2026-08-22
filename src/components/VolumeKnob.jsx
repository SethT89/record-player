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
