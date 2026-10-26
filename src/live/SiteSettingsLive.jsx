import { useEffect, useState } from "react";
import { Blocks, Building2, LayoutGrid, Percent, Save, Wallet } from "lucide-react";
import { Button, Field, Panel } from "../prototype/UI";
import SiteSettings from "../prototype/SiteSettings";
import {
  can,
  changeLateFeeRate,
  getCurrentSite,
  getSiteSettings,
  listSiteModules,
  setSiteModule,
  updateCurrentSite,
  updateSiteSettings,
} from "../api/kovan";
import { DemoBanner, Loading, Notice } from "./common";
import { useAction, useLoad } from "./hooks";
import { DEBTOR_RULES, SITE_STATUS_LABELS, SITE_TYPES, dateOnly, dateTime } from "./labels";

const localToday = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

export default function SiteSettingsLive({ auth, siteMeta, onSiteUpdated, onNotify }) {
  const canModules = can(auth, "SITE.MODUL_ESLESME");
  const [tab, setTab] = useState("general");
  const tabs = [
    { id: "general", label: "Genel Bilgiler", icon: Building2 },
    { id: "dues", label: "Aidat Politikası", icon: Wallet },
    ...(canModules ? [{ id: "modules", label: "Modüller", icon: Blocks }] : []),
    { id: "other", label: "Diğer Ayarlar (örnek)", icon: LayoutGrid },
  ];

  return (
    <div className="site-settings-container">
      <div
        className="settings-tabs-nav live-settings-tabs-nav"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === "general" && <GeneralTab onSiteUpdated={onSiteUpdated} onNotify={onNotify} />}
      {tab === "dues" && <DuesTab onNotify={onNotify} />}
      {tab === "modules" && <ModulesTab onNotify={onNotify} />}
      {tab === "other" && (
        <>
          <DemoBanner>
            <strong>Bu sekmedeki ayarların (banka hesapları, POS, SMS, KVKK) backend'i henüz yok.</strong> Görünen
            değerler örnektir ve kaydedilmez.
          </DemoBanner>
          <SiteSettings siteMeta={siteMeta} onUpdateSiteMeta={() => {}} units={[]} onNotify={onNotify} />
        </>
      )}
    </div>
  );
}

function GeneralTab({ onSiteUpdated, onNotify }) {
  const site = useLoad(getCurrentSite, []);
  const [form, setForm] = useState(null);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (site.data) {
      const { name, type, city, district, address, logoUrl } = site.data;
      setForm({ name, type, city, district, address, logoUrl: logoUrl || "" });
    }
  }, [site.data]);

  if (site.error) return <Notice kind="error">{site.error}</Notice>;
  if (!form) return <Loading />;

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const submit = (e) => {
    e.preventDefault();
    const cleanLogo = form.logoUrl?.trim() || "";
    if (cleanLogo && !/^https?:\/\//i.test(cleanLogo)) {
      setError("Logo adresi 'http://' veya 'https://' protokolüyle başlamalıdır.");
      return;
    }
    run(async () => {
      const saved = await updateCurrentSite({ ...form, logoUrl: cleanLogo || null });
      onSiteUpdated?.(saved);
      onNotify?.("Site bilgileri kaydedildi.");
    });
  };

  return (
    <Panel
      title="Site Kimliği"
      subtitle={`Durum: ${SITE_STATUS_LABELS[site.data.status] || site.data.status} · ${site.data.blockCount} blok, ${site.data.unitCount} daire · Açılış: ${dateOnly(site.data.createdAt)}`}
    >
      <form onSubmit={submit} className="settings-grid">
        <div className="grid-2-col">
          <Field label="Site / Apartman Adı">
            <input required maxLength={150} value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Yapı Tipi">
            <select value={form.type} onChange={(e) => update("type", e.target.value)}>
              {SITE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-2-col">
          <Field label="İl">
            <input required maxLength={100} value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="İlçe">
            <input required maxLength={100} value={form.district} onChange={(e) => update("district", e.target.value)} />
          </Field>
        </div>
        <Field label="Açık Adres">
          <input required maxLength={500} value={form.address} onChange={(e) => update("address", e.target.value)} />
        </Field>
        <Field label="Logo Adresi (isteğe bağlı)">
          <input
            type="url"
            maxLength={2048}
            placeholder="https://…"
            value={form.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
          />
        </Field>
        <Notice kind="error">{error}</Notice>
        <div className="live-row end">
          <Button type="submit" disabled={busy}>
            <Save size={15} /> {busy ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function DuesTab({ onNotify }) {
  const settings = useLoad(getSiteSettings, []);
  const [form, setForm] = useState(null);
  const save = useAction();
  const rate = useAction();
  const [rateForm, setRateForm] = useState({
    monthlyRate: "",
    effectiveFrom: localToday(),
    decisionDate: localToday(),
    decisionNo: "",
    reason: "",
  });

  useEffect(() => {
    if (settings.data) {
      const { toleranceDays, minAdvanceInstallmentAmount, defaultDuesDebtorRule } = settings.data;
      setForm({ toleranceDays, minAdvanceInstallmentAmount, defaultDuesDebtorRule });
    }
  }, [settings.data]);

  if (settings.error) return <Notice kind="error">{settings.error}</Notice>;
  if (!form) return <Loading />;

  const submitSettings = (e) => {
    e.preventDefault();
    save.run(async () => {
      await updateSiteSettings({
        toleranceDays: Number(form.toleranceDays),
        minAdvanceInstallmentAmount: Number(form.minAdvanceInstallmentAmount),
        defaultDuesDebtorRule: form.defaultDuesDebtorRule,
      });
      onNotify?.("Aidat politikası kaydedildi.");
      settings.reload();
    });
  };

  const submitRate = (e) => {
    e.preventDefault();
    rate.run(async () => {
      await changeLateFeeRate({ ...rateForm, monthlyRate: Number(rateForm.monthlyRate) });
      onNotify?.(`Gecikme faizi ${dateOnly(rateForm.effectiveFrom)} itibarıyla %${rateForm.monthlyRate} olarak kaydedildi.`);
      setRateForm((prev) => ({ ...prev, monthlyRate: "", decisionNo: "", reason: "" }));
      settings.reload();
    });
  };

  const s = settings.data;
  return (
    <div className="live-stack">
      <Panel title="Aidat Politikası" subtitle="Ödeme toleransı ve avans taksit alt sınırları.">
        <form onSubmit={submitSettings} className="settings-grid">
          <div className="grid-2-col">
            <Field label="Tolerans Günü (0–30)">
              <input
                type="number"
                min="0"
                max="30"
                required
                value={form.toleranceDays}
                onChange={(e) => setForm({ ...form, toleranceDays: e.target.value })}
              />
            </Field>
            <Field label="Avans Taksit Alt Sınırı (₺)">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.minAdvanceInstallmentAmount}
                onChange={(e) => setForm({ ...form, minAdvanceInstallmentAmount: e.target.value })}
              />
            </Field>
          </div>
          <Notice kind="error">{save.error}</Notice>
          <div className="live-row end">
            <Button type="submit" disabled={save.busy}>
              <Save size={15} /> {save.busy ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Gecikme Faizi"
        subtitle="Kat Mülkiyeti Kanunu'na göre aylık en fazla %5. Değişiklik yönetim kurulu kararıyla yapılır ve geçmiş bir güne uygulanamaz."
      >
        <form onSubmit={submitRate} className="settings-grid">
          <div className="live-row" style={{ marginBottom: "4px" }}>
            <span className="live-chip gold" style={{ padding: "4px 10px", fontSize: "12px", gap: "6px" }}>
              <Percent size={13} /> Bugün geçerli: %{s.monthlyLateFeeRate}
            </span>
            {s.scheduledLateFeeRate != null && (
              <span className="live-chip warn" style={{ padding: "4px 10px", fontSize: "12px", gap: "6px" }}>
                {dateOnly(s.scheduledRateEffectiveFrom)} itibarıyla: %{s.scheduledLateFeeRate}
              </span>
            )}
          </div>
          <div className="grid-3-col">
            <Field label="Yeni Aylık Oran (%)">
              <input
                type="number"
                min="0"
                max="5"
                step="0.01"
                required
                value={rateForm.monthlyRate}
                onChange={(e) => setRateForm({ ...rateForm, monthlyRate: e.target.value })}
              />
            </Field>
            <Field label="Yürürlük Tarihi">
              <input
                type="date"
                min={localToday()}
                required
                value={rateForm.effectiveFrom}
                onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
              />
            </Field>
            <Field label="Karar Tarihi">
              <input
                type="date"
                max={localToday()}
                required
                value={rateForm.decisionDate}
                onChange={(e) => setRateForm({ ...rateForm, decisionDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid-2-col">
            <Field label="Karar No">
              <input
                required
                maxLength={50}
                value={rateForm.decisionNo}
                onChange={(e) => setRateForm({ ...rateForm, decisionNo: e.target.value })}
              />
            </Field>
            <Field label="Gerekçe">
              <input
                required
                maxLength={500}
                value={rateForm.reason}
                onChange={(e) => setRateForm({ ...rateForm, reason: e.target.value })}
              />
            </Field>
          </div>
          <Notice kind="error">{rate.error}</Notice>
          <div className="live-row end">
            <Button type="submit" disabled={rate.busy}>
              <Save size={15} /> {rate.busy ? "Kaydediliyor…" : "Oranı Değiştir"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function minutesLeft(until) {
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 60000));
}

function ModulesTab({ onNotify }) {
  const modules = useLoad(listSiteModules, []);
  const { busy, error, run } = useAction();
  // Geri sayımın ekranda güncel kalması için periyodik yeniden çizim.
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const toggle = (module, active) =>
    run(async () => {
      const result = await setSiteModule(module.code, active);
      onNotify?.(
        active
          ? `${module.name} modülü açık.`
          : result.scheduledDeactivationAt
          ? `${module.name} modülü ${dateTime(result.scheduledDeactivationAt)} itibarıyla kapanacak (10 dk).`
          : `${module.name} modülü kapatıldı.`,
      );
      modules.reload();
    });

  if (modules.error) return <Notice kind="error">{modules.error}</Notice>;
  if (!modules.data) return <Loading />;

  return (
    <Panel
      title="Site Modülleri"
      subtitle="Zorunlu modüller her sitede açıktır. İsteğe bağlı bir modülü kapattığınızda modül 10 dakika daha açık kalır; bu sürede vazgeçebilirsiniz. Menüdeki değişiklik kullanıcılar siteyi yeniden seçtiğinde yansır."
    >
      <div className="live-modules-list">
        <Notice kind="error">{error}</Notice>
        {modules.data.map((m) => {
          const scheduled = Boolean(m.active && m.scheduledDeactivationAt);
          // Planlı kapanışta "aç" isteği vazgeçmektir; aksi halde mevcut durumun tersi istenir.
          const target = scheduled || !m.active;
          return (
            <div className="live-module-row" key={m.code}>
              <div>
                <strong>{m.name}</strong>
                <div className="live-row mt-1">
                  {m.mandatory && <span className="live-chip">Zorunlu</span>}
                  {!m.available && <span className="live-chip off">Kullanıma kapalı</span>}
                  {m.active ? (
                    <span className="live-chip ok">Açık</span>
                  ) : (
                    <span className="live-chip off">Kapalı</span>
                  )}
                  {scheduled && (
                    <span className="live-chip warn">
                      {minutesLeft(m.scheduledDeactivationAt)} dk sonra kapanacak
                    </span>
                  )}
                </div>
              </div>
              {!m.mandatory && m.available && (
                <Button secondary={m.active && !scheduled} disabled={busy} onClick={() => toggle(m, target)}>
                  {scheduled ? "Kapatmaktan Vazgeç" : m.active ? "Kapat" : "Aç"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
