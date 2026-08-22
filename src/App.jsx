import { useState } from "react";
import { VinylRecord } from "./components/VinylRecord";
import "./App.css";

function App() {
  // Temporary local state for previewing the record's spin behavior.
  // Will be replaced by shared player state once playback is wired up.
  const [playing, setPlaying] = useState(false);

  return (
    <div className="player">
      <VinylRecord playing={playing} />
      <button
        type="button"
        className="play-toggle"
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}

export default App;
