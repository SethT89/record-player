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

  The travel distance isn't just the record's own diameter — it's stretched
  by the record's actual current gap to the relevant viewport edge (top on
  desktop, right on mobile), measured fresh each time a transition starts.
  Since the player layout keeps the record centered, that same gap exists
  on the opposite edge too, so adding it to both the incoming record's
  start offset and the outgoing record's end offset makes the record
  genuinely enter/exit past the real edge of the browser, with the two
  records maintaining that gap between them the whole way across — rather
  than the two being flush against each other like a filmstrip.

  Props: everything VinylRecord takes (playing, albumArt, onClick) plus
    - albumVersion: number — bumped by the player reducer on LOAD_ALBUM.
*/
export function VinylRecordStage({ playing, albumArt, onClick, albumVersion }) {
  const [outgoingCoverArt, setOutgoingCoverArt] = useState(null);
  const [swapGap, setSwapGap] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const lastAlbumArtRef = useRef(albumArt);
  const lastAlbumVersionRef = useRef(albumVersion);

  useEffect(() => {
    if (albumVersion !== lastAlbumVersionRef.current) {
      lastAlbumVersionRef.current = albumVersion;
      if (!prefersReducedMotion()) {
        const rect = stageRef.current.getBoundingClientRect();
        setSwapGap({
          y: Math.max(0, rect.top),
          x: Math.max(0, window.innerWidth - rect.right),
        });
        setOutgoingCoverArt(lastAlbumArtRef.current);
      }
    }
    lastAlbumArtRef.current = albumArt;
  }, [albumVersion, albumArt]);

  const isTransitioning = outgoingCoverArt !== null;

  return (
    <div
      ref={stageRef}
      className="vinyl-record-stage"
      style={{
        "--vinyl-swap-gap-x": `${swapGap.x}px`,
        "--vinyl-swap-gap-y": `${swapGap.y}px`,
      }}
    >
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
