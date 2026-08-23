import { useEffect, useRef, useState } from "react";
import { VinylRecord } from "./components/VinylRecord";
import { NowPlayingDisplay } from "./components/NowPlayingDisplay";
import { VolumeKnob } from "./components/VolumeKnob";
import { TransportControls } from "./components/TransportControls";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { SourceMenu } from "./components/SourceMenu";
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
  const [activeModal, setActiveModal] = useState(null); // null | "source" | "deezer"
  const audioRef = useRef(null);
  const folderInputRef = useRef(null);

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
    setActiveModal(null);
  };

  const openSourceMenu = () => setActiveModal("source");

  const handleSelectDeezer = () => setActiveModal("deezer");

  const handleSelectFiles = () => {
    setActiveModal(null);
    folderInputRef.current?.click();
  };

  const handleFolderSelected = (event) => {
    // Local file playback isn't wired up yet — this just opens the
    // native picker for now, per the current scope.
    console.log("Folder selected:", event.target.files);
    event.target.value = "";
  };

  const handleVolumeChange = (volume) => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  };

  return (
    <div className="player">
      <FullscreenToggle />
      <audio ref={audioRef} onEnded={trackEnded} />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        hidden
        onChange={handleFolderSelected}
      />
      <div className="player__record-column">
        <VinylRecord
          playing={status === "playing"}
          albumArt={track.coverArt}
          onClick={openSourceMenu}
        />
      </div>
      <div className="player__control-column">
        <div className="player__display-row">
          <NowPlayingDisplay track={track} onClick={openSourceMenu} />
          <VolumeKnob onVolumeChange={handleVolumeChange} />
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
      {activeModal === "source" && (
        <SourceMenu
          onClose={() => setActiveModal(null)}
          onSelectDeezer={handleSelectDeezer}
          onSelectFiles={handleSelectFiles}
        />
      )}
      {activeModal === "deezer" && (
        <AlbumSearchModal
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
        />
      )}
    </div>
  );
}

export default App;
