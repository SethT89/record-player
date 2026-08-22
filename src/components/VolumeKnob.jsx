import { useCallback, useEffect, useRef, useState } from "react";
import "./VolumeKnob.css";

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const KEYBOARD_STEP = 5;
const WHEEL_STEP = 5;

const clampVolume = (value) => Math.min(100, Math.max(0, value));

export function VolumeKnob({ initialVolume = 70 }) {
  const [volume, setVolume] = useState(initialVolume);
  const dragState = useRef(null);
  const knobRef = useRef(null);

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
    const nextVolume = clampVolume(dragState.current.startVolume + deltaY);
    setVolume(nextVolume);
  }, []);

  const handlePointerUp = useCallback((event) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    setVolume((current) => clampVolume(current - Math.sign(event.deltaY) * WHEEL_STEP));
  }, []);

  useEffect(() => {
    const element = knobRef.current;
    if (!element) return undefined;
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault();
        setVolume((current) => clampVolume(current + KEYBOARD_STEP));
        break;
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault();
        setVolume((current) => clampVolume(current - KEYBOARD_STEP));
        break;
      case "Home":
        event.preventDefault();
        setVolume(0);
        break;
      case "End":
        event.preventDefault();
        setVolume(100);
        break;
      default:
        break;
    }
  }, []);

  const angle = MIN_ANGLE + (volume / 100) * (MAX_ANGLE - MIN_ANGLE);

  return (
    <div
      ref={knobRef}
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
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <div
        className="volume-knob__indicator"
        style={{ transform: `rotate(${angle}deg)` }}
      />
    </div>
  );
}
