import { useEffect, useRef, useState } from "react";
import { VinylRecord } from "./VinylRecord";
import "./VinylRecordStage.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/*
  VinylRecordStage
  ----------------
  Wraps VinylRecord to animate a "swap" transition whenever albumVersion
  changes: the previous record's art slides out while the new one slides
  in (top-down on desktop, right-to-left on mobile — see
  VinylRecordStage.css). Plain track changes within the same album don't
  touch albumVersion, so they never trigger this.

  Props: everything VinylRecord takes (playing, albumArt, onClick) plus
    - albumVersion: number — bumped by the player reducer on LOAD_ALBUM.
*/
export function VinylRecordStage({ playing, albumArt, onClick, albumVersion }) {
  const [outgoingCoverArt, setOutgoingCoverArt] = useState(null);
  const lastAlbumArtRef = useRef(albumArt);
  const lastAlbumVersionRef = useRef(albumVersion);

  useEffect(() => {
    if (albumVersion !== lastAlbumVersionRef.current) {
      lastAlbumVersionRef.current = albumVersion;
      if (!prefersReducedMotion()) {
        setOutgoingCoverArt(lastAlbumArtRef.current);
      }
    }
    lastAlbumArtRef.current = albumArt;
  }, [albumVersion, albumArt]);

  const isTransitioning = outgoingCoverArt !== null;

  return (
    <div className="vinyl-record-stage">
      {isTransitioning && (
        // Keying by albumVersion forces a fresh DOM node (and therefore a
        // fresh animation start) if a new album interrupts a transition
        // already in progress, instead of the browser continuing whatever
        // stale animation the old node was mid-way through.
        <VinylRecord
          key={`outgoing-${albumVersion}`}
          playing={false}
          albumArt={outgoingCoverArt}
          className="vinyl-record-stage__record vinyl-record-stage__record--outgoing"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <VinylRecord
        key={`incoming-${albumVersion}`}
        playing={playing}
        albumArt={albumArt}
        onClick={onClick}
        className={
          isTransitioning
            ? "vinyl-record-stage__record vinyl-record-stage__record--incoming"
            : "vinyl-record-stage__record"
        }
        onAnimationEnd={isTransitioning ? () => setOutgoingCoverArt(null) : undefined}
      />
    </div>
  );
}
