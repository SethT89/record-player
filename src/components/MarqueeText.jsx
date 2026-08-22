import { useLayoutEffect, useRef, useState } from "react";
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
*/
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

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const checkOverflow = () => {
      setIsOverflowing(measure.scrollWidth > container.clientWidth);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [text]);

  return (
    <div className="marquee" ref={containerRef}>
      <span className="marquee__measure" ref={measureRef}>
        {text}
      </span>
      {isOverflowing ? (
        <div key={text} className="marquee__track marquee__track--scrolling">
          <MarqueeCopy text={text} />
          <MarqueeCopy text={text} hidden />
        </div>
      ) : (
        <div className="marquee__track">
          <MarqueeCopy text={text} />
        </div>
      )}
    </div>
  );
}
