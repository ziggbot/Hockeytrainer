import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AccountForm } from "../components/AccountForm";
import { BackBar } from "../components/Chrome";
import { S } from "../i18n";
import { setActiveTeam } from "../store/actions";
import { setAccount, useAccount, type Account } from "../sync/account";
import { TEAMS_ENABLED, errorText } from "../sync/api";
import { signIn, syncNow } from "../sync/engine";
import { acceptInvite, inviteInfo, isThisSport, type InviteInfo } from "../sync/teams";

const t = S.ui.manage;

/** Opened from an invite link: create an account (or log in) and join the team. */
export function JoinTeam() {
  const { token = "" } = useParams();
  const account = useAccount();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!TEAMS_ENABLED) return;
    inviteInfo(token)
      .then(setInfo)
      .catch((err) => setError(errorText(err)));
  }, [token]);

  const join = async (fresh?: Account) => {
    setBusy(true);
    setError(null);
    try {
      if (fresh) setAccount(fresh);
      const { teamId } = await acceptInvite(token);
      if (fresh) await signIn(fresh);
      else await syncNow({ full: true });
      setActiveTeam(teamId);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--bare">
      <BackBar to="/" />
      <h1 className="title">{t.joinTitle}</h1>
      {!TEAMS_ENABLED && <p className="notice">{t.notAvailable}</p>}
      {TEAMS_ENABLED && !info && !error && <p className="sub">{t.connecting}</p>}
      {info && !info.valid && <p className="notice notice--warn">{t.joinInvalid}</p>}
      {info?.valid && !isThisSport(info) && <p className="notice notice--warn">{t.otherSport}</p>}
      {info?.valid && isThisSport(info) && (
        <>
          <p style={{ fontSize: 20, marginTop: 12 }}>
            {t.joinText(info.invitedBy ?? "", info.teamName ?? "", t.roles[info.role ?? "coach"])}
          </p>
          {account ? (
            <button type="button" className="cta cta--small" disabled={busy} onClick={() => void join()}>
              {t.join}
            </button>
          ) : (
            <AccountForm onDone={(acc) => join(acc)} />
          )}
          {busy && <p className="sub">{t.connecting}</p>}
        </>
      )}
      {error && <p className="notice notice--warn">{error}</p>}
    </main>
  );
}
