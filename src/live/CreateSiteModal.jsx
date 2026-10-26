import { useState } from "react";
import { Building2, Plus, Save } from "lucide-react";
import { Button, Field, Modal } from "../prototype/UI";
import { createSite } from "../api/kovan";
import { errorMessage } from "../api/client";
import { Notice } from "./common";
import { SITE_TYPES } from "./labels";

/**
 * Giriş yapmış kullanıcının yeni bir site/apartman açması için kullanılan modal.
 * Endpoint: POST /sites (Bearer token ile)
 * Logo adresi: Yalnız http(s) kabul edilir.
 * Açıldıktan sonra otomatik olarak yeni siteye geçilir (/auth/switch-site).
 */
export default function CreateSiteModal({ onClose, onCreated, onNotify }) {
  const [form, setForm] = useState({
    name: "",
    type: "APARTMAN",
    city: "",
    district: "",
    address: "",
    logoUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanLogo = form.logoUrl.trim();
    if (cleanLogo && !/^https?:\/\//i.test(cleanLogo)) {
      setError("Logo adresi 'http://' veya 'https://' protokolüyle başlamalıdır.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const created = await createSite({
        name: form.name.trim(),
        type: form.type,
        city: form.city.trim(),
        district: form.district.trim(),
        address: form.address.trim(),
        logoUrl: cleanLogo || null,
      });
      onNotify?.(`${form.name.trim()} sitesi başarıyla oluşturuldu ve çalışma alanına geçildi.`);
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Yeni Site Oluştur"
      description="Yöneteceğiniz veya sakin olacağınız yeni bir site veya apartman açın."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="settings-grid">
        <div className="grid-2-col">
          <Field label="Site / Apartman Adı">
            <input
              required
              maxLength={150}
              placeholder="Örn: Güneş Sitesi veya Palmiye Apt."
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
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
            <input
              required
              maxLength={100}
              placeholder="Örn: İstanbul"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field label="İlçe">
            <input
              required
              maxLength={100}
              placeholder="Örn: Kadıköy"
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Açık Adres">
          <input
            required
            maxLength={500}
            placeholder="Mahalle, cadde, sokak ve kapı no bilgileri…"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>

        <Field label="Logo Adresi (isteğe bağlı)">
          <input
            type="url"
            maxLength={2048}
            placeholder="https://… (yalnızca http veya https)"
            value={form.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
          />
        </Field>

        <Notice kind="error">{error}</Notice>

        <div className="live-row end">
          <Button secondary type="button" onClick={onClose} disabled={busy}>
            İptal
          </Button>
          <Button type="submit" disabled={busy}>
            <Save size={15} /> {busy ? "Oluşturuluyor…" : "Siteyi Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
