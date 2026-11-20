import {
  Building2,
  Wallet,
  MessageSquare,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
  Plus,
  CalendarDays,
  Megaphone,
  Clock3,
} from "lucide-react";
import { Badge, Button, Panel, Stat, TextLink } from "./UI";
import { dateLabel, money, monthLabel, PERIOD } from "./data";
import { DemoBanner } from "../live/common";
export default function Dashboard({
  manager,
  user,
  units,
  dues,
  requests,
  announcements,
  onNavigate,
  onPay,
  onRequest,
  residentName,
  siteName = "Kovan Sitesi",
  siteStats,
}) {
  const monthly = dues.filter((d) => d.period === PERIOD);
  const total = monthly.reduce((s, d) => s + d.amount, 0);
  const collected = monthly
    .filter((d) => d.status === "Ödendi")
    .reduce((s, d) => s + d.amount, 0);
  const rate = total ? Math.round((collected / total) * 100) : 0;
  const chartMax = Math.max(
    120000,
    ...["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map(
      (p) =>
        Math.ceil(
          dues.filter((d) => d.period === p).reduce((s, d) => s + d.amount, 0) /
            40000,
        ) * 40000,
    ),
  );
  const unpaid = dues.filter((d) => d.status !== "Ödendi");
  const debt = unpaid.reduce((s, d) => s + d.amount, 0);
  const active = requests.filter((r) => r.status !== "Çözüldü");
  const today = new Date();
  const todayFormatted =
    today.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    ", " +
    today.toLocaleDateString("tr-TR", { weekday: "long" });

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            {siteName.toLocaleUpperCase("tr-TR")} · {manager ? "YÖNETİCİ PANELİ" : "KONUT SAKİNİ PANELİ"}
          </span>
          <h1>
            Merhaba, {user.name.split(" ")[0]}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {manager
              ? "Sitenizde hayat yolunda. İşte bugünün genel görünümü."
              : "Evinizle ilgili her şey, bir bakışta kontrolünüzde."}
          </p>
        </div>
        <div className="date-chip">
          <CalendarDays size={16} />
          <span>{todayFormatted}</span>
        </div>
      </div>
      <DemoBanner>Bu bölüm henüz geliştiriliyor; buradaki bilgiler örnektir ve kaydedilmez.</DemoBanner>
      <div className={`stats-grid ${manager ? "" : "resident-stats"}`}>
        {manager ? (
          <>
            <Stat
              icon={Building2}
              label="Toplam daire"
              value={siteStats ? siteStats.unitCount : "—"}
              note={
                siteStats
                  ? `${siteStats.occupiedCount ?? "—"} dolu daire · ${siteStats.blockCount} blok`
                  : "—"
              }
            />
            <Stat
              icon={Wallet}
              label="Aylık tahsilat oranı"
              value={`%${rate}`}
              note={`${money(collected)} / ${money(total)}`}
              accent
            >
              <div className="stat-progress">
                <i style={{ width: `${rate}%` }} />
              </div>
            </Stat>
            <Stat
              icon={MessageSquare}
              label="Bekleyen talep"
              value={active.length}
              note={
                active.length > 0
                  ? `${requests.filter((r) => r.status === "Yeni").length} yeni · ${requests.filter((r) => r.status === "İnceleniyor").length} inceleniyor`
                  : "Bekleyen talep bulunmuyor"
              }
            />
            <Stat
              icon={CreditCard}
              label="Borçlu daire"
              value={new Set(unpaid.map((d) => d.unitId)).size}
              note={debt > 0 ? `${money(debt)} toplam bakiye` : "Tüm aidatlar ödendi"}
            />
          </>
        ) : (
          <>
            <Stat
              icon={Wallet}
              label="Toplam borcunuz"
              value={money(debt)}
              note={
                unpaid.length
                  ? `${unpaid.length} bekleyen ödeme`
                  : "Tüm aidatlar ödendi"
              }
              accent
            />
            <Stat
              icon={MessageSquare}
              label="Aktif talepleriniz"
              value={active.length}
              note={
                active.length > 0
                  ? `${active.length} talebiniz inceleniyor`
                  : requests.filter((r) => r.status === "Çözüldü").length > 0
                    ? `${requests.filter((r) => r.status === "Çözüldü").length} talebiniz çözümlendi`
                    : "Bekleyen talebiniz bulunmuyor"
              }
            />
            <Stat
              icon={Megaphone}
              label="Site duyuruları"
              value={announcements.length}
              note={
                announcements[0]
                  ? `Son: ${announcements[0].title}`
                  : "Aktif duyuru bulunmuyor"
              }
            />
          </>
        )}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          {manager ? (
            <Panel
              title="Tahsilat özeti"
              subtitle="Son 6 ayın aidat tahsilatları"
              action={
                <span className="chart-legend">
                  <i />
                  Tahsil edilen <i className="legend-muted" />
                  Bekleyen
                </span>
              }
            >
              <div className="chart-head">
                <strong>{money(collected)}</strong>
                <span>Eylül 2026 tahsilatı</span>
                <TextLink onClick={() => onNavigate("payments")}>
                  Detayları gör
                </TextLink>
              </div>
              <div
                className="chart-area"
                role="img"
                aria-label={`Son altı ayın tahsilat grafiği. Eylül: ${money(collected)}, yüzde ${rate} tahsil edildi.`}
              >
                <div className="chart-y">
                  {[1, 0.75, 0.5, 0.25, 0].map((n) => (
                    <span key={n}>
                      {n ? `${(chartMax * n) / 1000} bin ₺` : "0 ₺"}
                    </span>
                  ))}
                </div>
                <div className="chart-bars">
                  {[
                    "2026-04",
                    "2026-05",
                    "2026-06",
                    "2026-07",
                    "2026-08",
                    "2026-09",
                  ].map((p) => {
                    const all = dues.filter((d) => d.period === p);
                    const sum = all.reduce((s, d) => s + d.amount, 0);
                    const paid = all
                      .filter((d) => d.status === "Ödendi")
                      .reduce((s, d) => s + d.amount, 0);
                    return (
                      <div
                        key={p}
                        className={`chart-column ${p === PERIOD ? "current" : ""}`}
                      >
                        <div
                          className="bar-track"
                          style={{
                            height: `${Math.min((sum / chartMax) * 100, 100)}%`,
                          }}
                          title={`${monthLabel(p)}: ${money(paid)} tahsil edildi, ${money(sum - paid)} bekliyor`}
                        >
                          <div
                            className="bar-fill"
                            style={{
                              height: `${sum ? (paid / sum) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span>{monthLabel(p).split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="chart-caption">
                <span>
                  <span className="status-dot" />
                  Eylül ayı tahsilat hedefi: {money(total)}
                </span>
                <span className="tabular-nums">%{rate} tamamlandı</span>
              </div>
            </Panel>
          ) : (
            <Panel
              title="Aidat özeti"
              subtitle="Ödemeleriniz ve yaklaşan son ödeme tarihleri"
              action={
                <TextLink onClick={() => onNavigate("payments")}>
                  Tüm aidatlar
                </TextLink>
              }
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Dönem</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...dues]
                      .sort((a, b) => b.period.localeCompare(a.period))
                      .slice(0, 4)
                      .map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{monthLabel(d.period)}</strong>
                            <small>Son ödeme: {dateLabel(d.dueDate)}</small>
                          </td>
                          <td className="amount">{money(d.amount)}</td>
                          <td>
                            <Badge status={d.status} />
                          </td>
                          <td>
                            {d.status === "Ödenmemiş" && (
                              <button
                                className="row-action"
                                onClick={() => onPay(d)}
                              >
                                Öde
                                <ArrowUpRight size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          <Panel
            title={manager ? "Son talepler" : "Talepleriniz"}
            subtitle={
              manager
                ? "Sakinlerden gelen son bildirimler"
                : "Talep ve çözüm süreçlerini takip edin"
            }
            action={
              <TextLink onClick={() => onNavigate("requests")}>
                Tüm talepler
              </TextLink>
            }
          >
            <div className="recent-requests">
              {requests.slice(0, 4).map((r) => (
                <button
                  key={r.id}
                  onClick={() => onNavigate("requests")}
                  className="recent-request"
                >
                  <span className="request-icon">
                    <MessageSquare size={18} />
                  </span>
                  <div>
                    <strong>{r.title}</strong>
                    <small>
                      {r.unitId} · {residentName(r.unitId)}{" "}
                      <span>· {dateLabel(r.date)}</span>
                    </small>
                  </div>
                  <Badge status={r.status} />
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <aside className="dashboard-aside">
          <div className="quick-card">
            <div className="quick-top">
              <span className="eyebrow">
                {manager ? "DAHA AZ İŞ YÜKÜ" : "EVİNİZLE BAĞLANTIDA"}
              </span>
              <span className="quick-emblem">
                <Building2 size={26} />
              </span>
            </div>
            <h2>
              {manager ? (
                <>
                  Düzenli bir site.
                  <br />
                  Huzurlu bir yaşam.
                </>
              ) : (
                <>
                  Bir talebiniz mi var?
                  <br />
                  Birlikte çözelim.
                </>
              )}
            </h2>
            <p>
              {manager
                ? "Aylık aidatları oluşturun, tüm dairelerin borçlandırmasını tek adımda tamamlayın."
                : "Arıza, öneri veya ihtiyacınızı yönetimle paylaşın. Her adımından haberdar olun."}
            </p>
            <Button
              onClick={() => (manager ? onNavigate("payments") : onRequest())}
            >
              <Plus size={16} />
              {manager ? "Aidat İşlemleri" : "Yeni Talep Oluştur"}
              <ArrowRight size={16} />
            </Button>
          </div>
          <Panel
            title="Duyuru panosu"
            action={<span className="count-label">{announcements.length}</span>}
          >
            <div className="announcement-preview">
              {announcements.slice(0, 3).map((a, i) => (
                <button key={a.id} onClick={() => onNavigate("announcements")}>
                  <div className="announcement-top">
                    <span className={i === 0 ? "gold-label" : "muted"}>
                      {a.category}
                    </span>
                    <span>{dateLabel(a.date)}</span>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                  {i === 0 && (
                    <span className="read-more">
                      Duyuruyu oku
                      <ArrowUpRight size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="panel-bottom">
              <TextLink onClick={() => onNavigate("announcements")}>
                Tüm duyurular
              </TextLink>
            </div>
          </Panel>
          <div className="office-note">
            <Clock3 size={17} />
            <p>
              Yönetim ofisi<small>Hafta içi 09.00–18.00 · Dahili 100</small>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
