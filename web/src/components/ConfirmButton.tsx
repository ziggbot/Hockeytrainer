import { useEffect, useState, type CSSProperties } from "react";
import { S } from "../i18n";

interface Props {
  label: string;
  /** Shown after the first tap; defaults to "Säker? Tryck igen". */
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Two-tap confirmation inside the page. Native confirm() is blocked in
 * sandboxed frames (it silently returns false) and looks out of place in the
 * hand-drawn UI. The armed state resets after a few seconds.
 */
export function ConfirmButton({ label, confirmLabel = S.ui.common.tapAgain, onConfirm, className = "btn", style }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className}${armed ? " btn--armed" : ""}`}
      style={style}
      aria-live="polite"
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
