import { useEffect, useState } from "react";
import "./FullscreenToggle.css";

/*
  FullscreenToggle
  ----------------
  A minimal expand button that only appears when the cursor is near the
  top-right corner (via a larger invisible hover zone), or when it has
  keyboard focus. Toggles the whole document into/out of the browser's
  native Fullscreen API.
*/
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="fullscreen-zone">
      <button
        type="button"
        className="fullscreen-toggle"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H3v6M21 9V3h-6M3 15v6h6M15 21h6v-6" />
        </svg>
      </button>
    </div>
  );
}
