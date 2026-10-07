import { S } from "../i18n";
import { Stepper } from "./Stepper";
import { TimePicker } from "./TimePicker";

interface Props {
  start: string;
  minutes: number;
  onChange: (next: { start: string; minutes: number }) => void;
  /** Accessible prefix, e.g. the weekday: "tisdag starttid". */
  label: string;
}

/** Start time (17.15) + ice time (− 60 min +), wrapping as one group on narrow phones. */
export function TimeAndLength({ start, minutes, onChange, label }: Props) {
  return (
    <span className="time-length">
      <TimePicker
        value={start}
        onChange={(v) => onChange({ start: v, minutes })}
        label={`${label} ${S.ui.team.start.toLowerCase()}`}
      />
      <Stepper
        value={minutes}
        onChange={(v) => onChange({ start, minutes: v })}
        min={15}
        max={180}
        step={5}
        label={`${label} ${S.ui.team.length.toLowerCase()}`}
        format={S.ui.common.minutes}
      />
    </span>
  );
}
