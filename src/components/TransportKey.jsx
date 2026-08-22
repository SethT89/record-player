import "./TransportKey.css";

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
