interface Props {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
}

/**
 * The "log" brand mark — the Track ring emblem (mark only, no wordmark).
 * A full grey track with a ~75% green progress arc (gap in the top-left).
 */
export function Logo({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="log"
      className={className}
    >
      <circle cx="16" cy="16" r="13" stroke="var(--color-bg-surface-2)" strokeWidth="4" />
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="75 100"
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}
