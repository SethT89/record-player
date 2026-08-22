import { MarqueeText } from "./MarqueeText";
import "./NowPlayingDisplay.css";

export function NowPlayingDisplay({ track, onClick }) {
  return (
    <button
      type="button"
      className="now-playing"
      onClick={onClick}
      aria-label="Search for an album"
    >
      <MarqueeText text={`${track.title} — ${track.album}`} />
      <div className="now-playing__artist">
        <MarqueeText text={track.artist} />
      </div>
    </button>
  );
}
