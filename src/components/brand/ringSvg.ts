const TRACK = "#27272A";
const ARC = "#22C55E";

interface RingOpts {
  size?: number;
  track?: string;
  arc?: string;
}

/**
 * The "Track" emblem: a full grey track circle with a ~75% green progress arc
 * (rounded caps, gap in the top-left quadrant). Geometry lives here so the
 * React header/auth marks and the Satori-rendered PNG icons stay identical.
 */
export function ringSvgString({ size = 32, track = TRACK, arc = ARC }: RingOpts = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="${track}" stroke-width="4"/><circle cx="16" cy="16" r="13" stroke="${arc}" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="75 100" transform="rotate(-90 16 16)"/></svg>`;
}

/** Same ring as a data URI for use as an `<img src>` (Satori icon routes). */
export function ringDataUri(opts: RingOpts = {}): string {
  return `data:image/svg+xml,${encodeURIComponent(ringSvgString(opts))}`;
}
