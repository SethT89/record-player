import { useEffect, useState } from "react";

function getDisplayFontShorthand() {
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue(
    "--display-font"
  );
  return `1em ${fontFamily}`;
}

/*
  useDisplayFontReady
  --------------------
  Returns true once the browser has the theme's --display-font (see
  fonts.css) actually loaded and ready to paint with.

  This exists because font-display (block/swap) only controls the
  browser's own fallback timing, and different engines haven't proven
  reliable about honoring it identically — Safari in particular has shown
  cases of painting with the generic fallback rather than staying
  invisible during the font's load window. Gating on the Font Loading API
  directly, rather than trusting the CSS property alone, guarantees the
  marquee never paints text in the wrong typeface, regardless of engine
  quirks.
*/
export function useDisplayFontReady() {
  const [ready, setReady] = useState(() => document.fonts.check(getDisplayFontShorthand()));

  useEffect(() => {
    if (ready) return;
    const fontShorthand = getDisplayFontShorthand();
    let cancelled = false;
    document.fonts.load(fontShorthand).finally(() => {
      if (!cancelled) setReady(document.fonts.check(fontShorthand));
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}
