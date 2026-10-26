import { useState } from "react";
import {
  CreditCard,
  Plus,
  Layers,
  Search,
  ArrowUpRight,
  Check,
  Download,
} from "lucide-react";
import { Badge, Button, Empty, Field, Modal, Panel } from "./UI";
import { dateLabel, money, monthLabel, PERIOD, uid, APARTMENT_TYPES } from "./data";
export default function Payments({
  dues,
  units,
  residentName,
  manager,
  onPay,
  onAccrue,
  onReview,
  notify,
}) {
  const [filter, setFilter] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const filtered = dues
    .filter(
      (d) =>
        (filter === "Tümü" || d.status === filter) &&
        `${d.unitId} ${residentName(d.unitId)} ${monthLabel(d.period)} ${d.title}`
          .toLocaleLowerCase("tr-TR")
          .includes(search.toLocaleLowerCase("tr-TR")),
    )
    .sort((a, b) => b.period.localeCompare(a.period));
  const exportCSV = () => {
    const content =
      "\uFEFF" +
      [
        "Daire;Sakin;Dönem;Açıklama;Tutar;Durum",
        ...filtered.map((d) =>
          [
            d.unitId,
            residentName(d.unitId),
            monthLabel(d.period),
            d.title,
            d.amount,
            d.status,
          ]
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(";"),
        ),
      ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "kovan-aidatlar.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Aidat listesi indirildi.");
  };
  return (
    <>
      <div className="module-actions">
        <p>
          {manager
            ? "Aidatları ve ödeme bildirimlerini tek yerden yönetin."
            : "Aidatlarınızı takip edin, ödemelerinizi kolayca tamamlayın."}
        </p>
        <div className="button-group">
          {manager && (
            <>
              <Button secondary onClick={() => setModal({ type: "single" })}>
                <Plus size={16} />
                Borç Ekle
              </Button>
              <Button onClick={() => setModal({ type: "bulk" })}>
                <Layers size={16} />
                Toplu Borçlandır
              </Button>
            </>
          )}
        </div>
      </div>
      <Panel
        title={manager ? "Aidat ve tahsilatlar" : "Aidatlarım"}
        subtitle={`${filtered.length} kayıt`}
        action={
          <button
            className="icon-button"
            onClick={exportCSV}
            aria-label="Aidat listesini indir"
          >
            <Download size={18} />
          </button>
        }
      >
        <div className="table-toolbar">
          <div className="tabs">
            {[
              "Tümü",
              "Ödenmemiş",
              "Ödendi",
              ...(manager ? ["Onay bekliyor"] : []),
            ].map((f) => (
              <button
                key={f}
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
                {f === "Onay bekliyor" && (
                  <span>{dues.filter((d) => d.status === f).length}</span>
                )}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Aidat ara"
              placeholder={manager ? "Daire veya sakin ara…" : "Dönem ara…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {manager && <th>Daire / Sakin</th>}
                <th>Dönem</th>
                <th>Son ödeme</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th className="align-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  {manager && (
                    <td>
                      <strong>{d.unitId}</strong>
                      <small>
                        {residentName(d.unitId)}
                        {units.find((u) => u.id === d.unitId)?.type ? ` · ${units.find((u) => u.id === d.unitId).type}` : ""}
                        {units.find((u) => u.id === d.unitId)?.landShare ? ` · Arsa: ${units.find((u) => u.id === d.unitId).landShare}` : ""}
                      </small>
                    </td>
                  )}
                  <td>
                    <strong>{monthLabel(d.period)}</strong>
                    <small>{d.title}</small>
                  </td>
                  <td>{dateLabel(d.dueDate)}</td>
                  <td className="amount tabular-nums">{money(d.amount)}</td>
                  <td>
                    <Badge status={d.status} />
                  </td>
                  <td className="align-right">
                    {d.status === "Ödenmemiş" ? (
                      <button
                        className="row-action"
                        onClick={() => setModal({ type: "pay", due: d })}
                      >
                        {manager ? "Tahsil et" : "Öde"}
                        <ArrowUpRight size={14} />
                      </button>
                    ) : d.status === "Onay bekliyor" && manager ? (
                      <div className="review-actions">
                        <button
                          className="row-action"
                          onClick={() => onReview(d.id, true)}
                        >
                          Onayla
                          <Check size={14} />
                        </button>
                        <button
                          className="muted-button"
                          onClick={() => onReview(d.id, false)}
                        >
                          Reddet
                        </button>
                      </div>
                    ) : (
                      <span className="muted">
                        {d.status === "Ödendi" ? "Tamamlandı" : "İnceleniyor"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty />}
        </div>
      </Panel>
      {modal?.type === "pay" && (
        <PaymentModal
          due={modal.due}
          onClose={() => setModal(null)}
          onSubmit={(id, method) => {
            onPay(id, method);
            setModal(null);
          }}
        />
      )}
      {["single", "bulk"].includes(modal?.type) && (
        <AccrualModal
          bulk={modal.type === "bulk"}
          units={units}
          dues={dues}
          onClose={() => setModal(null)}
          onSubmit={(items) => {
            onAccrue(items);
            setModal(null);
          }}
        />
      )}
    </>
  );
}
export function PaymentModal({ due, onClose, onSubmit }) {
  const [method, setMethod] = useState("card");
  return (
    <Modal
      title="Aidat ödemesi"
      description={`${due.unitId} · ${monthLabel(due.period)} · ${due.title}`}
      onClose={onClose}
    >
      <div className="payment-total">
        <span>Ödenecek tutar</span>
        <strong>{money(due.amount)}</strong>
      </div>
      <div className="form-tabs">
        <button
          className={method === "card" ? "selected" : ""}
          onClick={() => setMethod("card")}
        >
          <CreditCard size={16} />
          Kredi Kartı
        </button>
        <button
          className={method === "transfer" ? "selected" : ""}
          onClick={() => setMethod("transfer")}
        >
          Havale bildirimi
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(due.id, method);
        }}
      >
        {method === "card" ? (
          <>
            <p className="form-note">
              Güvenli SSL ve 3D Secure korumalı kart ödeme altyapısı.
            </p>
            <Field label="Kart üzerindeki ad">
              <input
                required
                defaultValue="KART SAHİBİ"
                autoComplete="off"
              />
            </Field>
            <Field label="Kart numarası">
              <input
                required
                inputMode="numeric"
                pattern="[0-9 ]{16,19}"
                defaultValue="4242 4242 4242 4242"
                autoComplete="off"
              />
            </Field>
            <div className="form-row">
              <Field label="Son kullanma tarihi">
                <input
                  required
                  pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                  defaultValue="12/29"
                  placeholder="AA/YY"
                  autoComplete="off"
                />
              </Field>
              <Field label="CVC">
                <input
                  required
                  pattern="[0-9]{3,4}"
                  inputMode="numeric"
                  defaultValue="123"
                  autoComplete="off"
                />
              </Field>
            </div>
          </>
        ) : (
          <p className="form-note">
            Bu demo ödeme bildirimi yöneticinin onay listesine eklenir. Yönetici
            onayladığında aidatınız ödendi olarak güncellenir.
          </p>
        )}
        <div className="modal-footer">
          <Button secondary type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit">
            {method === "card"
              ? `${money(due.amount)} Öde`
              : "Ödeme Bildirimi Oluştur"}
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function AccrualModal({ bulk, units, dues, onClose, onSubmit }) {
  const [period, setPeriod] = useState(PERIOD);
  const [amount, setAmount] = useState(2500);
  const [unit, setUnit] = useState(units[0]?.id || "A-1");
  const [title, setTitle] = useState("Site aidatı");
  const [model, setModel] = useState("type"); // 'type' | 'landShare' | 'm2' | 'flat'
  const [m2Rate, setM2Rate] = useState(25);
  const [totalBudget, setTotalBudget] = useState(75000);

  const totalLandShare = units.reduce((acc, u) => acc + (Number(u.landShare) || (u.m2 ? u.m2 / 1000 : 0.04)), 0) || 1;

  const calculateUnitAmount = (u) => {
    if (!bulk) return Number(amount);
    if (model === "flat") return Number(amount);
    if (model === "m2") {
      const area = u.m2 || (u.type === "1+0" ? 45 : u.type === "1+1" ? 65 : u.type === "2+0" ? 75 : u.type === "2+1" ? 95 : 120);
      return area * Number(m2Rate || 25);
    }
    if (model === "landShare") {
      const share = Number(u.landShare) || (u.m2 ? u.m2 / 1000 : 0.04);
      return Math.round((Number(totalBudget) * (share / totalLandShare)) || Number(amount));
    }
    // model === 'type'
    const found = APARTMENT_TYPES.find((t) => t.id === u.type);
    return found ? found.defaultDue : Number(amount);
  };

  const totalCalculated = eligible.reduce((sum, u) => sum + calculateUnitAmount(u), 0);

  return (
    <Modal
      title={bulk ? "Toplu Aidat Tahakkuk Ettir" : "Daireye Borç Ekle"}
      description={
        bulk
          ? "Daire tipi veya metrekare boyutuna göre otomatik aidat tahakkuku oluşturun."
          : "Seçili daire için yeni bir borç kaydı oluşturun."
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!eligible.length) return;
          onSubmit(
            eligible.map((u) => ({
              id: uid(),
              unitId: u.id,
              period,
              title: bulk ? `Site aidatı (${u.type || "Standart"})` : title.trim(),
              amount: calculateUnitAmount(u),
              dueDate: `${period}-20`,
              status: "Ödenmemiş",
            })),
          );
        }}
      >
        {!bulk ? (
          <>
            <Field label="Daire">
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {units
                  .filter((u) => u.occupied)
                  .map((u) => (
                    <option key={u.id}>{u.id} - {u.type || "2+1"} ({u.m2 || 95} m²)</option>
                  ))}
              </select>
            </Field>
            <Field label="Açıklama">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                pattern=".*\S.*"
              />
            </Field>
            <div className="form-row">
              <Field label="Dönem">
                <input
                  type="month"
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </Field>
              <Field label="Tutar (₺)">
                <input
                  type="number"
                  required
                  min="1"
                  max="1000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Dönem">
              <input
                type="month"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </Field>

            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1">Aidat Hesaplama Formülü</label>
              <div className="source-toggle-tabs">
                <button
                  type="button"
                  className={model === "type" ? "active" : ""}
                  onClick={() => setModel("type")}
                >
                  Daire / Alan Tipi
                </button>
                <button
                  type="button"
                  className={model === "landShare" ? "active" : ""}
                  onClick={() => setModel("landShare")}
                >
                  Arsa Payı (KMK 20)
                </button>
                <button
                  type="button"
                  className={model === "m2" ? "active" : ""}
                  onClick={() => setModel("m2")}
                >
                  Metrekare (m²) Başına
                </button>
                <button
                  type="button"
                  className={model === "flat" ? "active" : ""}
                  onClick={() => setModel("flat")}
                >
                  Sabit Tutar
                </button>
              </div>
            </div>

            {model === "landShare" && (
              <Field label="Aylık Toplam İşletme Bütçesi (₺) — Arsa Paylarına Göre Dağıtılır">
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </Field>
            )}

            {model === "flat" && (
              <Field label="Daire Başı Sabit Tutar (₺)">
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
            )}

            {model === "m2" && (
              <Field label="m² Başına Birim Aidat Bedeli (₺ / m²)">
                <input
                  type="number"
                  required
                  min="1"
                  max="200"
                  value={m2Rate}
                  onChange={(e) => setM2Rate(e.target.value)}
                />
              </Field>
            )}

            {model === "type" && (
              <div className="type-accrual-legend mb-3">
                <span className="text-xs text-muted block mb-1">Uygulanacak Birim Tarifeler:</span>
                <div className="flex gap-2 flex-wrap">
                  {APARTMENT_TYPES.filter(t => t.defaultDue > 0).slice(0, 6).map(t => (
                    <span key={t.id} className="type-rate-pill">
                      <strong>{t.id}:</strong> {money(t.defaultDue)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="form-note">
          <div className="flex items-center justify-between">
            <strong>{eligible.length} Bağımsız Bölüm</strong>
            <span className="text-gold font-bold">Toplam: {money(totalCalculated)}</span>
          </div>
          {bulk && targets.length !== eligible.length && (
            <p className="mt-1">
              {targets.length - eligible.length} dairenin bu dönem aidatı zaten oluşturulmuş.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <Button secondary type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={!eligible.length}>
            {eligible.length} Daireyi Borçlandır ({money(totalCalculated)})
          </Button>
        </div>
      </form>
    </Modal>
  );
}
