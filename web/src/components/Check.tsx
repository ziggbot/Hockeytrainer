import { CheckMark } from "./Icons";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  small?: boolean;
}

/** Hand-drawn checkbox. Large hit area so it works with gloves. */
export function Check({ checked, onChange, label, small }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check${small ? " check--sm" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      {checked && <CheckMark />}
    </button>
  );
}
