import { useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Field, Modal } from "./UI";
import { dateLabel } from "./data";

export function NewAnnouncementModal({ onClose, onSubmit, auth }) {
  const isBlockManagerOnly =
    auth?.roles?.includes("BLOK_SORUMLUSU") &&
    !auth?.roles?.some((r) => ["SITE_YONETICISI", "YONETIM_KURULU", "SYSTEM_ADMIN"].includes(r));

  const currentWorkspace = auth?.workspaces?.find((w) => w.siteId === auth?.siteId);
  const assignedBlock = currentWorkspace?.blockName || auth?.blockName || "A Blok";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Genel");
  const [targetAudience, setTargetAudience] = useState(
    isBlockManagerOnly ? `${assignedBlock} Sakinleri` : "Tüm Sakinler",
  );
  const [body, setBody] = useState("");
  const [notifyResidents, setNotifyResidents] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    onSubmit({
      id: "ann_" + Date.now(),
      title: title.trim(),
      category,
      targetAudience: isBlockManagerOnly ? `${assignedBlock} Sakinleri` : targetAudience,
      body: body.trim(),
      date: new Date().toISOString().split("T")[0],
      notifyResidents,
    });
  };

  return (
    <Modal title="Yeni Duyuru Yayınla" onClose={onClose}>
      <form onSubmit={handleSubmit} className="new-announcement-form">
        <p
          className="modal-lead"
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          Sitede ikamet eden sakinler ve kat maliklerine anında iletilecek yeni bir duyuru oluşturun.
        </p>

        <Field label="Duyuru Başlığı" required>
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Asansör Periyodik Bakım Çalışması"
          />
        </Field>

        <div
          className="form-grid-2"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            margin: "12px 0",
          }}
        >
          <Field label="Kategori">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "13px",
              }}
            >
              <option value="Genel">Genel Bilgilendirme</option>
              <option value="Bakım & Onarım">Bakım & Onarım</option>
              <option value="Toplantı & Genel Kurul">Toplantı & Genel Kurul</option>
              <option value="Güvenlik & Düzen">Güvenlik & Düzen</option>
              <option value="Mali & Aidat">Mali & Aidat</option>
            </select>
          </Field>

          <Field label="Hedef Kitle">
            {isBlockManagerOnly ? (
              <>
                <select
                  value={`${assignedBlock} Sakinleri`}
                  disabled
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    opacity: 0.9,
                  }}
                >
                  <option value={`${assignedBlock} Sakinleri`}>{`${assignedBlock} Sakinleri`}</option>
                </select>
                <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  ℹ️ Blok Sorumlusu yetkiniz gereği yalnızca {assignedBlock} sakinlerine duyuru yayınlayabilirsiniz.
                </small>
              </>
            ) : (
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
              >
                <option value="Tüm Sakinler">Tüm Sakinler (Kiracı & Malik)</option>
                <option value="Sadece Kat Malikleri">Sadece Kat Malikleri</option>
                <option value="A Blok Sakinleri">A Blok Sakinleri</option>
                <option value="B Blok Sakinleri">B Blok Sakinleri</option>
              </select>
            )}
          </Field>
        </div>

        <Field label="Duyuru Metni" required>
          <textarea
            rows={5}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Duyuru detaylarını, tarih, saat ve uyulması gereken hususları buraya yazınız..."
            style={{ resize: "vertical", minHeight: "100px" }}
          />
        </Field>

        <div
          className="announcement-notify-checkbox"
          style={{
            margin: "14px 0 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="checkbox"
            id="notifyResidents"
            checked={notifyResidents}
            onChange={(e) => setNotifyResidents(e.target.checked)}
            style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
          />
          <label
            htmlFor="notifyResidents"
            style={{
              fontSize: "12px",
              color: "var(--ink)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Sakinlere anlık bildirim (push) ve e-posta ile ilet
          </label>
        </div>

        <div
          className="modal-actions"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <Button secondary type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit">
            <Megaphone size={15} style={{ marginRight: "6px" }} />
            <span>Duyuruyu Yayınla</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Announcements({
  announcements = [],
  manager = false,
  auth,
  onAddAnnouncement,
  onDeleteAnnouncement,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const categories = [
    "ALL",
    ...new Set(announcements.map((a) => a.category).filter(Boolean)),
  ];

  const filtered =
    selectedCategory === "ALL"
      ? announcements
      : announcements.filter((a) => a.category === selectedCategory);

  return (
    <div className="announcements-page">
      {/* Header with Title & Manager Action */}
      <div className="announcements-header-bar">
        <div className="announcements-title-group">
          <h1 className="announcements-page-title">Duyurular ve Bilgilendirmeler</h1>
          <p className="announcements-page-sub">
            {manager
              ? "Sakinler ve kat malikleri için duyuru oluşturun, toplantı ve bakım bildirimlerini yönetin."
              : "Site yönetimi tarafından paylaşılan güncel duyuru ve bilgilendirmeler."}
          </p>
        </div>

        {manager && (
          <Button
            type="button"
            className="new-announcement-btn"
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} />
            <span>Yeni Duyuru Ekle</span>
          </Button>
        )}
      </div>

      {/* Category Filter Pills (if multiple categories exist) */}
      {categories.length > 2 && (
        <div
          className="announcement-filter-tabs"
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "4px",
            marginBottom: "8px",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                background:
                  selectedCategory === cat
                    ? "var(--accent)"
                    : "var(--surface)",
                color: selectedCategory === cat ? "#fff" : "var(--ink)",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {cat === "ALL" ? "Tüm Duyurular" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Announcements List */}
      {filtered.length === 0 ? (
        <div className="empty-announcements-state">
          <Megaphone
            size={42}
            style={{
              opacity: 0.35,
              margin: "0 auto 12px",
              color: "var(--accent)",
            }}
          />
          <h3>Henüz Duyuru Bulunmuyor</h3>
          <p>Bu kategoride yayınlanmış aktif bir duyuru bulunmamaktadır.</p>
          {manager && (
            <div style={{ marginTop: "16px" }}>
              <Button type="button" onClick={() => setShowModal(true)}>
                <Plus size={16} />
                <span>İlk Duyuruyu Oluştur</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="announcements-list"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {filtered.map((a) => {
            const dateObj = new Date(`${a.date}T12:00:00`);
            const dayNum = !isNaN(dateObj.getTime())
              ? dateObj.getDate()
              : "—";
            const monthStr = !isNaN(dateObj.getTime())
              ? dateObj
                  .toLocaleDateString("tr-TR", { month: "short" })
                  .toLocaleUpperCase("tr-TR")
              : "";

            return (
              <article className="full-announcement" key={a.id}>
                <span className="announcement-date">
                  <strong>{dayNum}</strong>
                  <span>{monthStr}</span>
                </span>

                <div className="announcement-content" style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="announcement-badges"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="gold-label">{a.category || "Genel"}</span>
                    {a.targetAudience && (
                      <span className="announcement-audience-badge">
                        {a.targetAudience}
                      </span>
                    )}
                  </div>

                  <h2>{a.title}</h2>
                  <p>{a.body}</p>

                  <footer>
                    <span>Kovan Site Yönetimi</span>
                    <span>{dateLabel(a.date)}</span>
                    {manager && (
                      <button
                        type="button"
                        className="announcement-delete-btn"
                        title="Duyuruyu yayından kaldır"
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${a.title}" duyurusunu silmek istediğinize emin misiniz?`
                            )
                          ) {
                            onDeleteAnnouncement?.(a.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Duyuruyu Sil</span>
                      </button>
                    )}
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewAnnouncementModal
          auth={auth}
          onClose={() => setShowModal(false)}
          onSubmit={(newAnn) => {
            onAddAnnouncement?.(newAnn);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
