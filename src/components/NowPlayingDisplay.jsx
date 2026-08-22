import { MarqueeText } from "./MarqueeText";
import "./NowPlayingDisplay.css";

export function NowPlayingDisplay({ track }) {
  return (
    <div className="now-playing">
      <MarqueeText text={`${track.title} — ${track.album}`} />
      <MarqueeText text={track.artist} />
    </div>
  );
}
