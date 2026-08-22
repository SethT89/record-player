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
