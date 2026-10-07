interface Props {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}

/** − value + with big targets. Typing numbers on a phone at the rink is worse. */
export function Stepper({ value, onChange, min, max, step = 1, format = String, label }: Props) {
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="btn btn--icon"
        aria-label={`${label} −${step}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="stepper__value" aria-live="polite">
        {format(value)}
      </span>
      <button
        type="button"
        className="btn btn--icon"
        aria-label={`${label} +${step}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        +
      </button>
    </span>
  );
}
