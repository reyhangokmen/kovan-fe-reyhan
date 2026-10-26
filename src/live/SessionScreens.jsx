import { useState } from "react";
import { ArrowRight, Building2, KeyRound, LogOut, MailWarning, Plus } from "lucide-react";
import { Brand, Button, Panel } from "../prototype/UI";
import { errorMessage } from "../api/client";
import { loadCurrentUser, resendVerification, selectSite, verifyEmail } from "../api/kovan";
import { Notice } from "./common";
import { roleLabel } from "./labels";

/** Girişten sonra, birden fazla sitesi olan ya da hiç sitesi olmayan kullanıcı için. */
export function SitePicker({ auth, onSelected, onLogout, onOpenInvite, onOpenCreateSite }) {
  const [busySite, setBusySite] = useState(null);
  const [error, setError] = useState("");
  const workspaces = auth.workspaces || [];

  const choose = async (siteId) => {
    setBusySite(siteId);
    setError("");
    try {
      onSelected(await selectSite(siteId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusySite(null);
    }
  };

  return (
    <main className="live-center">
      <div className="live-center-card">
        <Brand />
        <Panel
          title={workspaces.length ? "Site seçin" : "Henüz bir siteniz yok"}
          subtitle={
            workspaces.length
              ? "Birden fazla sitede üyeliğiniz var. Çalışmak istediğiniz siteyi seçin veya yeni bir site açın."
              : "Hesabınız açık ancak henüz aktif bir site üyeliğiniz yok. Yeni bir site açabilir veya davet bağlantısıyla katılabilirsiniz."
          }
        >
          {workspaces.length > 0 && (
            <div className="live-site-list">
              {workspaces.map((w) => (
                <button
                  key={w.siteId}
                  type="button"
                  className="live-site-item"
                  disabled={Boolean(busySite)}
                  onClick={() => choose(w.siteId)}
                >
                  <span className="live-row">
                    <Building2 size={18} className="text-gold" />
                    <span>
                      <strong>{w.siteName}</strong>
                      <br />
                      <small className="live-muted">{w.roles.map(roleLabel).join(", ")}</small>
                    </span>
                  </span>
                  {busySite === w.siteId ? "Açılıyor…" : <ArrowRight size={16} />}
                </button>
              ))}
            </div>
          )}
          <Notice kind="error">{error}</Notice>
          <div className="live-row end mt-3">
            <Button type="button" onClick={onOpenCreateSite}>
              <Plus size={15} /> Yeni Site Aç
            </Button>
            <Button secondary type="button" onClick={onOpenInvite}>
              <KeyRound size={15} /> Davet Bağlantım Var
            </Button>
            <Button secondary type="button" onClick={onLogout}>
              <LogOut size={15} /> Çıkış Yap
            </Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

/** E-postası doğrulanmamış kullanıcıya gösterilir; kayıtta gönderilen 6 haneli kodla doğrulanır. */
export function EmailVerifyBanner({ user, onNotify }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user?.email || user.emailVerified !== false) return null;

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyEmail(user.email, code.trim());
      await loadCurrentUser();
      onNotify?.("E-posta adresiniz doğrulandı.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await resendVerification(user.email);
      onNotify?.("Yeni doğrulama kodu e-postanıza gönderildi (5 dakika geçerli).");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="live-verify-banner" onSubmit={verify}>
      <MailWarning size={18} />
      <span>
        <strong>E-posta adresinizi doğrulayın.</strong> {user.email} adresine gönderilen 6 haneli kodu girin.
      </span>
      <input
        inputMode="numeric"
        maxLength={6}
        required
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        aria-label="Doğrulama kodu"
      />
      <Button type="submit" disabled={busy || code.length !== 6}>
        Doğrula
      </Button>
      <Button secondary type="button" disabled={busy} onClick={resend}>
        Kodu Tekrar Gönder
      </Button>
      {error && <span className="live-notice error" style={{ margin: 0 }}>{error}</span>}
    </form>
  );
}
