import "./VinylRecord.css";

/*
  VinylRecord
  -----------
  Props:
    - playing: boolean — controls whether the disc spins
    - albumArt: string (optional) — image URL for the center label.
        Falls back to a plain gradient placeholder if not provided.
    - onClick: function (optional) — invoked when the record is clicked.
        Used to open the album search modal, same action as clicking the
        now-playing display.
*/
export function VinylRecord({ playing, albumArt, onClick }) {
  return (
    <button
      type="button"
      className="vinyl-record"
      onClick={onClick}
      aria-label="Search for an album"
    >
      <div className="vinyl-record__sheen" />
      <div className="vinyl-record__tint" />
      <div
        className={`vinyl-record__disc${playing ? " vinyl-record__disc--playing" : ""}`}
      >
        <div className="vinyl-record__label">
          {albumArt ? (
            <img src={albumArt} alt="" className="vinyl-record__album-img" />
          ) : (
            <span className="vinyl-record__label-text">ALBUM ART</span>
          )}
        </div>
        <div className="vinyl-record__spindle" />
      </div>
    </button>
  );
}
