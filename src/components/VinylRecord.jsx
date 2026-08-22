/*
  VinylRecord
  -----------
  Props:
    - playing: boolean — controls whether the disc spins
    - albumArt: string (optional) — image URL for the center label.
        Falls back to a plain gradient placeholder if not provided.
*/

export function VinylRecord({ playing, albumArt }) {
  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.sheen} />
      <div
        style={{
          ...styles.disc,
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        <div style={styles.label}>
          {albumArt ? (
            <img src={albumArt} alt="" style={styles.albumImg} />
          ) : (
            <span style={styles.labelText}>ALBUM ART</span>
          )}
        </div>
        <div style={styles.spindle} />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "clamp(280px, 60vw, 680px)",
    height: "clamp(280px, 60vw, 680px)",
    borderRadius: "50%",
    position: "relative",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  sheen: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.10), transparent 42%)",
    pointerEvents: "none",
    zIndex: 2,
  },
  disc: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `repeating-radial-gradient(
      circle at center,
      #161616 0px,
      #161616 2px,
      #282828 2.6px,
      #161616 3.2px
    )`,
    animationName: "spin",
    animationDuration: "3.5s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  label: {
    width: "34%",
    height: "34%",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #d85a30, #993c1d)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
  },
  albumImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  labelText: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: "0.5px",
  },
  spindle: {
    position: "absolute",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#0a0a0a",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
  },
};
