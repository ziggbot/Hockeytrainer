import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AccountForm } from "../components/AccountForm";
import { BackBar } from "../components/Chrome";
import { ConfirmButton } from "../components/ConfirmButton";
import { formatDayShort, formatTime, S } from "../i18n";
import { activeTeam, deleteTeam } from "../store/actions";
import { useAppState } from "../store/store";
import { useAccount } from "../sync/account";
import { TEAMS_ENABLED, errorText } from "../sync/api";
import { forgetTeam, signIn, signOut, syncNow, useSyncStatus } from "../sync/engine";
import {
  closeInvite,
  createInvite,
  deleteTeamEverywhere,
  inviteUrl,
  members as loadMembers,
  openInvites,
  removeMember,
  resetLink,
  resetUrl,
  setRole,
  type Member,
  type OpenInvite
} from "../sync/teams";

const t = S.ui.manage;

/** "Hantera lag": the team's coaches, invites, and the coach's account. */
export function ManageTeam() {
  const state = useAppState();
  const team = activeTeam(state);
  const account = useAccount();
  if (!team) return <Navigate to="/" replace />;

  return (
    <main className="page page--bare">
      <BackBar to="/lag" />
      <h1 className="title">{t.title}</h1>
      <p className="sub">{team.name}</p>
      {!TEAMS_ENABLED ? (
        <p className="notice">{t.notAvailable}</p>
      ) : !account ? (
        <>
          <p style={{ marginTop: 14 }}>{t.intro}</p>
          <AccountForm onDone={(acc) => signIn(acc)} />
        </>
      ) : (
        <Coaches teamId={team.id} teamName={team.name} />
      )}
    </main>
  );
}

function Coaches({ teamId, teamName }: { teamId: string; teamName: string }) {
  const account = useAccount()!;
  const navigate = useNavigate();
  const status = useSyncStatus();
  const [list, setList] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<OpenInvite[]>([]);
  const [link, setLink] = useState<{ kind: "invite" | "reset"; url: string; for?: string; hours?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = list?.find((m) => m.id === account.user.id);
  const isHead = me?.role === "head";

  const refresh = useCallback(async () => {
    try {
      // A team made on this phone is linked on the first sync after logging in.
      await syncNow();
      const ms = await loadMembers(teamId);
      setList(ms);
      const head = ms.find((m) => m.id === account.user.id)?.role === "head";
      setInvites(head ? await openInvites(teamId) : []);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [teamId, account.user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    act(async () => {
      const res = await createInvite(teamId);
      const url = inviteUrl(res.token);
      setLink({ kind: "invite", url });
      setCopied(false);
      // The phone's share sheet: SMS, WhatsApp, Spond … whatever the coaches use.
      if (navigator.share) {
        await navigator
          .share({ title: t.shareTitle(teamName), text: t.shareText(account.user.name, teamName), url })
          .catch(() => undefined);
      }
    });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const goneFromTeam = () => {
    forgetTeam(teamId);
    deleteTeam(teamId);
    navigate("/", { replace: true });
  };

  const others = list?.filter((m) => m.id !== account.user.id) ?? [];

  return (
    <>
      <section className="section">
        <div className="section__head">
          <h2>{t.coaches}</h2>
        </div>
        {!list && !error && <p className="sub">{t.connecting}</p>}
        {list && (
          <ul className="rows">
            {list.map((m) => (
              <li key={m.id} className="row row--compact">
                <span className="row__icon">{m.role === "head" ? "⭐" : "👤"}</span>
                <span className="row__main">
                  <div className="row__title">
                    {m.name}
                    {m.id === account.user.id && <span className="muted"> ({t.you})</span>}
                  </div>
                  <div className="row__sub">{t.roles[m.role]}</div>
                </span>
              </li>
            ))}
          </ul>
        )}
        {isHead && (
          <button type="button" className="cta cta--small" onClick={invite} disabled={busy}>
            {t.invite}
          </button>
        )}
        {link && (
          <div className="notice">
            <p style={{ margin: "0 0 8px" }}>{link.kind === "invite" ? t.inviteReady : t.resetReady(link.hours ?? 72)}</p>
            <input className="input" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => copy(link.url)}>
              {copied ? t.copied : t.copy}
            </button>
          </div>
        )}
      </section>

      {isHead && others.length > 0 && (
        <section className="section">
          <ul className="rows">
            {others.map((m) => (
              <li key={m.id} className="row manage-row">
                <span className="row__main">
                  <div className="row__title">{m.name}</div>
                  <div className="manage-actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => act(() => setRole(teamId, m.id, m.role === "head" ? "coach" : "head"))}
                    >
                      {m.role === "head" ? t.makeCoach : t.makeHead}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          const res = await resetLink(teamId, m.id);
                          setLink({ kind: "reset", url: resetUrl(res.token), for: m.name, hours: res.expiresInHours });
                          setCopied(false);
                        })
                      }
                    >
                      {t.resetLink}
                    </button>
                    <ConfirmButton
                      className="btn"
                      label={t.remove}
                      confirmLabel={t.removeConfirm}
                      onConfirm={() => act(() => removeMember(teamId, m.id))}
                    />
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHead && invites.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2>{t.openLinks}</h2>
          </div>
          <ul className="rows">
            {invites.map((inv) => (
              <li key={inv.id} className="row row--compact">
                <span className="row__icon">🔗</span>
                <span className="row__main">
                  <div className="row__sub">
                    {t.linkUses(inv.uses, inv.maxUses)} {formatDayShort(new Date(inv.expiresAt))}
                  </div>
                </span>
                <button type="button" className="btn" disabled={busy} onClick={() => act(() => closeInvite(inv.id))}>
                  {t.closeLink}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="notice notice--warn">{error}</p>}

      {me && (
        <div style={{ marginTop: 24 }}>
          {isHead ? (
            <ConfirmButton
              className="link link--danger"
              label={t.deleteForAll}
              confirmLabel={S.ui.common.tapAgainDelete}
              onConfirm={() =>
                act(async () => {
                  await deleteTeamEverywhere(teamId);
                  goneFromTeam();
                })
              }
            />
          ) : (
            <ConfirmButton
              className="link link--danger"
              label={t.leave}
              confirmLabel={t.leaveConfirm}
              onConfirm={() =>
                act(async () => {
                  await removeMember(teamId, account.user.id);
                  goneFromTeam();
                })
              }
            />
          )}
        </div>
      )}

      <p className="sub" style={{ marginTop: 24 }}>
        {t.signedInAs(account.user.name)} ·{" "}
        {status.phase === "syncing"
          ? t.syncing
          : status.phase === "offline"
            ? t.offline
            : status.at
              ? t.synced(formatTime(new Date(status.at).toTimeString().slice(0, 5)))
              : ""}
      </p>
      <button type="button" className="link" onClick={() => void signOut()}>
        {t.logout}
      </button>
    </>
  );
}
