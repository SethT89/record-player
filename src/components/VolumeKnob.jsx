import { useCallback, useEffect, useRef, useState } from "react";
import "./VolumeKnob.css";

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const KEYBOARD_STEP = 5;
const WHEEL_STEP = 5;

const clampVolume = (value) => Math.min(100, Math.max(0, value));

/*
  VolumeKnob
  ----------
  Dragging directly on a 44px dial is fiddly with a mouse (and not much
  better with a finger), so the dial itself is just a display + toggle
  button now. Clicking it opens a vertical slider popover, which is a
  much easier target to actually adjust — the dial's rotation still
  reflects whatever the slider (or keyboard, or the wheel) sets it to.
*/
export function VolumeKnob({ initialVolume = 70 }) {
  const [volume, setVolume] = useState(initialVolume);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const knobRef = useRef(null);
  const sliderRef = useRef(null);

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

  useEffect(() => {
    if (!isOpen) return undefined;
    sliderRef.current?.focus();

    const handlePointerDownOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDownGlobal = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDownGlobal);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDownGlobal);
    };
  }, [isOpen]);

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
    <div className="volume-control" ref={containerRef}>
      {isOpen && (
        <div className="volume-popover">
          <input
            ref={sliderRef}
            type="range"
            className="volume-popover__slider"
            aria-label="Volume"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </div>
      )}
      <button
        ref={knobRef}
        type="button"
        className="volume-knob"
        aria-label="Volume"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleKeyDown}
      >
        <div
          className="volume-knob__indicator"
          style={{ transform: `rotate(${angle}deg)` }}
        />
      </button>
    </div>
  );
}
