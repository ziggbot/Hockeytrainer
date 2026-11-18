import { useState, type FormEvent } from "react";
import { S } from "../i18n";
import { setCoachName } from "../store/actions";
import { useAppState } from "../store/store";
import type { Account } from "../sync/account";
import { errorText } from "../sync/api";
import { login, register } from "../sync/teams";

const t = S.ui.manage;

/** Create an account or log in. Calls onDone with the new login. */
export function AccountForm({
  onDone,
  startWith = "register"
}: {
  onDone: (a: Account) => Promise<void>;
  startWith?: "register" | "login";
}) {
  const state = useAppState();
  const [mode, setMode] = useState(startWith);
  const [name, setName] = useState(state.coachName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const acc = mode === "register" ? await register(name.trim(), email.trim(), password) : await login(email.trim(), password);
      if (!state.coachName.trim()) setCoachName(acc.user.name);
      await onDone(acc);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {mode === "register" && (
        <label className="field">
          <span className="field__label">{t.name}</span>
          <input className="input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field__label">{t.email}</span>
        <input
          className="input"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.password}</span>
        <input
          className="input"
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "register" && <span className="field__hint">{t.passwordHint}</span>}
      </label>
      {error && <p className="notice notice--warn">{error}</p>}
      {busy && <p className="sub">{t.connecting}</p>}
      <button type="submit" className="cta cta--small" disabled={busy}>
        {mode === "register" ? t.createAccount : t.login}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError(null);
        }}
      >
        {mode === "register" ? t.haveAccount : t.noAccount}
      </button>
    </form>
  );
}
