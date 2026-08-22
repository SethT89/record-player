import { MarqueeText } from "./MarqueeText";
import "./NowPlayingDisplay.css";

export function NowPlayingDisplay({ track }) {
  return (
    <div className="now-playing">
      <MarqueeText text={`${track.title} — ${track.album}`} />
      <div className="now-playing__artist">
        <MarqueeText text={track.artist} />
      </div>
    </div>
  );
}
