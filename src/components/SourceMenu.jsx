import "./SourceMenu.css";

/*
  SourceMenu
  ----------
  The first thing you see when clicking the record or the now-playing
  display: a choice of where to load music from. "Demo Songs" opens
  the existing album search. "My Files" opens a native folder picker
  (browser-native, not our own UI) — audio files found in the folder
  become the new track list, playable the same way as a Deezer album.
  "Subsonic Library" and "Jellyfin Library" each connect to (or, if
  already connected, browse) a user's own self-hosted music server.
*/
export function SourceMenu({
  onClose,
  onSelectFiles,
  onSelectDeezer,
  onSelectSubsonic,
  onSelectJellyfin,
}) {
  return (
    <div className="source-menu-scrim" onClick={onClose}>
      <div
        className="source-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a music source"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="source-menu__option" onClick={onSelectFiles}>
          <span className="source-menu__option-title">My Files</span>
          <span className="source-menu__option-subtitle">Pick a Folder</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectDeezer}>
          <span className="source-menu__option-title">Demo Songs</span>
          <span className="source-menu__option-subtitle">Free</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectSubsonic}>
          <span className="source-menu__option-title">Subsonic Library</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectJellyfin}>
          <span className="source-menu__option-title">Jellyfin Library</span>
        </button>
      </div>
    </div>
  );
}
