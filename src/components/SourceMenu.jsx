import "./SourceMenu.css";

/*
  SourceMenu
  ----------
  The first thing you see when clicking the record or the now-playing
  display: a choice of where to load music from. "Deezer Demo" opens
  the existing album search. "My Files" opens a native folder picker
  (browser-native, not our own UI) — for now, picking a folder doesn't
  do anything with the files yet; wiring local playback is a follow-up.
*/
export function SourceMenu({ onClose, onSelectFiles, onSelectDeezer }) {
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
          <span className="source-menu__option-title">Deezer Demo</span>
        </button>
      </div>
    </div>
  );
}
