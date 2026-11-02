import { useState } from "react";
import { Ban, Mail, RefreshCw, RotateCcw, Send, Undo2 } from "lucide-react";
import { Button, Empty, Field, Panel } from "../prototype/UI";
import {
  assignBoardRole,
  can,
  listApprovals,
  listInvitations,
  listMembers,
  reopenJoin,
  resendInvitation,
  revokeInvitation,
} from "../api/kovan";
import { Loading, Notice } from "./common";
import { useAction, useLoad } from "./hooks";
import { INVITATION_STATUS_LABELS, MEMBERSHIP_TYPE_LABELS, dateOnly, dateTime, fullName, roleLabel } from "./labels";

export default function RolesLive({ auth, onNotify }) {
  const canSeeMembers = can(auth, "KULLANICI.SAKIN_LISTE");
  const canAssignBoard = can(auth, "KULLANICI.ROL_ATAMA");
  const canInvite = can(auth, "KULLANICI.DAVET");

  const members = useLoad(() => (canSeeMembers ? listMembers() : Promise.resolve([])), [canSeeMembers]);
  const invitations = useLoad(() => (canInvite ? listInvitations() : Promise.resolve([])), [canInvite]);
  const rejected = useLoad(() => (canInvite ? listApprovals("REJECTED") : Promise.resolve([])), [canInvite]);

  const refresh = () => {
    members.reload();
    invitations.reload();
    rejected.reload();
  };

  return (
    <div className="live-stack">
      <div className="module-actions">
        <div>
          <p>Sitedeki üyeleri ve rollerini görün; yönetim/denetim kurulu atayın ve gönderilen davetleri yönetin.</p>
          {auth?.siteName && (
            <div className="live-row mt-2">
              <span className="live-muted">Aktif site: <strong>{auth.siteName}</strong></span>
            </div>
          )}
        </div>
        <Button secondary onClick={refresh}>
          <RefreshCw size={15} /> Yenile
        </Button>
      </div>

      {canAssignBoard && <BoardRoleForm onDone={refresh} onNotify={onNotify} />}

      {canSeeMembers && (
        <Panel title="Site üyeleri" subtitle="Aktif üyelikler: yönetim (site seviyesi) ve sakinler (daire bazlı).">
          <Notice kind="error">{members.error}</Notice>
          {members.loading && !members.data ? (
            <Loading />
          ) : members.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Kişi</th>
                    <th>Roller</th>
                    <th>Daire / Üyelik</th>
                    <th>Başlangıç</th>
                  </tr>
                </thead>
                <tbody>
                  {members.data.map((m) => (
                    <tr key={m.membershipId}>
                      <td>
                        <strong>{fullName(m)}</strong>
                        <small>{m.email}</small>
                      </td>
                      <td>
                        <div className="live-row">
                          {m.roles.length ? m.roles.map((r) => <span key={r} className="live-chip">{roleLabel(r)}</span>) : "—"}
                        </div>
                      </td>
                      <td>
                        {m.unitId ? (
                          <>
                            {m.blockName} · {m.unitNo}
                            <small>{MEMBERSHIP_TYPE_LABELS[m.membershipType]}</small>
                          </>
                        ) : (
                          <span className="live-muted">Site yönetimi</span>
                        )}
                      </td>
                      <td>{dateOnly(m.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Henüz üye yok." />
          )}
        </Panel>
      )}

      {canInvite && (
        <InvitationsPanel invitations={invitations} onChanged={refresh} onNotify={onNotify} />
      )}

      {canInvite && rejected.data?.length > 0 && (
        <RejectedPanel items={rejected.data} onChanged={refresh} onNotify={onNotify} />
      )}
    </div>
  );
}

function BoardRoleForm({ onDone, onNotify }) {
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("YONETIM_KURULU");
  const { busy, error, run } = useAction();

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const result = await assignBoardRole(email, roleCode);
      onNotify?.(
        result.result === "ASSIGNED"
          ? `${email} kişisine ${roleLabel(roleCode)} rolü verildi.`
          : `${email} adresine ${roleLabel(roleCode)} daveti gönderildi.`,
      );
      setEmail("");
      onDone();
    });
  };

  return (
    <Panel title="Kurul üyesi ata" subtitle="Kişinin hesabı varsa rol hemen verilir; yoksa e-postasına 7 gün geçerli davet gider.">
      <form onSubmit={submit} className="settings-grid">
        <div className="board-assign-grid">
          <Field label="E-posta">
            <div className="input-with-icon">
              <Mail size={16} className="field-icon" />
              <input
                type="email"
                required
                placeholder="ornek@alanadi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Rol">
            <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
              <option value="YONETIM_KURULU">Yönetim Kurulu</option>
              <option value="DENETIM_KURULU">Denetim Kurulu</option>
            </select>
          </Field>
          <div className="board-assign-btn-wrap">
            <Button type="submit" disabled={busy} className="board-assign-btn">
              <Send size={14} /> {busy ? "Gönderiliyor…" : "Ata / Davet Et"}
            </Button>
          </div>
        </div>
        <Notice kind="error">{error}</Notice>
      </form>
    </Panel>
  );
}

function InvitationsPanel({ invitations, onChanged, onNotify }) {
  const { busy, error, run } = useAction();
  const act = (fn, message) =>
    run(async () => {
      await fn();
      onNotify?.(message);
      onChanged();
    });

  return (
    <Panel title="Gönderilen davetler" subtitle="E-posta davetleri ve daire bağlantıları; davetler 7 gün geçerlidir.">
      <Notice kind="error">{invitations.error || error}</Notice>
      {invitations.loading && !invitations.data ? (
        <Loading />
      ) : invitations.data?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Davet</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son geçerlilik</th>
                <th className="align-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {invitations.data.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong>{inv.kind === "EMAIL" ? inv.email : "Daire bağlantısı"}</strong>
                    <small>
                      {inv.membershipType ? MEMBERSHIP_TYPE_LABELS[inv.membershipType] : ""} · {dateTime(inv.createdAt)}
                    </small>
                  </td>
                  <td>{roleLabel(inv.roleCode)}</td>
                  <td>
                    <span
                      className={`live-chip ${inv.status === "ACCEPTED" ? "ok" : inv.status === "PENDING" ? "warn" : "off"}`}
                    >
                      {INVITATION_STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                  <td>{dateTime(inv.expiresAt)}</td>
                  <td className="align-right">
                    <div className="live-row end">
                      {inv.kind === "EMAIL" && ["PENDING", "EXPIRED"].includes(inv.status) && (
                        <Button
                          secondary
                          disabled={busy}
                          onClick={() => act(() => resendInvitation(inv.id), `${inv.email} adresine davet yeniden gönderildi.`)}
                        >
                          <RotateCcw size={13} /> Yeniden Gönder
                        </Button>
                      )}
                      {inv.status === "PENDING" && (
                        <Button
                          secondary
                          disabled={busy}
                          onClick={() => act(() => revokeInvitation(inv.id), "Davet iptal edildi.")}
                        >
                          <Ban size={13} /> İptal Et
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="Henüz davet gönderilmedi." />
      )}
    </Panel>
  );
}

function RejectedPanel({ items, onChanged, onNotify }) {
  const { busy, error, run } = useAction();
  return (
    <Panel title="Reddedilen başvurular" subtitle="Yanlışlıkla reddedilen başvuruyu tekrar onay bekleyenlere alabilirsiniz.">
      <Notice kind="error">{error}</Notice>
      <div className="table-scroll">
        <table>
          <tbody>
            {items.map((a) => (
              <tr key={a.useId}>
                <td>
                  <strong>{fullName(a)}</strong>
                  <small>{a.email}</small>
                </td>
                <td>
                  {a.blockName} · {a.unitNo} ({MEMBERSHIP_TYPE_LABELS[a.requestedMembershipType]})
                </td>
                <td className="align-right">
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await reopenJoin(a.useId);
                        onNotify?.(`${fullName(a)} başvurusu tekrar onay bekleyenlere alındı.`);
                        onChanged();
                      })
                    }
                  >
                    <Undo2 size={13} /> Reddi Geri Al
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
