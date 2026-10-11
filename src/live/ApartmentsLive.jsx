import { useCallback, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button, Empty, Field, Modal, Panel } from "../prototype/UI";
import {
  approveJoin,
  assignResident,
  can,
  createBlock,
  createUnit,
  issueUnitLink,
  listApprovals,
  listBlocks,
  listMembers,
  listUnits,
  rejectJoin,
} from "../api/kovan";
import { errorMessage } from "../api/client";
import { Loading, Notice } from "./common";
import { copyText, useAction, useLoad } from "./hooks";
import { AREA_TYPES, MEMBERSHIP_TYPE_LABELS, dateTime, fullName, label } from "./labels";

export default function ApartmentsLive({ auth, onNotify }) {
  const canInvite = can(auth, "KULLANICI.DAVET");
  const canSeeMembers = can(auth, "KULLANICI.SAKIN_LISTE");

  const blocks = useLoad(listBlocks, []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const blockId = selectedBlockId || blocks.data?.[0]?.id || null;
  const selectedBlock = blocks.data?.find((b) => b.id === blockId);

  const units = useLoad(() => (blockId ? listUnits(blockId) : Promise.resolve([])), [blockId]);
  const members = useLoad(() => (canSeeMembers ? listMembers() : Promise.resolve([])), [canSeeMembers]);
  const approvals = useLoad(() => (canInvite ? listApprovals() : Promise.resolve([])), [canInvite]);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { type: 'block' } | { type: 'units' } | { type: 'unit', unit }
  const closeModal = useCallback(() => setModal(null), []);

  const residentsByUnit = useMemo(() => {
    const map = new Map();
    (members.data || []).forEach((m) => {
      if (!m.unitId) return;
      map.set(m.unitId, [...(map.get(m.unitId) || []), m]);
    });
    return map;
  }, [members.data]);

  const visibleUnits = (units.data || []).filter((u) => {
    const residents = residentsByUnit.get(u.id) || [];
    const haystack = `${u.unitNo} ${residents.map(fullName).join(" ")}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(search.toLocaleLowerCase("tr-TR"));
  });
  const floors = [...new Set(visibleUnits.map((u) => u.floor ?? 0))].sort((a, b) => b - a);
  const occupied = (units.data || []).filter((u) => residentsByUnit.has(u.id)).length;

  const refreshAll = () => {
    blocks.reload();
    units.reload();
    members.reload();
    approvals.reload();
  };

  if (blocks.loading && !blocks.data) return <Loading />;

  return (
    <>
      <div className="module-actions">
        <div>
          <p>Blok, kat ve daire yapısını yönetin; dairelere kat maliki ve kiracı atayın ya da davet gönderin.</p>
          {selectedBlock && (
            <span className="muted">
              {selectedBlock.name}: {units.data?.length || 0} daire · {occupied} dolu ·{" "}
              {(units.data?.length || 0) - occupied} boş
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button secondary onClick={refreshAll}>
            <RefreshCw size={15} /> Yenile
          </Button>
          <Button secondary onClick={() => setModal({ type: "block" })}>
            <Plus size={15} /> Yeni Blok
          </Button>
          <Button disabled={!selectedBlock} onClick={() => setModal({ type: "units" })}>
            <Plus size={16} /> Daire Ekle
          </Button>
        </div>
      </div>

      <Notice kind="error">{blocks.error || units.error || members.error}</Notice>

      {canInvite && approvals.data?.length > 0 && (
        <ApprovalsPanel approvals={approvals.data} onChanged={refreshAll} onNotify={onNotify} />
      )}

      {!blocks.data?.length ? (
        <Panel title="Henüz blok tanımlanmadı" subtitle="İlk bloğunuzu ekleyerek başlayın.">
          <Button onClick={() => setModal({ type: "block" })}>
            <Plus size={15} /> Blok Ekle
          </Button>
        </Panel>
      ) : (
        <>
          <div className="block-tabs">
            {blocks.data.map((b) => (
              <button key={b.id} className={blockId === b.id ? "selected" : ""} onClick={() => setSelectedBlockId(b.id)}>
                <Building2 size={24} />
                <div>
                  <strong>{b.name}</strong>
                  <span>{b.floorCount ? `${b.floorCount} kat` : "Kat sayısı girilmedi"}</span>
                </div>
              </button>
            ))}
            <button className="add-block-tab-btn" onClick={() => setModal({ type: "block" })} title="Yeni blok ekle">
              <Plus size={20} />
              <span>Yeni Blok Tanımla</span>
            </button>
          </div>

          <Panel
            title={`${selectedBlock?.name || ""} · Kat Planı & Daireler`}
            subtitle="Daire kartına tıklayarak sakinleri görün, kat maliki/kiracı atayın veya davet bağlantısı oluşturun."
            action={
              <label className="search-box">
                <Search size={16} />
                <input
                  aria-label="Daire veya sakin ara"
                  placeholder="Daire no veya sakin ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            }
          >
            {units.loading && !units.data ? (
              <Loading />
            ) : (
              <div className="floor-list">
                {floors.map((f) => (
                  <section className="floor" key={f}>
                    <div className="floor-number">
                      <strong>{String(f).padStart(2, "0")}</strong>
                      <span>KAT</span>
                    </div>
                    <div className="unit-grid">
                      {visibleUnits
                        .filter((u) => (u.floor ?? 0) === f)
                        .map((u) => {
                          const residents = residentsByUnit.get(u.id) || [];
                          return (
                            <div
                              key={u.id}
                              className={`unit-card ${residents.length ? "" : "vacant"} ${u.areaType === "ISYERI" ? "commercial-unit" : ""}`}
                              onClick={() => setModal({ type: "unit", unit: u })}
                            >
                              <div className="unit-card-header">
                                <div>
                                  <strong>{u.unitNo}</strong>
                                  <span className="unit-type-pill">
                                    {label(AREA_TYPES, u.areaType)}
                                    {u.unitType ? ` · ${u.unitType}` : ""}
                                    {u.grossM2 ? ` · ${u.grossM2} m²` : ""}
                                    {u.landShare ? ` · Arsa: ${u.landShare}` : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="live-unit-residents">
                                {residents.length ? (
                                  residents.map((r) => (
                                    <span key={r.membershipId}>
                                      {fullName(r)} <small>({MEMBERSHIP_TYPE_LABELS[r.membershipType]})</small>
                                    </span>
                                  ))
                                ) : (
                                  <span>Boş daire</span>
                                )}
                              </div>
                              <footer className="unit-card-footer">
                                <div className="flex items-center gap-1.5">
                                  <span className="status-dot" />
                                  <span>{residents.length ? "Sakin atandı" : "Sakin atanmadı"}</span>
                                </div>
                              </footer>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ))}
                {!visibleUnits.length && (
                  <Empty text={units.data?.length ? "Aramaya uygun daire yok." : "Bu blokta henüz daire yok. 'Daire Ekle' ile ekleyin."} />
                )}
              </div>
            )}
          </Panel>
        </>
      )}

      {modal?.type === "block" && (
        <BlockModal
          onClose={closeModal}
          onCreated={(block) => {
            closeModal();
            blocks.reload();
            setSelectedBlockId(block.id);
            onNotify?.(`${block.name} eklendi.`);
          }}
        />
      )}
      {modal?.type === "units" && selectedBlock && (
        <UnitsModal
          block={selectedBlock}
          existing={units.data || []}
          onClose={closeModal}
          onDone={(count) => {
            closeModal();
            units.reload();
            onNotify?.(`${selectedBlock.name} için ${count} daire eklendi.`);
          }}
        />
      )}
      {modal?.type === "unit" && (
        <UnitModal
          unit={modal.unit}
          block={selectedBlock}
          residents={residentsByUnit.get(modal.unit.id) || []}
          canInvite={canInvite}
          onClose={closeModal}
          onChanged={() => members.reload()}
          onNotify={onNotify}
        />
      )}
    </>
  );
}

function ApprovalsPanel({ approvals, onChanged, onNotify }) {
  const { busy, error, run } = useAction();
  const decide = (use, approve) =>
    run(async () => {
      await (approve ? approveJoin(use.useId) : rejectJoin(use.useId));
      onNotify?.(`${fullName(use)} başvurusu ${approve ? "onaylandı" : "reddedildi"}.`);
      onChanged();
    });

  return (
    <Panel title="Onay bekleyen daire başvuruları" subtitle="Daire bağlantısıyla gelen başvurular siz onaylayınca aktifleşir.">
      <Notice kind="error">{error}</Notice>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Kişi</th>
              <th>Daire</th>
              <th>Başvuru</th>
              <th>Tarih</th>
              <th className="align-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.useId}>
                <td>
                  <strong>{fullName(a)}</strong>
                  <small>{a.email}</small>
                </td>
                <td>
                  {a.blockName} · {a.unitNo}
                </td>
                <td>{MEMBERSHIP_TYPE_LABELS[a.requestedMembershipType]}</td>
                <td>{dateTime(a.requestedAt)}</td>
                <td className="align-right">
                  <div className="live-row end">
                    <Button disabled={busy} onClick={() => decide(a, true)}>
                      <UserCheck size={14} /> Onayla
                    </Button>
                    <Button secondary disabled={busy} onClick={() => decide(a, false)}>
                      <UserX size={14} /> Reddet
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function BlockModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [floorCount, setFloorCount] = useState("");
  const { busy, error, run } = useAction();

  const submit = (e) => {
    e.preventDefault();
    run(async () => onCreated(await createBlock(name.trim(), floorCount ? Number(floorCount) : null)));
  };

  return (
    <Modal title="Yeni Blok" description="Bloğu ekledikten sonra dairelerini tanımlayabilirsiniz." onClose={onClose}>
      <form onSubmit={submit} className="auth-form-flow">
        <div className="grid-2-col">
          <Field label="Blok Adı">
            <input required autoFocus placeholder="Örn: C Blok" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Kat Sayısı (isteğe bağlı)">
            <input type="number" min="1" max="100" value={floorCount} onChange={(e) => setFloorCount(e.target.value)} />
          </Field>
        </div>
        <Notice kind="error">{error}</Notice>
        <div className="modal-footer">
          <Button secondary type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Ekleniyor…" : "Bloğu Ekle"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function generateUnitNos(fromFloor, toFloor, perFloor, pattern, prefix, startNumber) {
  const list = [];
  let count = startNumber;
  for (let floor = fromFloor; floor <= toFloor; floor++) {
    for (let order = 1; order <= perFloor; order++) {
      const unitNo =
        pattern === "floor" ? `${floor}${String(order).padStart(2, "0")}` : pattern === "prefix" ? `${prefix}-${count}` : `${count}`;
      list.push({ unitNo, floor });
      count++;
    }
  }
  return list;
}

function UnitsModal({ block, existing, onClose, onDone }) {
  const [mode, setMode] = useState("single");
  const [single, setSingle] = useState({ unitNo: "", floor: "", areaType: "KONUT", grossM2: "", landShare: "", unitType: "" });
  const prefix = block.name.replace(/blok/i, "").trim() || "A";
  const nextNumber = existing.length + 1;
  const [bulk, setBulk] = useState({ fromFloor: 1, toFloor: block.floorCount || 1, perFloor: 4, pattern: "prefix" });
  const [progress, setProgress] = useState(null);
  const { busy, error, setError, run } = useAction();

  const planned =
    mode === "bulk" ? generateUnitNos(Number(bulk.fromFloor), Number(bulk.toFloor), Number(bulk.perFloor), bulk.pattern, prefix, nextNumber) : [];
  const existingNos = new Set(existing.map((u) => u.unitNo));

  const submit = (e) => {
    e.preventDefault();
    if (mode === "single") {
      run(async () => {
        await createUnit(block.id, {
          unitNo: single.unitNo.trim(),
          floor: single.floor === "" ? null : Number(single.floor),
          areaType: single.areaType,
          grossM2: single.grossM2 === "" ? null : Number(single.grossM2),
          landShare: single.landShare === "" ? null : Number(single.landShare),
          unitType: single.unitType.trim() || null,
        });
        onDone(1);
      });
      return;
    }
    const toCreate = planned.filter((p) => !existingNos.has(p.unitNo));
    if (!toCreate.length) {
      setError("Oluşturulacak yeni daire yok; bu numaraların hepsi blokta zaten var.");
      return;
    }
    if (toCreate.length > 300) {
      setError("Tek seferde en fazla 300 daire eklenebilir.");
      return;
    }
    run(async () => {
      let created = 0;
      const failures = [];
      for (const [index, unit] of toCreate.entries()) {
        setProgress({ done: index, total: toCreate.length });
        try {
          await createUnit(block.id, { unitNo: unit.unitNo, floor: unit.floor, areaType: "KONUT" });
          created++;
        } catch (err) {
          failures.push(`${unit.unitNo}: ${errorMessage(err)}`);
        }
      }
      setProgress(null);
      if (failures.length) {
        setError(`${created} daire eklendi; ${failures.length} daire eklenemedi. ${failures.slice(0, 3).join(" · ")}`);
        return;
      }
      onDone(created);
    });
  };

  return (
    <Modal title={`${block.name} · Daire Ekle`} description="Tek tek ya da kat aralığı vererek toplu daire ekleyin." onClose={onClose}>
      <form onSubmit={submit} className="auth-form-flow">
        <div className="source-toggle-tabs mb-3">
          <button type="button" className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
            Tek Daire
          </button>
          <button type="button" className={mode === "bulk" ? "active" : ""} onClick={() => setMode("bulk")}>
            Toplu Ekle
          </button>
        </div>

        {mode === "single" ? (
          <>
            <div className="grid-3-col">
              <Field label="Daire No">
                <input required value={single.unitNo} onChange={(e) => setSingle({ ...single, unitNo: e.target.value })} />
              </Field>
              <Field label="Kat">
                <input type="number" value={single.floor} onChange={(e) => setSingle({ ...single, floor: e.target.value })} />
              </Field>
              <Field label="Kullanım">
                <select value={single.areaType} onChange={(e) => setSingle({ ...single, areaType: e.target.value })}>
                  {AREA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid-3-col">
              <Field label="Brüt m² (isteğe bağlı)">
                <input type="number" min="0" step="0.01" value={single.grossM2} onChange={(e) => setSingle({ ...single, grossM2: e.target.value })} />
              </Field>
              <Field label="Arsa Payı (isteğe bağlı)">
                <input type="number" min="0" step="0.0001" value={single.landShare} onChange={(e) => setSingle({ ...single, landShare: e.target.value })} />
              </Field>
              <Field label="Daire Tipi (örn. 2+1)">
                <input value={single.unitType} onChange={(e) => setSingle({ ...single, unitType: e.target.value })} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="grid-3-col">
              <Field label="Başlangıç Katı">
                <input type="number" required value={bulk.fromFloor} onChange={(e) => setBulk({ ...bulk, fromFloor: e.target.value })} />
              </Field>
              <Field label="Bitiş Katı">
                <input type="number" required value={bulk.toFloor} onChange={(e) => setBulk({ ...bulk, toFloor: e.target.value })} />
              </Field>
              <Field label="Katta Daire">
                <input type="number" min="1" max="20" required value={bulk.perFloor} onChange={(e) => setBulk({ ...bulk, perFloor: e.target.value })} />
              </Field>
            </div>
            <Field label="Numaralandırma">
              <select value={bulk.pattern} onChange={(e) => setBulk({ ...bulk, pattern: e.target.value })}>
                <option value="prefix">Blok önekli ({prefix}-{nextNumber}, {prefix}-{nextNumber + 1}…)</option>
                <option value="floor">Kat bazlı (101, 102, 201…)</option>
                <option value="simple">Düz sıralı ({nextNumber}, {nextNumber + 1}…)</option>
              </select>
            </Field>
            <p className="live-muted">
              {planned.length} daire planlandı
              {planned.length ? `: ${planned.slice(0, 6).map((p) => p.unitNo).join(", ")}${planned.length > 6 ? "…" : ""}` : ""}.
              Blokta zaten olan numaralar atlanır.
            </p>
          </>
        )}

        {progress && (
          <div className="live-progress">
            <i style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          </div>
        )}
        <Notice kind="error">{error}</Notice>
        <div className="modal-footer">
          <Button secondary type="button" onClick={onClose} disabled={busy}>
            Kapat
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Ekleniyor…" : mode === "single" ? "Daireyi Ekle" : `${planned.length} Daireyi Ekle`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UnitModal({ unit, block, residents, canInvite, onClose, onChanged, onNotify }) {
  const [email, setEmail] = useState("");
  const [type, setType] = useState(residents.some((r) => r.membershipType === "MALIK") ? "KIRACI" : "MALIK");
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const assign = useAction();
  const linkAction = useAction();

  const submitAssign = (e) => {
    e.preventDefault();
    assign.run(async () => {
      const result = await assignResident(unit.id, email, type);
      onNotify?.(
        result.result === "ASSIGNED"
          ? `${email} bu daireye ${MEMBERSHIP_TYPE_LABELS[type]} olarak eklendi.`
          : `${email} adresine davet e-postası gönderildi; kabul edince daireye eklenecek.`,
      );
      setEmail("");
      onChanged();
    });
  };

  const createLink = () =>
    linkAction.run(async () => {
      setLink(await issueUnitLink(unit.id));
      setCopied(false);
    });

  return (
    <Modal
      title={`${block?.name || ""} · Daire ${unit.unitNo}`}
      description={[
        unit.floor != null ? `${unit.floor}. kat` : null,
        label(AREA_TYPES, unit.areaType),
        unit.unitType,
        unit.grossM2 ? `${unit.grossM2} m²` : null,
        unit.landShare ? `Arsa Payı: ${unit.landShare}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      onClose={onClose}
    >
      <div className="auth-form-flow">
        <h4>Dairedeki sakinler</h4>
        {residents.length ? (
          <div className="live-site-list">
            {residents.map((r) => (
              <div key={r.membershipId} className="live-site-item" style={{ cursor: "default" }}>
                <span>
                  <strong>{fullName(r)}</strong>
                  <br />
                  <small className="live-muted">{r.email}</small>
                </span>
                <span className="live-chip gold">{MEMBERSHIP_TYPE_LABELS[r.membershipType]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="live-muted">Bu dairede henüz kayıtlı sakin yok.</p>
        )}

        {canInvite && (
          <>
            <h4 className="mt-3">Kat maliki / kiracı ekle</h4>
            <p className="live-muted">Kişinin Kovan hesabı varsa hemen eklenir; yoksa e-postasına 7 gün geçerli davet gider.</p>
            <form onSubmit={submitAssign} className="grid-3-col">
              <Field label="E-posta">
                <div className="input-with-icon">
                  <Mail size={16} className="field-icon" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </Field>
              <Field label="Üyelik">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="MALIK">Kat Maliki</option>
                  <option value="KIRACI">Kiracı</option>
                </select>
              </Field>
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <Button type="submit" disabled={assign.busy} style={{ height: "41px", minHeight: "41px", width: "100%" }}>
                  {assign.busy ? "Gönderiliyor…" : "Ekle / Davet Et"}
                </Button>
              </div>
            </form>
            <Notice kind="error">{assign.error}</Notice>

            <h4 className="mt-3">Daire bağlantısı</h4>
            <p className="live-muted">
              E-posta bilmiyorsanız daireye özel bağlantı oluşturup paylaşın. Bağlantıyla kaydolan kişi sizin onayınızdan
              sonra daireye eklenir. Yeni bağlantı eskisini geçersiz kılar.
            </p>
            {link ? (
              <>
                <div className="live-link-box">
                  <code>{link.link}</code>
                  <Button
                    secondary
                    type="button"
                    onClick={async () => setCopied(await copyText(link.link))}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Kopyalandı" : "Kopyala"}
                  </Button>
                </div>
                <p className="live-muted">Son geçerlilik: {dateTime(link.expiresAt)}. Bağlantı yalnızca şimdi gösterilir.</p>
              </>
            ) : (
              <Button secondary type="button" disabled={linkAction.busy} onClick={createLink}>
                <Link2 size={14} /> {linkAction.busy ? "Oluşturuluyor…" : "Daire Bağlantısı Oluştur"}
              </Button>
            )}
            <Notice kind="error">{linkAction.error}</Notice>
          </>
        )}

        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
