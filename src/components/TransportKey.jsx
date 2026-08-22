import "./TransportKey.css";

/*
  TransportKey
  ------------
  Props:
    - icon: node — the debossed icon/glyph rendered on the key face.
    - label: string — accessible name for the button (used as aria-label).
    - onClick: function — click handler invoked when the key is pressed.
    - latched: boolean (optional, default false) — when true, renders the
        key in its permanently pressed-in state (used for Play/Pause toggles).
*/
export function TransportKey({ icon, label, onClick, latched = false }) {
  return (
    <button
      type="button"
      className={`transport-key${latched ? " transport-key--latched" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={latched}
    >
      <span className="transport-key__icon">{icon}</span>
    </button>
  );
}
