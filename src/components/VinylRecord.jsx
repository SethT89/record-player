import "./VinylRecord.css";

/*
  VinylRecord
  -----------
  Props:
    - playing: boolean — controls whether the disc spins
    - albumArt: string (optional) — image URL for the center label.
        Falls back to a plain gradient placeholder if not provided.
    - onClick: function (optional) — invoked when the record is clicked.
        Used to open the source-selection menu, same action as clicking
        the now-playing display.
    - className: string (optional) — extra class(es) appended after the
        base "vinyl-record" class. Used by VinylRecordStage to position
        this record inside its swap animation.
    - ...rest — any other native <button> props (e.g. aria-hidden,
        tabIndex, onAnimationEnd) are spread onto the root button. Used by
        VinylRecordStage to hide the outgoing copy from assistive tech and
        to detect when the incoming copy's slide-in animation finishes.
*/
export function VinylRecord({ playing, albumArt, onClick, className, ...rest }) {
  const rootClassName = className ? `vinyl-record ${className}` : "vinyl-record";
  return (
    <button
      type="button"
      className={rootClassName}
      onClick={onClick}
      aria-label="Choose a music source"
      {...rest}
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
