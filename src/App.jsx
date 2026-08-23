import { useEffect, useRef, useState } from "react";
import { VinylRecordStage } from "./components/VinylRecordStage";
import { NowPlayingDisplay } from "./components/NowPlayingDisplay";
import { VolumeKnob } from "./components/VolumeKnob";
import { TransportControls } from "./components/TransportControls";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { SourceMenu } from "./components/SourceMenu";
import { AlbumSearchModal } from "./components/AlbumSearchModal";
import { SubsonicConnectModal } from "./components/SubsonicConnectModal";
import { SubsonicBrowseModal } from "./components/SubsonicBrowseModal";
import { JellyfinConnectModal } from "./components/JellyfinConnectModal";
import { JellyfinBrowseModal } from "./components/JellyfinBrowseModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import { readTrackMetadata } from "./api/localMetadata";
import { loadConnection as loadSubsonicConnection } from "./api/subsonicConnection";
import { loadConnection as loadJellyfinConnection } from "./api/jellyfinConnection";
import "./App.css";

function App() {
  const {
    status,
    track,
    albumVersion,
    play,
    pause,
    stop,
    skipNext,
    skipPrev,
    trackEnded,
    loadAlbum,
  } = usePlayerState(mockTracks);
  // null | "source" | "deezer" | "subsonic-connect" | "subsonic-browse"
  // | "jellyfin-connect" | "jellyfin-browse"
  const [activeModal, setActiveModal] = useState(null);
  const [subsonicConnection, setSubsonicConnection] = useState(null);
  const [jellyfinConnection, setJellyfinConnection] = useState(null);
  const audioRef = useRef(null);
  const folderInputRef = useRef(null);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    // Revoke local-file blob URLs on unmount so they don't leak memory.
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

  const handleSelectSubsonic = () => {
    const existing = loadSubsonicConnection();
    if (existing) {
      setSubsonicConnection(existing);
      setActiveModal("subsonic-browse");
    } else {
      setActiveModal("subsonic-connect");
    }
  };

  const handleSubsonicConnected = (connection) => {
    setSubsonicConnection(connection);
    setActiveModal("subsonic-browse");
  };

  const handleChangeServer = () => {
    setSubsonicConnection(null);
    setActiveModal("subsonic-connect");
  };

  const handleSelectJellyfin = () => {
    const existing = loadJellyfinConnection();
    if (existing) {
      setJellyfinConnection(existing);
      setActiveModal("jellyfin-browse");
    } else {
      setActiveModal("jellyfin-connect");
    }
  };

  const handleJellyfinConnected = (connection) => {
    setJellyfinConnection(connection);
    setActiveModal("jellyfin-browse");
  };

  const handleChangeJellyfinServer = () => {
    setJellyfinConnection(null);
    setActiveModal("jellyfin-connect");
  };

  const handleSelectFiles = () => {
    setActiveModal(null);
    folderInputRef.current?.click();
  };

  const handleFolderSelected = async (event) => {
    const files = [...event.target.files]
      .filter((file) => file.type.startsWith("audio/"))
      .sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

    event.target.value = "";

    if (files.length === 0) return;

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];

    const tracks = await Promise.all(
      files.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);

        const meta = await readTrackMetadata(file);
        if (meta.coverArtUrl) objectUrlsRef.current.push(meta.coverArtUrl);

        return {
          title: meta.title,
          album: meta.album,
          artist: meta.artist,
          previewUrl,
          coverArt: meta.coverArtUrl || undefined,
        };
      })
    );

    loadAlbum(tracks);
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
        <VinylRecordStage
          playing={status === "playing"}
          albumArt={track.coverArt}
          onClick={openSourceMenu}
          albumVersion={albumVersion}
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
          onSelectSubsonic={handleSelectSubsonic}
          onSelectJellyfin={handleSelectJellyfin}
        />
      )}
      {activeModal === "deezer" && (
        <AlbumSearchModal
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
        />
      )}
      {activeModal === "subsonic-connect" && (
        <SubsonicConnectModal
          onClose={() => setActiveModal(null)}
          onConnected={handleSubsonicConnected}
        />
      )}
      {activeModal === "subsonic-browse" && subsonicConnection && (
        <SubsonicBrowseModal
          connection={subsonicConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeServer}
        />
      )}
      {activeModal === "jellyfin-connect" && (
        <JellyfinConnectModal
          onClose={() => setActiveModal(null)}
          onConnected={handleJellyfinConnected}
        />
      )}
      {activeModal === "jellyfin-browse" && jellyfinConnection && (
        <JellyfinBrowseModal
          connection={jellyfinConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeJellyfinServer}
        />
      )}
    </div>
  );
}

export default App;
