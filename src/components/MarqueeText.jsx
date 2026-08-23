import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDisplayFontReady } from "../hooks/useDisplayFontReady";
import "./MarqueeText.css";

/*
  MarqueeText
  -----------
  Props:
    - text: string — the text to display.

  Measures the text against its container. If it fits, it's rendered
  statically. If it overflows, the text is rendered twice back-to-back
  inside a track that scrolls to -50%. Because both copies are identical
  and separated by the same trailing gap used between loops, the moment
  the second copy reaches the start position is visually indistinguishable
  from the initial frame — so the loop from 100% back to 0% reads as
  seamless instead of jumping.

  Each copy renders a dim "ghost" backdrop (an all-segments-lit stand-in,
  same length as the real text) behind the bright "lit" text, which is
  what sells the segmented-LCD look rather than just blocky glowing text.

  Scroll SPEED (not duration) is held constant across every instance —
  a fixed animation-duration would make longer titles visibly race by
  faster than short ones, since they'd cover more pixels in the same
  time. Instead, duration is computed per-instance from the measured
  text width so every title moves at the same, comfortably readable
  pace, with a fixed hold time before/after each pass regardless of
  title length.

  Nothing renders until useDisplayFontReady confirms the real display
  typeface is active — otherwise both the overflow measurement and the
  first paint could use the browser's fallback font's metrics, which are
  a different size than the real one, instead of waiting the (normally
  imperceptibly brief) moment for the correct font.
*/
let nextMarqueeId = 0;

const SCROLL_SPEED_PX_PER_SEC = 45;
const HOLD_SECONDS = 1.5;
const COPY_GAP_PX = 32; // matches .marquee__copy's padding-right

function MarqueeCopy({ text, hidden }) {
  const ghost = "8".repeat(text.length);
  return (
    <span className="marquee__copy" aria-hidden={hidden || undefined}>
      <span className="marquee__ghost" aria-hidden="true">
        {ghost}
      </span>
      <span className="marquee__lit">{text}</span>
    </span>
  );
}

export function MarqueeText({ text }) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [animationName] = useState(() => `marquee-scroll-${nextMarqueeId++}`);
  const fontReady = useDisplayFontReady();

  useLayoutEffect(() => {
    if (!fontReady) return;
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const checkOverflow = () => {
      setIsOverflowing(measure.scrollWidth > container.clientWidth);
      setTextWidth(measure.scrollWidth);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [text, fontReady]);

  const { totalDuration, holdPercent } = useMemo(() => {
    const distance = textWidth + COPY_GAP_PX;
    const scrollDuration = distance / SCROLL_SPEED_PX_PER_SEC;
    const total = HOLD_SECONDS * 2 + scrollDuration;
    return {
      totalDuration: total,
      holdPercent: (HOLD_SECONDS / total) * 100,
    };
  }, [textWidth]);

  return (
    <div className="marquee" ref={containerRef}>
      {fontReady && (
        <>
          <span className="marquee__measure" ref={measureRef}>
            {text}
          </span>
          {isOverflowing ? (
            <>
              <style>{`
                @keyframes ${animationName} {
                  0%, ${holdPercent.toFixed(2)}% { transform: translateX(0); }
                  ${(100 - holdPercent).toFixed(2)}%, 100% { transform: translateX(-50%); }
                }
              `}</style>
              <div
                key={text}
                className="marquee__track marquee__track--scrolling"
                style={{ animationName, animationDuration: `${totalDuration.toFixed(2)}s` }}
              >
                <MarqueeCopy text={text} />
                <MarqueeCopy text={text} hidden />
              </div>
            </>
          ) : (
            <div className="marquee__track">
              <MarqueeCopy text={text} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
