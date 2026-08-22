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
    - isToggle: boolean (optional, default false) — marks a key as one of
        the latching pair (Play/Pause). Toggle keys suppress the native
        :active press effect (see TransportKey.css) so the only thing that
        ever presses them down is the `latched` state itself — otherwise,
        on touch devices, :active releases the instant your finger lifts
        while `latched` only applies a beat later after React re-renders,
        which visibly pops the key back up before it presses back down.
*/
export function TransportKey({
  icon,
  label,
  onClick,
  latched = false,
  isToggle = false,
}) {
  const classes = ["transport-key"];
  if (latched) classes.push("transport-key--latched");
  if (isToggle) classes.push("transport-key--toggle");

  return (
    <button
      type="button"
      className={classes.join(" ")}
      onClick={onClick}
      aria-label={label}
      aria-pressed={latched}
    >
      <span className="transport-key__icon">{icon}</span>
    </button>
  );
}
