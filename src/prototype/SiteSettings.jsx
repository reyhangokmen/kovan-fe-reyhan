import { useState } from "react";
import {
  Building2,
  Wallet,
  Bell,
  Save,
  Car,
  Sliders,
  Shield,
  CreditCard,
  Lock,
  QrCode,
  FileText,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Info,
  Sun,
  Moon,
} from "lucide-react";
import { Button, Field, Panel } from "./UI";
import { APARTMENT_TYPES, money } from "./data";

export default function SiteSettings({
  siteMeta,
  onUpdateSiteMeta,
  units = [],
  onNotify,
  theme,
  onToggleTheme,
}) {
  // 6 Ana Kurumsal Sekme
  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'finance' | 'dues' | 'facilities' | 'notifications' | 'privacy'

  // 1. Genel Bilgiler & Kurumsal Kimlik
  const [generalSettings, setGeneralSettings] = useState({
    siteName: siteMeta?.name || "Kovan Sitesi",
    taxOffice: "Kozyatağı Vergi Dairesi",
    taxNumber: "4820194812",
    blockCount: "3",
    totalUnits: units.length || 48,
    city: "İstanbul",
    district: "Ataşehir",
    neighborhood: "Barbaros Mah.",
    address: "Barbaros Mah. Mor Sümbül Sok. No: 12",
    islandParcel: "142 Ada / 8 Parsel",
    decisionBookNo: "KD-2026/04",
    managerName: "Mehmet Demir",
    managerPhone: "0532 555 99 00",
    managerEmail: "yonetim@site.com",
    auditorName: "Canan Çelik",
    auditorPhone: "0533 444 33 22",
    securityDeskExtension: "100",
    // DASK Deprem Sigortası
    daskPolicyNo: "83920194",
    daskCompany: "Türkiye Sigorta / Kovan Acentesi",
    daskStartDate: "2026-01-15",
    daskEndDate: "2027-01-15",
    daskCoverageAmount: "45000000",
  });

  // 2. Finans & Banka Hesapları
  const [financeSettings, setFinanceSettings] = useState({
    // İşletme Hesabı (Aidatlar)
    operatingBank: "Kovan Katılım Bankası",
    operatingBranch: "Kozyatağı Şubesi (Kod: 412)",
    operatingAccountHolder: "Kovan Sitesi Toplu Yapı Yönetimi",
    operatingIban: "TR56 0006 2000 0001 2938 4920 18",
    // Demirbaş & Yatırım Fonu Hesabı
    reserveBank: "Kovan Katılım Bankası",
    reserveAccountHolder: "Kovan Sitesi Demirbaş & Yatırım Fonu",
    reserveIban: "TR12 0006 2000 0001 9988 7766 55",
    // Sanal POS (Kredi Kartı)
    posProvider: "PayTR",
    posStatus: "active", // 'active' | 'passive'
    posFeeBearer: "resident", // 'management' | 'resident'
    posInstallments: true,
  });

  // 3. Aidat Dağıtım & Gecikme Politikası
  const [duesSettings, setDuesSettings] = useState({
    defaultDues: "2500",
    dueDay: "20",
    applyInterest: true, // Aidat gecikme faizi tercihe bağlı
    interestRate: "5", // Gecikme faizi aylık %5
    gracePeriodDays: "5", // Vadeden sonra tolerans gün sayısı
    interestCalcMethod: "monthly", // 'monthly' | 'daily'
    autoAccrue: true,
    duesModel: "type", // 'flat' | 'type' | 'm2'
    m2Rate: "25",
    typeRates: {
      "1+0": 1400,
      "1+1": 1800,
      "2+0": 2100,
      "2+1": 2500,
      "3+0": 2800,
      "3+1": 3200,
      "4+1": 3800,
      "Dubleks": 4500,
      "Dükkan / Ticari": 5000,
      "Kapıcı Dairesi": 0,
    },
  });

  // 4. Tesis, Otopark & Donanım
  const [facilitySettings, setFacilitySettings] = useState({
    parkingSlotsPerUnit: "1",
    guestParkingSlots: "12",
    plateRecognition: true,
    strictPlateBarrier: true,
    qrElevatorAccess: true,
    poolOpenHours: "09:00 - 21:00",
    gymOpenHours: "07:00 - 23:00",
    tennisOpenHours: "08:00 - 22:00",
    weeklyReservationLimit: "3",
    quietHours: "23:00 - 08:00",
  });

  // 5. Bildirim & SMS Otomasyonu
  const [notificationSettings, setNotificationSettings] = useState({
    smsSenderTitle: "KOVAN-SITE",
    smsProviderStatus: "active",
    smsDuesReminderDays: "3", // Vadeye 3 gün kala
    smsOverdueAlert: true,
    emailMonthlyStatement: true,
    urgentNoticeBroadcast: true,
    requestStatusAlerts: true,
  });

  // 6. KVKK & Sakin Gizlilik Kuralları
  const [privacySettings, setPrivacySettings] = useState({
    showResidentPhoneInDirectory: false, // Komşuluk rehberinde telefon gizli
    showLicensePlateInDirectory: false, // Otopark rehberinde plaka sakinlere kapalı (sadece güvenlik)
    displayDebtorsOnBoard: false, // Panoda açık isimle borçlu yayınlanamaz (KVKK)
    requireManagementPlanConsent: true, // Girişte yönetim planı ve KVKK dijital onayı
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (onUpdateSiteMeta) {
      onUpdateSiteMeta({
        name: generalSettings.siteName,
        location: `${generalSettings.district}, ${generalSettings.city}`,
        blockSummary: `${generalSettings.blockCount} blok, ${generalSettings.totalUnits} daire`,
      });
    }
    onNotify?.("Site ayarları başarıyla kaydedildi ve tüm sistem genelinde senkronize edildi.");
  };

  return (
    <div className="site-settings-container">
      <div className="module-actions">
        <p>
          Sitenizin kurumsal kimliği, çoklu banka hesapları, aidat modelleri, donanım entegrasyonları ve gizlilik politikalarını bu merkezden yapılandırın.
        </p>
        <span className="muted">Sistem Durumu: Senkronize & Aktif</span>
      </div>

      {/* 6 Kurumsal Sekme */}
      <div className="subnav-tabs settings-tabs-nav">
        <button
          type="button"
          className={activeTab === "general" ? "active" : ""}
          onClick={() => setActiveTab("general")}
        >
          <Building2 size={16} /> Genel & Kurumsal
        </button>
        <button
          type="button"
          className={activeTab === "finance" ? "active" : ""}
          onClick={() => setActiveTab("finance")}
        >
          <CreditCard size={16} /> Finans & Hesaplar
        </button>
        <button
          type="button"
          className={activeTab === "dues" ? "active" : ""}
          onClick={() => setActiveTab("dues")}
        >
          <Wallet size={16} /> Aidat Politikası
        </button>
        <button
          type="button"
          className={activeTab === "facilities" ? "active" : ""}
          onClick={() => setActiveTab("facilities")}
        >
          <Car size={16} /> Tesis & Donanım
        </button>
        <button
          type="button"
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={16} /> Bildirim & SMS
        </button>
        <button
          type="button"
          className={activeTab === "privacy" ? "active" : ""}
          onClick={() => setActiveTab("privacy")}
        >
          <Shield size={16} /> KVKK & Gizlilik
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* SEKME 1: GENEL BİLGİLER & KURUMSAL KİMLİK */}
        {activeTab === "general" && (
          <Panel
            title="Site ve Yönetim Kurumsal Kimliği"
            subtitle="Resmi kayıtlar, vergi numarası, ada/parsel ve yönetim kurulu iletişim künyesi"
          >
            <div className="settings-grid">
              <div className="grid-2-col">
                <Field label="Site / Apartman Resmi Adı">
                  <input
                    required
                    value={generalSettings.siteName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                    }
                  />
                </Field>

                <Field label="Ada / Parsel No">
                  <input
                    value={generalSettings.islandParcel}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, islandParcel: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid-2-col">
                <Field label="Bağlı Vergi Dairesi">
                  <input
                    value={generalSettings.taxOffice}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, taxOffice: e.target.value })
                    }
                  />
                </Field>
                <Field label="Vergi Kimlik No (VKN)">
                  <input
                    value={generalSettings.taxNumber}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, taxNumber: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid-3-col">
                <Field label="İl">
                  <input
                    value={generalSettings.city}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, city: e.target.value })
                    }
                  />
                </Field>
                <Field label="İlçe">
                  <input
                    value={generalSettings.district}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, district: e.target.value })
                    }
                  />
                </Field>
                <Field label="Karar Defteri Sıra No">
                  <input
                    value={generalSettings.decisionBookNo}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, decisionBookNo: e.target.value })
                    }
                  />
                </Field>
              </div>

              <Field label="Açık Tebligat & Posta Adresi">
                <input
                  value={generalSettings.address}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, address: e.target.value })
                  }
                />
              </Field>

              <div className="settings-sub-section">
                <h4>Yönetim & Denetim Heyeti İletişim Bilgileri</h4>
                <div className="grid-2-col mt-2">
                  <Field label="Yönetici Adı Soyadı">
                    <input
                      value={generalSettings.managerName}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, managerName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Yönetim İletişim Telefonu">
                    <input
                      value={generalSettings.managerPhone}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, managerPhone: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="grid-2-col mt-2">
                  <Field label="Denetçi Adı Soyadı">
                    <input
                      value={generalSettings.auditorName}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, auditorName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Denetçi Telefonu">
                    <input
                      value={generalSettings.auditorPhone}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, auditorPhone: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Bina Güvenliği & DASK Deprem Sigortası Kartı */}
              <div className="settings-card-box mt-3">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-gold" />
                    <strong>Bina Deprem Sigortası & DASK Poliçe Bilgileri</strong>
                  </div>
                  <span className="badge complete">
                    <CheckCircle2 size={12} /> Poliçe Aktif (Yenilemeye 106 Gün)
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  6305 sayılı Afet Sigortaları Kanunu uyarınca sitenizin ortak alan ve bina teminatını sağlayan güncel DASK zorunlu deprem sigortası detayları.
                </p>
                <div className="grid-2-col mt-3">
                  <Field label="DASK Poliçe Numarası">
                    <input
                      required
                      value={generalSettings.daskPolicyNo}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, daskPolicyNo: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Sigorta Şirketi & Acente">
                    <input
                      required
                      value={generalSettings.daskCompany}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, daskCompany: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="grid-3-col mt-2">
                  <Field label="Poliçe Başlangıç Tarihi">
                    <input
                      type="date"
                      value={generalSettings.daskStartDate}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, daskStartDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Poliçe Bitiş Tarihi">
                    <input
                      type="date"
                      value={generalSettings.daskEndDate}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, daskEndDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Toplam Bina Teminat Tutarı (₺)">
                    <input
                      type="number"
                      value={generalSettings.daskCoverageAmount}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, daskCoverageAmount: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Görünüm ve Tema Tercihi (Özellikle Mobil ve Hızlı Erişim İçin) */}
              <div className="settings-card-box mt-3">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? <Moon size={18} className="text-gold" /> : <Sun size={18} className="text-gold" />}
                    <strong>Uygulama Teması ve Görünüm Tercihi</strong>
                  </div>
                  <span className="badge info">
                    {theme === "dark" ? "Koyu Tema Aktif" : "Açık Tema Aktif"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Yönetim panelinin açık veya koyu temasını buradan ya da üst menüden değiştirebilirsiniz.
                </p>
                <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`theme-select-card ${theme === "light" ? "active" : ""}`}
                    onClick={() => theme !== "light" && onToggleTheme?.()}
                  >
                    <Sun size={16} />
                    <span>Açık Tema</span>
                  </button>
                  <button
                    type="button"
                    className={`theme-select-card ${theme === "dark" ? "active" : ""}`}
                    onClick={() => theme !== "dark" && onToggleTheme?.()}
                  >
                    <Moon size={16} />
                    <span>Koyu Tema</span>
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* SEKME 2: FİNANS, ÇOKLU HESAPLAR & SANAL POS */}
        {activeTab === "finance" && (
          <Panel
            title="Banka Hesapları & Online Tahsilat Entegrasyonu"
            subtitle="İşletme hesabı, demirbaş fonu ve kredi kartlı sanal POS altyapısı"
          >
            <div className="settings-grid">
              {/* İşletme Hesabı Kartı */}
              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-gold" />
                    <strong>Resmi İşletme Hesabı (Aidat Tahsilatı)</strong>
                  </div>
                  <span className="badge complete">Birincil Hesap</span>
                </div>
                <div className="grid-2-col mt-3">
                  <Field label="Banka & Şube">
                    <input
                      value={financeSettings.operatingBank}
                      onChange={(e) =>
                        setFinanceSettings({ ...financeSettings, operatingBank: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Hesap Sahibi (Unvan)">
                    <input
                      value={financeSettings.operatingAccountHolder}
                      onChange={(e) =>
                        setFinanceSettings({
                          ...financeSettings,
                          operatingAccountHolder: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="İşletme IBAN">
                  <input
                    className="tabular-nums"
                    value={financeSettings.operatingIban}
                    onChange={(e) =>
                      setFinanceSettings({ ...financeSettings, operatingIban: e.target.value })
                    }
                  />
                </Field>
              </div>

              {/* Demirbaş Fonu Kartı */}
              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-gold" />
                    <strong>Demirbaş & Yatırım Fonu Hesabı</strong>
                  </div>
                  <span className="badge progress">Özel Fon Hesabı</span>
                </div>
                <div className="grid-2-col mt-3">
                  <Field label="Banka Adı">
                    <input
                      value={financeSettings.reserveBank}
                      onChange={(e) =>
                        setFinanceSettings({ ...financeSettings, reserveBank: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Fon Hesap Sahibi">
                    <input
                      value={financeSettings.reserveAccountHolder}
                      onChange={(e) =>
                        setFinanceSettings({
                          ...financeSettings,
                          reserveAccountHolder: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="Demirbaş IBAN">
                  <input
                    className="tabular-nums"
                    value={financeSettings.reserveIban}
                    onChange={(e) =>
                      setFinanceSettings({ ...financeSettings, reserveIban: e.target.value })
                    }
                  />
                </Field>
              </div>

              {/* Sanal POS Kartı */}
              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-gold" />
                    <strong>Kredi Kartı ile Online Tahsilat (Sanal POS)</strong>
                  </div>
                  <span className="badge complete">
                    <CheckCircle2 size={12} /> {financeSettings.posProvider} Aktif
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Sakinlerin Kovan mobil veya web panelinden kredi kartıyla anında aidat ödeyebilmesi için aktif sanal POS entegrasyonu.
                </p>
                <div className="grid-2-col mt-3">
                  <Field label="POS Sağlayıcı">
                    <select
                      value={financeSettings.posProvider}
                      onChange={(e) =>
                        setFinanceSettings({ ...financeSettings, posProvider: e.target.value })
                      }
                    >
                      <option value="PayTR">PayTR Sanal POS</option>
                      <option value="İyzico">İyzico B2B / Konut POS</option>
                      <option value="Param">Param POS</option>
                    </select>
                  </Field>
                  <Field label="POS Komisyon Yansıtma">
                    <select
                      value={financeSettings.posFeeBearer}
                      onChange={(e) =>
                        setFinanceSettings({ ...financeSettings, posFeeBearer: e.target.value })
                      }
                    >
                      <option value="resident">Kart Sahibine Yansıt (Sakin Öder)</option>
                      <option value="management">Yönetim Bütçesinden Karşıla</option>
                    </select>
                  </Field>
                </div>
                <label className="checkbox-item-custom mt-2">
                  <input
                    type="checkbox"
                    checked={financeSettings.posInstallments}
                    onChange={(e) =>
                      setFinanceSettings({ ...financeSettings, posInstallments: e.target.checked })
                    }
                  />
                  <span>Sakinlere kredi kartına 3-6 taksit seçeneği sunulsun</span>
                </label>
              </div>
            </div>
          </Panel>
        )}

        {/* SEKME 3: AİDAT POLİTİKASI & HESAPLAMA MODELLERİ */}
        {activeTab === "dues" && (
          <Panel
            title="Aidat Dağıtım & Gecikme Politikası"
            subtitle="Daire tiplerine veya m² alanına göre aidat belirleme ve tahakkuk otomasyonu"
          >
            <div className="settings-grid">
              <div className="grid-2-col">
                <Field label="Varsayılan Aylık Aidat (₺)">
                  <input
                    type="number"
                    value={duesSettings.defaultDues}
                    onChange={(e) =>
                      setDuesSettings({ ...duesSettings, defaultDues: e.target.value })
                    }
                  />
                </Field>
                <Field label="Son Ödeme Günü (Her Ayın)">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={duesSettings.dueDay}
                    onChange={(e) =>
                      setDuesSettings({ ...duesSettings, dueDay: e.target.value })
                    }
                  />
                </Field>
              </div>

              {/* Aidat Gecikme Faizi Politikası (Yöneticinin Tercihine Bağlı) */}
              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-gold" />
                    <strong>Gecikme Faizi ve Tazminat Politikası (Yönetici Tercihi)</strong>
                  </div>
                  <span className={`badge ${duesSettings.applyInterest ? "complete" : "warning"}`}>
                    {duesSettings.applyInterest ? "Faiz Uygulaması Aktif" : "Faiz Uygulaması Kapalı"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Kat Mülkiyeti Kanunu (KMK Madde 20) uyarınca gecikme tazminatı yasal olarak aylık %5 oranındadır. Yönetim kurulu veya genel kurul kararına göre sistemin faiz işletmesini açıp kapatabilirsiniz.
                </p>

                <div className="mt-3">
                  <label className="checkbox-item-custom font-semibold">
                    <input
                      type="checkbox"
                      checked={duesSettings.applyInterest}
                      onChange={(e) =>
                        setDuesSettings({ ...duesSettings, applyInterest: e.target.checked })
                      }
                    />
                    <span>Vadesi geçen aidat borçlarına gecikme faizi tahakkuk ettirilsin</span>
                  </label>
                </div>

                {duesSettings.applyInterest && (
                  <div className="grid-3-col mt-3 p-3 rounded-lg" style={{ background: "var(--page)", border: "1px solid var(--line)" }}>
                    <Field label="Aylık Faiz Oranı (%)">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={duesSettings.interestRate}
                        onChange={(e) =>
                          setDuesSettings({ ...duesSettings, interestRate: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Gecikme Tolerans Süresi (Gün)">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={duesSettings.gracePeriodDays}
                        onChange={(e) =>
                          setDuesSettings({ ...duesSettings, gracePeriodDays: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Faiz Hesaplama Yöntemi">
                      <select
                        value={duesSettings.interestCalcMethod}
                        onChange={(e) =>
                          setDuesSettings({ ...duesSettings, interestCalcMethod: e.target.value })
                        }
                      >
                        <option value="monthly">Aylık Sabit Oran (%5 / Ay)</option>
                        <option value="daily">Günlük Basit Faiz (Gün Başına Oran)</option>
                      </select>
                    </Field>
                  </div>
                )}
              </div>

              {/* Dağıtım Modeli Seçimi */}
              <div className="dues-model-card mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders size={16} className="text-gold" />
                  <strong>Aidat Dağıtım & Hesaplama Modeli</strong>
                </div>
                <p className="text-xs text-muted mb-3">
                  Aidatların daire boyutuna (m²) veya daire tiplerine (1+0, 1+1, 2+0, 2+1...) göre nasıl farklılaştırılacağını belirleyin.
                </p>

                <div className="source-toggle-tabs mb-3">
                  <button
                    type="button"
                    className={duesSettings.duesModel === "flat" ? "active" : ""}
                    onClick={() => setDuesSettings({ ...duesSettings, duesModel: "flat" })}
                  >
                    Sabit Tutar (Tüm Daireler Eşit)
                  </button>
                  <button
                    type="button"
                    className={duesSettings.duesModel === "type" ? "active" : ""}
                    onClick={() => setDuesSettings({ ...duesSettings, duesModel: "type" })}
                  >
                    Daire / Alan Tipine Göre
                  </button>
                  <button
                    type="button"
                    className={duesSettings.duesModel === "landShare" ? "active" : ""}
                    onClick={() => setDuesSettings({ ...duesSettings, duesModel: "landShare" })}
                  >
                    Arsa Payına Göre (KMK 20)
                  </button>
                  <button
                    type="button"
                    className={duesSettings.duesModel === "m2" ? "active" : ""}
                    onClick={() => setDuesSettings({ ...duesSettings, duesModel: "m2" })}
                  >
                    Metrekare (m²) Başına
                  </button>
                </div>

                {duesSettings.duesModel === "type" && (
                  <div className="type-rates-table-wrap">
                    <p className="text-xs text-muted mb-2">
                      Farklı bağımsız bölüm ve oda tipleri için geçerli aylık aidat tutarlarını belirleyin:
                    </p>
                    <div className="grid-2-col">
                      {APARTMENT_TYPES.map((t) => (
                        <div key={t.id} className="type-rate-input-row">
                          <label className="text-xs font-semibold">
                            {t.label} <small className="text-muted">({t.defaultM2} m²)</small>
                          </label>
                          <div className="input-with-currency">
                            <span>₺</span>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={duesSettings.typeRates[t.id] ?? t.defaultDue}
                              onChange={(e) =>
                                setDuesSettings({
                                  ...duesSettings,
                                  typeRates: {
                                    ...duesSettings.typeRates,
                                    [t.id]: Number(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {duesSettings.duesModel === "m2" && (
                  <div className="m2-rate-card-wrap">
                    <div className="grid-2-col">
                      <Field label="m² Başına Birim Aidat Bedeli (₺ / m²)">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={duesSettings.m2Rate}
                          onChange={(e) => setDuesSettings({ ...duesSettings, m2Rate: e.target.value })}
                        />
                      </Field>
                      <div className="m2-example-box">
                        <span className="text-xs font-semibold">Örnek Hesaplama Formülü:</span>
                        <div className="text-xs text-muted mt-1">
                          Daire Alanı (m²) × {duesSettings.m2Rate} ₺ = Aylık Aidat
                        </div>
                        <div className="flex gap-2 flex-wrap mt-2">
                          <span className="m2-pill">1+0 (45 m²): {money(45 * Number(duesSettings.m2Rate || 25))}</span>
                          <span className="m2-pill">1+1 (65 m²): {money(65 * Number(duesSettings.m2Rate || 25))}</span>
                          <span className="m2-pill">2+1 (95 m²): {money(95 * Number(duesSettings.m2Rate || 25))}</span>
                          <span className="m2-pill">3+1 (130 m²): {money(130 * Number(duesSettings.m2Rate || 25))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <label className="checkbox-item-custom">
                <input
                  type="checkbox"
                  checked={duesSettings.autoAccrue}
                  onChange={(e) =>
                    setDuesSettings({ ...duesSettings, autoAccrue: e.target.checked })
                  }
                />
                <span>Her ayın 1'inde tüm aktif daireler için otomatik borç tahakkukunu çalıştır</span>
              </label>
            </div>
          </Panel>
        )}

        {/* SEKME 4: TESİS, OTOPARK & DONANIM ENTEGRASYONLARI */}
        {activeTab === "facilities" && (
          <Panel
            title="Tesis, Otopark & Donanım Entegrasyonları"
            subtitle="Plaka tanıma bariyeri, asansör QR kontrolü ve ortak alan rezervasyon kotaları"
          >
            <div className="settings-grid">
              <div className="grid-2-col">
                <Field label="Daire Başı Tahsisli Araç Otopark Kotası">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={facilitySettings.parkingSlotsPerUnit}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        parkingSlotsPerUnit: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Misafir Araç Park Kapasitesi">
                  <input
                    type="number"
                    value={facilitySettings.guestParkingSlots}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        guestParkingSlots: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-gold" />
                    <strong>Akıllı Bariyer & Plaka Tanıma Sistemi (PTS)</strong>
                  </div>
                  <span className="badge complete">Bariyer Kameraları Bağlı</span>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={facilitySettings.plateRecognition}
                      onChange={(e) =>
                        setFacilitySettings({
                          ...facilitySettings,
                          plateRecognition: e.target.checked,
                        })
                      }
                    />
                    <span>Giriş bariyerlerinde otomatik kamera tabanlı plaka tanımayı etkinleştir</span>
                  </label>
                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={facilitySettings.strictPlateBarrier}
                      onChange={(e) =>
                        setFacilitySettings({
                          ...facilitySettings,
                          strictPlateBarrier: e.target.checked,
                        })
                      }
                    />
                    <span>Kayıtlı olmayan misafir araçlar için güvenlik personeli onayı zorunlu olsun</span>
                  </label>
                </div>
              </div>

              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-gold" />
                    <strong>Blok Asansör & Kapı QR Geçiş Sistemi</strong>
                  </div>
                  <span className="badge complete">Mobil QR Aktif</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Apartman kapılarında ve asansör panolarında sakinlerin cep telefonuyla karekod okutarak geçiş yapmasını sağlar.
                </p>
                <label className="checkbox-item-custom mt-2">
                  <input
                    type="checkbox"
                    checked={facilitySettings.qrElevatorAccess}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        qrElevatorAccess: e.target.checked,
                      })
                    }
                  />
                  <span>Dinamik QR anahtarı ile temassız kapı ve asansör çağrısını aktif et</span>
                </label>
              </div>

              <div className="grid-3-col">
                <Field label="Açık Havuz Çalışma Saatleri">
                  <input
                    value={facilitySettings.poolOpenHours}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        poolOpenHours: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Fitness Salonu Saatleri">
                  <input
                    value={facilitySettings.gymOpenHours}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        gymOpenHours: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Tenis / Basket Sahası Saatleri">
                  <input
                    value={facilitySettings.tennisOpenHours}
                    onChange={(e) =>
                      setFacilitySettings({
                        ...facilitySettings,
                        tennisOpenHours: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          </Panel>
        )}

        {/* SEKME 5: BİLDİRİM & SMS OTOMASYONU */}
        {activeTab === "notifications" && (
          <Panel
            title="Bildirim & SMS Otomasyon Kuralları"
            subtitle="SMS başlığı, aidat hatırlatıcıları ve acil durum yayınları"
          >
            <div className="settings-grid">
              <div className="grid-2-col">
                <Field label="Resmi SMS Gönderici Başlığı">
                  <input
                    value={notificationSettings.smsSenderTitle}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        smsSenderTitle: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Aidat Vade Hatırlatması (Kaç Gün Önce)">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={notificationSettings.smsDuesReminderDays}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        smsDuesReminderDays: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Smartphone size={18} className="text-gold" />
                    <strong>Otomatik Bildirim & Uyarı Tetikleyicileri</strong>
                  </div>
                  <span className="badge complete">SMS Ağ Geçidi Bağlı</span>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsOverdueAlert}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          smsOverdueAlert: e.target.checked,
                        })
                      }
                    />
                    <span>Vadesi 7 gün geçen ödenmemiş aidatlar için otomatik gecikme ikaz SMS'i gönder</span>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailMonthlyStatement}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailMonthlyStatement: e.target.checked,
                        })
                      }
                    />
                    <span>Her ay başında tüm kat maliklerine ve kiracılara aylık hesap ekstresini e-posta ile ilet</span>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={notificationSettings.urgentNoticeBroadcast}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          urgentNoticeBroadcast: e.target.checked,
                        })
                      }
                    />
                    <span>Su, elektrik kesintisi veya acil durumlarda toplu SMS duyurusu gönderilmesine izin ver</span>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={notificationSettings.requestStatusAlerts}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          requestStatusAlerts: e.target.checked,
                        })
                      }
                    />
                    <span>Sakin talepleri çözüldüğünde veya güncellendiğinde anlık bildirim ilet</span>
                  </label>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* SEKME 6: KVKK & SAKİN GİZLİLİK KURALLARI */}
        {activeTab === "privacy" && (
          <Panel
            title="KVKK & Sakin Bilgi Güvenliği Kuralları"
            subtitle="Kişisel verilerin korunması, komşuluk rehberi gizliliği ve yasal mevzuat ayarları"
          >
            <div className="settings-grid">
              <div className="privacy-info-callout">
                <Info size={20} className="text-gold flex-shrink-0" />
                <div className="text-xs">
                  <strong>6698 Sayılı KVKK ve Kat Mülkiyeti Kanunu Uyarınca:</strong>
                  <p className="mt-1 text-muted">
                    Sakinlerin telefon numaraları, borç bakiyeleri ve araç plakaları kişisel veri kapsamındadır. Yönetim kurulu bu verilerin üçüncü şahıslara ve diğer kat maliklerine gösterimini sınırlandırmakla yükümlüdür.
                  </p>
                </div>
              </div>

              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-gold" />
                    <strong>Görünürlük ve Paylaşım Kısıtlamaları</strong>
                  </div>
                  <span className="badge complete">KVKK Koruma Modu Aktif</span>
                </div>
                <div className="mt-2 flex flex-col gap-3">
                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={privacySettings.showResidentPhoneInDirectory}
                      onChange={(e) =>
                        setPrivacySettings({
                          ...privacySettings,
                          showResidentPhoneInDirectory: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Komşuluk rehberinde sakin telefonları diğer sakinlere gösterilsin</strong>
                      <span className="block text-xs text-muted">
                        Kapalı olduğunda sakinler birbirinin telefonunu göremez; sadece yönetici ve güvenlik personeli erişebilir.
                      </span>
                    </div>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={privacySettings.showLicensePlateInDirectory}
                      onChange={(e) =>
                        setPrivacySettings({
                          ...privacySettings,
                          showLicensePlateInDirectory: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Otopark rehberinde daire-plaka eşleşmesi sakinlere açık olsun</strong>
                      <span className="block text-xs text-muted">
                        Kapalı olduğunda hatalı park durumunda sakinler sadece güvenlik üzerinden anons talep edebilir.
                      </span>
                    </div>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={privacySettings.displayDebtorsOnBoard}
                      onChange={(e) =>
                        setPrivacySettings({
                          ...privacySettings,
                          displayDebtorsOnBoard: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Bina ortak panolarında borçlu daire listesi asılmasına izin ver</strong>
                      <span className="block text-xs text-muted">
                        Yargıtay ve KVKK kararları doğrultusunda isim soyisim yerine sadece daire numarası ile ilan edilir.
                      </span>
                    </div>
                  </label>

                  <label className="checkbox-item-custom">
                    <input
                      type="checkbox"
                      checked={privacySettings.requireManagementPlanConsent}
                      onChange={(e) =>
                        setPrivacySettings({
                          ...privacySettings,
                          requireManagementPlanConsent: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Yeni sakin üyeliklerinde Yönetim Planı & KVKK onayını zorunlu tut</strong>
                      <span className="block text-xs text-muted">
                        Sakin katılım kodu ile üye olurken dijital sözleşme onayı kaydedilir.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Ortak Kaydetme Aksiyonu */}
        <div className="settings-footer-actions mt-4">
          <Button type="submit">
            <Save size={16} /> Ayarları Kaydet & Senkronize Et
          </Button>
        </div>
      </form>
    </div>
  );
}
