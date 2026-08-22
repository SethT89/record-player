import { useEffect, useRef, useState } from "react";
import { VinylRecord } from "./components/VinylRecord";
import { NowPlayingDisplay } from "./components/NowPlayingDisplay";
import { VolumeKnob } from "./components/VolumeKnob";
import { TransportControls } from "./components/TransportControls";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { AlbumSearchModal } from "./components/AlbumSearchModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import "./App.css";

function App() {
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl || audio.src === track.previewUrl) return;
    audio.src = track.previewUrl;
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;
    if (status === "playing") {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [status, track]);

  const handleAlbumSelected = (tracks) => {
    loadAlbum(tracks);
    setIsSearchOpen(false);
  };

  const openSearch = () => setIsSearchOpen(true);

  return (
    <div className="player">
      <FullscreenToggle />
      <audio ref={audioRef} onEnded={trackEnded} />
      <div className="player__record-column">
        <VinylRecord
          playing={status === "playing"}
          albumArt={track.coverArt}
          onClick={openSearch}
        />
      </div>
      <div className="player__control-column">
        <div className="player__display-row">
          <NowPlayingDisplay track={track} onClick={openSearch} />
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
      {isSearchOpen && (
        <AlbumSearchModal
          onClose={() => setIsSearchOpen(false)}
          onAlbumSelected={handleAlbumSelected}
        />
      )}
    </div>
  );
}

export default App;
