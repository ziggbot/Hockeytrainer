// Hand-drawn style line icons. Stroke-only so they read as ink sketches.

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* stick: shaft from top right, blade curving left along the ice */}
      <path
        d="M24 3 L13.5 24 Q12.3 26.4 9.6 26.4 L3.5 26.4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* puck */}
      <ellipse cx="23.5" cy="26" rx="5" ry="2.5" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function CheckMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M8 21 C11 24 13 27 16 31 C21 21 26 13 34 6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
