import { useState, type ReactNode } from 'react';
import { t } from '../i18n/sv';

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="muted">{t.common.loading}</p>;
}

export function Card({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' | 'role' }) {
  return <span className={`tag${tone ? ` tag-${tone}` : ''}`}>{children}</span>;
}

/** Shows a link with a copy button (invite, reset and share links). */
export function CopyLink({ url, hint }: { url: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-link">
      {hint && <p className="muted">{hint}</p>}
      <div className="row">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Länk" />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard blocked: the field is selectable as a fallback.
            }
          }}
        >
          {copied ? t.common.copied : t.common.copy}
        </button>
      </div>
    </div>
  );
}

/** Chip picker for skill tags with a free-text field for club-specific tags. */
export function TagPicker({ value, onChange, options = t.skills }: { value: string[]; onChange: (v: string[]) => void; options?: string[] }) {
  const [extra, setExtra] = useState('');
  const all = [...new Set([...options, ...value])];
  const toggle = (tag: string) => onChange(value.includes(tag) ? value.filter((x) => x !== tag) : [...value, tag]);
  return (
    <div className="tag-picker">
      {all.map((tag) => (
        <button
          type="button"
          key={tag}
          className={`chip${value.includes(tag) ? ' chip-on' : ''}`}
          aria-pressed={value.includes(tag)}
          onClick={() => toggle(tag)}
        >
          {tag}
        </button>
      ))}
      <input
        className="chip-input"
        value={extra}
        placeholder={t.drills.form.otherTag}
        onChange={(e) => setExtra(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const tag = extra.trim().toLowerCase();
            if (tag && !value.includes(tag)) onChange([...value, tag]);
            setExtra('');
          }
        }}
      />
    </div>
  );
}

export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}
