import { useEffect, type ReactNode } from "react";
import { S } from "../i18n";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet. Closes on backdrop tap or Escape. */
export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2>{title}</h2>
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label={S.ui.common.close}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
