import { S } from "../i18n";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const STEP_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

interface Props {
  /** "HH:MM" (24 h). */
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/**
 * 24-hour time shown the Swedish way ("17.15"). The native <input type="time">
 * follows the phone's region and shows "5:15 PM" on English-set phones, so
 * hours and minutes are two plain selects instead.
 */
export function TimePicker({ value, onChange, label }: Props) {
  const [h = "18", m = "00"] = value.split(":");
  // Keep an odd minute (e.g. 17.07 from an older entry) selectable.
  const minutes = STEP_MINUTES.includes(m) ? STEP_MINUTES : [...STEP_MINUTES, m].sort();
  return (
    <span className="timepicker" role="group" aria-label={label}>
      <select
        className="input"
        aria-label={`${label}, ${S.ui.common.hour}`}
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
      >
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="timepicker__dot" aria-hidden="true">
        .
      </span>
      <select
        className="input"
        aria-label={`${label}, ${S.ui.common.minute}`}
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
      >
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </span>
  );
}
