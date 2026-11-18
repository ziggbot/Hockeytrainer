import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackBar } from "../components/Chrome";
import { S } from "../i18n";
import { TEAMS_ENABLED, errorText } from "../sync/api";
import { signIn } from "../sync/engine";
import { resetInfo, resetPassword } from "../sync/teams";

const t = S.ui.manage;

/** Opened from a reset link that the head coach sent. */
export function NewPassword() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ valid: boolean; name?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!TEAMS_ENABLED) return;
    resetInfo(token)
      .then(setInfo)
      .catch((err) => setError(errorText(err)));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(await resetPassword(token, password));
      navigate("/lag/hantera", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--bare">
      <BackBar to="/" />
      <h1 className="title">{t.newPasswordTitle}</h1>
      {!TEAMS_ENABLED && <p className="notice">{t.notAvailable}</p>}
      {info && !info.valid && <p className="notice notice--warn">{t.resetInvalid}</p>}
      {info?.valid && (
        <form onSubmit={submit}>
          <p>{t.newPasswordFor(info.name ?? "")}</p>
          <label className="field">
            <span className="field__label">{t.password}</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field__hint">{t.passwordHint}</span>
          </label>
          <button type="submit" className="cta cta--small" disabled={busy}>
            {t.savePassword}
          </button>
        </form>
      )}
      {error && <p className="notice notice--warn">{error}</p>}
    </main>
  );
}
