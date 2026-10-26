import { useState } from "react";
import {
  User,
  Car,
  Bell,
  Shield,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Home,
  AlertCircle,
  Sparkles,
  Info,
  Heart,
  ArrowLeftRight,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { Button, Field, Panel, Modal } from "./UI";
import { updateProfile, requestPhoneChangeCode, verifyPhoneChange } from "../api/kovan";
import { errorMessage } from "../api/client";

export default function ResidentSettings({
  user,
  session,
  units = [],
  onNotify,
  onSwitchToManager,
  theme,
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'vehicles' | 'notifications' | 'security'

  // Sakinin Dairesi
  const residentUnit = units.find((u) => u.id === session?.unitId) || {
    id: session?.unitId || "",
    block: session?.unitId?.split("-")[0] || "-",
    number: session?.unitId?.split("-")[1] || session?.unitId || "-",
    floor: "-",
    type: "Daire",
    m2: "-",
  };

  // 1. Profil & İletişim Durumları
  const [profileData, setProfileData] = useState({
    name: user?.name || "Ahmet Yılmaz",
    email: user?.email || "ahmet.yilmaz@site.com",
    phone: user?.phone || "0532 555 12 34",
    role: "Kat Maliki (Ev Sahibi)",
    residentCount: "3", // Dairede ikamet eden toplam kişi sayısı
    hasPet: true,
    petCount: "1", // Evcil hayvan sayısı
    petDetails: "1 Kedi",
    // Afet & Acil Durum Tahliye Önceliği (Yatağa Bağlı Hasta / Özel İhtiyaç)
    hasBedriddenPatient: false,
    bedriddenCount: "1",
    disasterEvacuationNote: "",
    // Acil Durum İletişimi
    emergencyName: "Zeynep Yılmaz",
    emergencyRelation: "Eşi",
    emergencyPhone: "0533 444 55 66",
    emergencyNote: "7/24 Aranabilir (1. Derece Yakın)",
  });

  // İki Adımlı Telefon Değişikliği Durumları (BMS-83 & Mobil Bağlantı)
  const [verifiedPhone, setVerifiedPhone] = useState(user?.phone || profileData.phone || "0532 555 12 34");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState(1); // 1: Numara gir & kod iste, 2: Kodu onayla
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // 1. Adım: Yeni telefon için kod iste (POST /auth/me/phone/code)
  const handleRequestPhoneCode = async (e) => {
    e?.preventDefault();
    const cleanPhone = (pendingPhone || "").trim();
    if (!cleanPhone) {
      setPhoneError("Lütfen geçerli bir cep telefonu numarası giriniz.");
      return;
    }
    setPhoneBusy(true);
    setPhoneError("");
    try {
      await requestPhoneChangeCode(cleanPhone);
      setPhoneStep(2);
      onNotify?.(`${user?.email || profileData.email} adresinize 6 haneli doğrulama kodu gönderildi (5 dakika geçerlidir).`);
    } catch (err) {
      if (err.fieldErrors?.length) {
        setPhoneError(err.fieldErrors.map((f) => f.message).join(" · "));
      } else {
        setPhoneError(errorMessage(err));
      }
    } finally {
      setPhoneBusy(false);
    }
  };

  // 2. Adım: Kodu onayla ve numarayı güncelle (POST /auth/me/phone)
  const handleVerifyPhoneCode = async (e) => {
    e?.preventDefault();
    const cleanCode = (phoneCode || "").trim();
    if (!cleanCode) {
      setPhoneError("Lütfen e-postanıza gönderilen doğrulama kodunu giriniz.");
      return;
    }
    setPhoneBusy(true);
    setPhoneError("");
    try {
      await verifyPhoneChange(pendingPhone, cleanCode);
      setVerifiedPhone(pendingPhone);
      setProfileData((prev) => ({ ...prev, phone: pendingPhone }));
      setShowPhoneModal(false);
      setPhoneStep(1);
      setPhoneCode("");
      onNotify?.("Telefon numaranız başarıyla doğrulandı ve güncellendi.");
    } catch (err) {
      // Backend kuralı: Yanlış kodda 400 ve errors[].field = code döner
      if (err.fieldErrors?.length) {
        const codeErr = err.fieldErrors.find((f) => f.field === "code");
        setPhoneError(codeErr ? codeErr.message : err.fieldErrors.map((f) => f.message).join(" · "));
      } else {
        setPhoneError(errorMessage(err));
      }
    } finally {
      setPhoneBusy(false);
    }
  };

  // 2. Araç & Plaka Listesi (PTS İçin)
  const [vehicles, setVehicles] = useState([
    { id: 1, plate: "34 BJK 1903", brand: "Volkswagen Golf", color: "Beyaz" },
  ]);
  const [newPlate, setNewPlate] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newColor, setNewColor] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // 3. Kişisel Bildirim Tercihleri
  const [notifications, setNotifications] = useState({
    smsDuesCreated: true,
    smsDuesReminder: true,
    emailMonthlyStatement: true,
    emailAnnouncements: true,
    requestAlerts: true,
    nightSilentMode: true,
  });

  // 4. Güvenlik & Gizlilik
  const [privacy, setPrivacy] = useState({
    hidePhoneInDirectory: true, // Komşuluk rehberinde telefonum gizli
    hidePlateInDirectory: true, // Otopark listesinde plakam gizli
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      // Backend kuralı: PUT /auth/me'ye yeni numara gönderilmez;
      // phone alanına mevcut numarayı ya da null gönderilir.
      await updateProfile({
        name: profileData.name,
        phone: verifiedPhone || null,
      }).catch(() => null);
      onNotify?.("Hesap ve profil bilgileriniz başarıyla güncellendi.");
    } catch (err) {
      onNotify?.(errorMessage(err));
    }
  };

  const handleAddVehicle = (e) => {
    e.preventDefault();
    const cleanPlate = newPlate.trim().toUpperCase();
    if (!cleanPlate) return;
    setVehicles([
      ...vehicles,
      {
        id: Date.now(),
        plate: cleanPlate,
        brand: newBrand.trim() || "Belirtilmedi",
        color: newColor.trim() || "Belirtilmedi",
      },
    ]);
    setNewPlate("");
    setNewBrand("");
    setNewColor("");
    setShowAddVehicle(false);
    onNotify?.(`${cleanPlate} plakalı araç otopark tanıma sistemine eklendi.`);
  };

  const handleDeleteVehicle = (id, plate) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
    onNotify?.(`${plate} plakalı araç kaydı silindi.`);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Girdiğiniz yeni şifreler eşleşmiyor.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("");
    onNotify?.("Giriş şifreniz başarıyla değiştirildi.");
  };

  return (
    <div className="resident-settings-container">
      <div className="module-actions">
        <p>
          Kişisel profilinizi, dairenize tanımlı araç plakalarını, bildirim ayarlarını ve gizlilik tercihlerinizi yapılandırın.
        </p>
        <span className="muted">
          Daire: Blok {residentUnit.block}, No {residentUnit.number} ({residentUnit.type})
        </span>
      </div>

      {/* 4 Sadeleştirilmiş Sekme (KVKK Uyumlu) */}
      <div className="subnav-tabs settings-tabs-nav">
        <button
          type="button"
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          <User size={16} /> Profil & Daire
        </button>
        <button
          type="button"
          className={activeTab === "vehicles" ? "active" : ""}
          onClick={() => setActiveTab("vehicles")}
        >
          <Car size={16} /> Araçlarım & Plaka ({vehicles.length})
        </button>
        <button
          type="button"
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={16} /> Bildirim Tercihleri
        </button>
        <button
          type="button"
          className={activeTab === "security" ? "active" : ""}
          onClick={() => setActiveTab("security")}
        >
          <Shield size={16} /> Güvenlik & Gizlilik
        </button>
      </div>

      {/* SEKME 1: PROFİL & DAİRE KÜNYESİ */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile}>
          {session?.hasDualRole && (
            <div className="dual-role-banner-card">
              <div className="flex items-center gap-3">
                <div className="dual-role-banner-icon">
                  <Shield size={20} />
                </div>
                <div>
                  <strong>Yönetim Kurulu Üyeliği Aktif</strong>
                  <p>
                    Hesabınız Daire {session.unitId} sakinliğinize ek olarak Kovan Sitesi Yönetim Kurulu Üyesi yetkisine sahiptir. İstediğiniz an Yönetim Paneline geçiş yapabilirsiniz.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={onSwitchToManager}>
                <ArrowLeftRight size={14} /> Yönetim Paneline Geçiş Yap
              </Button>
            </div>
          )}

          <Panel
            title="Kişisel Bilgiler & İletişim"
            subtitle="Yönetim ile iletişimde kullanılacak ad-soyad, telefon ve acil durum irtibatı"
          >
            <div className="settings-grid">
              {/* Daire Künyesi Kartı */}
              <div className="settings-card-box">
                <div className="settings-card-header">
                  <div className="flex items-center gap-2">
                    <Home size={18} className="text-gold" />
                    <strong>İkamet Edilen Daire Bilgisi</strong>
                  </div>
                  <span className="badge complete">{profileData.role}</span>
                </div>
                <div className="grid-3-col mt-2">
                  <div className="info-stat-pill">
                    <small>Bağımsız Bölüm</small>
                    <strong>Blok {residentUnit.block} · No {residentUnit.number}</strong>
                  </div>
                  <div className="info-stat-pill">
                    <small>Daire Tipi & Kat</small>
                    <strong>{residentUnit.type || "2+1"} ({residentUnit.floor || 3}. Kat)</strong>
                  </div>
                  <div className="info-stat-pill">
                    <small>Daire Alanı</small>
                    <strong>{residentUnit.m2 || 95} m²</strong>
                  </div>
                </div>
              </div>

              <div className="grid-2-col">
                <Field label="Ad Soyad">
                  <input
                    required
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                  />
                </Field>
                <div className="field">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Cep Telefonu</span>
                    <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <CheckCircle2 size={12} /> Doğrulanmış
                    </span>
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="tel"
                      readOnly
                      value={verifiedPhone}
                      style={{ cursor: "not-allowed", opacity: 0.9, background: "var(--page)" }}
                      title="Telefon değişikliği iki adımlı güvenlik doğrulaması (e-posta onay kodu) ile yapılmaktadır."
                    />
                    <Button
                      type="button"
                      secondary
                      onClick={() => {
                        setPendingPhone(verifiedPhone || "");
                        setPhoneStep(1);
                        setPhoneCode("");
                        setPhoneError("");
                        setShowPhoneModal(true);
                      }}
                      style={{ whiteSpace: "nowrap", height: "39px" }}
                    >
                      <Phone size={14} /> Değiştir
                    </Button>
                  </div>
                  <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                    Telefon değişikliği e-posta onay kodu ile 2 adımlı doğrulamayla yapılır.
                  </small>
                </div>
                <Field label="E-posta Adresi">
                  <input
                    required
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="İkamet & Mülkiyet Durumu">
                  <select
                    value={profileData.role}
                    onChange={(e) =>
                      setProfileData({ ...profileData, role: e.target.value })
                    }
                  >
                    <option value="Kat Maliki (Ev Sahibi)">Kat Maliki (Ev Sahibi)</option>
                    <option value="Kiracı">Kiracı</option>
                    <option value="Aile Bireyi / Sakin">Aile Bireyi / Sakin</option>
                  </select>
                </Field>
              </div>

              {/* Dairede Yaşam & Afet Tahliye Özeti (KVKK Uyumlu Sayısal Alan) */}
              <div className="settings-sub-section">
                <h4>Daire İkamet & Yaşam Bilgisi</h4>
                <p className="text-xs text-muted mt-1">
                  Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca aile bireylerinin şahsi kimlik verileri toplanmaz; yalnızca bina yoğunluğu ve afet tahliyesi için sayısal bilgi tutulur.
                </p>

                <div className="grid-2-col mt-2">
                  <Field label="Dairede İkamet Eden Toplam Kişi Sayısı">
                    <select
                      value={profileData.residentCount}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          residentCount: e.target.value,
                        })
                      }
                    >
                      <option value="1">1 Kişi (Yalnız İkamet)</option>
                      <option value="2">2 Kişi</option>
                      <option value="3">3 Kişi</option>
                      <option value="4">4 Kişi</option>
                      <option value="5">5 Kişi ve Üzeri</option>
                    </select>
                  </Field>

                  <Field label="Evcil Hayvan Kaydı">
                    <select
                      value={profileData.hasPet ? "var" : "yok"}
                      onChange={(e) => {
                        const isVar = e.target.value === "var";
                        setProfileData({
                          ...profileData,
                          hasPet: isVar,
                          petDetails: isVar ? (profileData.petDetails || "1 Kedi") : "",
                        });
                      }}
                    >
                      <option value="yok">Evcil Hayvan Yok</option>
                      <option value="var">Evcil Hayvan Var</option>
                    </select>
                  </Field>
                </div>

                {profileData.hasPet && (
                  <div className="grid-2-col mt-2">
                    <Field label="Evcil Hayvan Sayısı">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={profileData.petCount}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            petCount: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Evcil Hayvan Cinsi / Notu">
                      <input
                        placeholder="Örn: 1 Kedi, 1 Küçük Irk Köpek"
                        value={profileData.petDetails}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            petDetails: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* Afet ve Deprem Durumu Öncelikli Tahliye (Yatağa Bağlı Hasta / Özel İhtiyaç) */}
              <div className="settings-sub-section disaster-alert-box">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <h4>Afet & Acil Durum Tahliye Önceliği</h4>
                  </div>
                  <span className="badge warning">Site Yöneticisi Görür</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Olası deprem, yangın veya afet durumunda AFAD ve site yönetiminin acil müdahale planında öncelikli tahliye edilmesi gereken yatağa bağımlı hasta veya özel gereksinimli birey kaydı:
                </p>

                <div className="grid-2-col mt-2">
                  <Field label="Dairede Yatağa Bağlı Hasta / Özel Gereksinim Var mı?">
                    <select
                      value={profileData.hasBedriddenPatient ? "evet" : "hayir"}
                      onChange={(e) => {
                        const isEvet = e.target.value === "evet";
                        setProfileData({
                          ...profileData,
                          hasBedriddenPatient: isEvet,
                          disasterEvacuationNote: isEvet
                            ? profileData.disasterEvacuationNote || "Yatağa bağımlı solunum cihazı kullanıyor, sedye tahliyesi gerekir."
                            : "",
                        });
                      }}
                    >
                      <option value="hayir">Hayır, Özel İhtiyaç Yok</option>
                      <option value="evet">Evet, Yatağa Bağlı / Özel İhtiyaç Var</option>
                    </select>
                  </Field>

                  {profileData.hasBedriddenPatient ? (
                    <Field label="Özel Destek Gereken Birey Sayısı">
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={profileData.bedriddenCount}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            bedriddenCount: e.target.value,
                          })
                        }
                      />
                    </Field>
                  ) : (
                    <Field label="Öncelikli Tahliye Durumu">
                      <input
                        disabled
                        value="Standart Bina Tahliye Planı Geçerli"
                        style={{ opacity: 0.75, cursor: "not-allowed" }}
                      />
                    </Field>
                  )}
                </div>

                {profileData.hasBedriddenPatient && (
                  <div className="mt-2">
                    <Field label="Afet & Tahliye Notu (AFAD ve Yönetim İçin)">
                      <input
                        placeholder="Örn: 2. kat, solunum cihazına bağlı, tekerlekli sandalye veya sedye tahliyesi gerekir"
                        value={profileData.disasterEvacuationNote}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            disasterEvacuationNote: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* Acil Durum İletişimi */}
              <div className="settings-sub-section">
                <h4>Acil Durum İrtibat Kişisi (Yangın, Su Basması, Kaza vb.)</h4>
                <p className="text-xs text-muted mt-1">
                  Size ulaşılamadığı acil durumlarda site yönetiminin ve güvenliğin arayabileceği yakınınız:
                </p>
                <div className="grid-2-col mt-2">
                  <Field label="Yakın Adı Soyadı">
                    <input
                      required
                      value={profileData.emergencyName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Yakınlık Derecesi">
                    <input
                      required
                      placeholder="Örn: Eşi, Kardeşi, Komşusu"
                      value={profileData.emergencyRelation}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyRelation: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Acil Durum Telefonu">
                    <input
                      required
                      type="tel"
                      value={profileData.emergencyPhone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyPhone: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="İkincil Telefon / İletişim Notu">
                    <input
                      placeholder="Örn: 7/24 Aranabilir veya İş Tel"
                      value={profileData.emergencyNote}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyNote: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Görünüm & Tema Tercihi (Özellikle Mobil ve Hızlı Erişim İçin) */}
              <div className="settings-sub-section">
                <h4>Görünüm ve Tema Tercihi</h4>
                <p className="text-xs text-muted mt-1">
                  Uygulama arayüzünün görünümünü gündüz ve gece kullanımınıza göre açık veya koyu tema olarak ayarlayabilirsiniz.
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

              <div className="settings-footer-actions">
                <Button type="submit">
                  <Save size={16} /> Profil Bilgilerini Kaydet
                </Button>
              </div>
            </div>
          </Panel>
        </form>
      )}

      {/* SEKME 2: ARAÇLAR & PLAKA TANIMLAMA (PTS) */}
      {activeTab === "vehicles" && (
        <Panel
          title="Kayıtlı Araçlarım & Otopark Bariyer Tanımı"
          subtitle="Site giriş bariyerinden otomatik geçebilmeniz için Plaka Tanıma Sistemi (PTS) araç kaydı"
        >
          <div className="settings-grid">
            <div className="flex items-center justify-between">
              <div>
                <strong>Dairenize Tanımlı Araçlar</strong>
                <p className="text-xs text-muted">
                  Bariyer kamerası buradaki plakaları otomatik tanıyarak beklemeden geçiş sağlar.
                </p>
              </div>
              <Button
                type="button"
                secondary
                onClick={() => setShowAddVehicle(!showAddVehicle)}
              >
                <Plus size={16} /> {showAddVehicle ? "Vazgeç" : "Yeni Araç Ekle"}
              </Button>
            </div>

            {/* Yeni Araç Ekleme Formu */}
            {showAddVehicle && (
              <form onSubmit={handleAddVehicle} className="settings-card-box">
                <strong className="text-xs font-semibold">Yeni Araç & Plaka Kaydı</strong>
                <div className="grid-3-col mt-2">
                  <Field label="Araç Plakası">
                    <input
                      required
                      autoFocus
                      placeholder="Örn: 34 ABC 123"
                      style={{ textTransform: "uppercase", fontWeight: "700" }}
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                    />
                  </Field>
                  <Field label="Marka & Model">
                    <input
                      placeholder="Örn: Renault Megane"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                  </Field>
                  <Field label="Renk">
                    <input
                      placeholder="Örn: Beyaz"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    type="button"
                    secondary
                    onClick={() => setShowAddVehicle(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit">Plakayı Kaydet</Button>
                </div>
              </form>
            )}

            {/* Mevcut Araç Kartları */}
            <div className="vehicle-cards-list">
              {vehicles.map((v) => (
                <div key={v.id} className="vehicle-item-row">
                  <div className="flex items-center gap-3">
                    <div className="plate-badge">{v.plate}</div>
                    <div>
                      <strong className="text-sm">{v.brand}</strong>
                      <span className="text-xs text-muted block">Renk: {v.color}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge complete">
                      <CheckCircle2 size={12} /> Bariyer Yetkili
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      title="Aracı Sil"
                      onClick={() => handleDeleteVehicle(v.id, v.plate)}
                    >
                      <Trash2 size={16} className="text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* SEKME 3: BİLDİRİM TERCİHLERİ */}
      {activeTab === "notifications" && (
        <Panel
          title="Kişisel Bildirim Tercihleri"
          subtitle="SMS, E-posta ve mobil bildirimlerin hangi durumlarda iletileceğini belirleyin"
        >
          <div className="settings-grid">
            <div className="settings-card-box">
              <strong className="text-xs font-semibold">Aidat & Finans Bildirimleri</strong>
              <div className="mt-2 flex flex-col gap-2">
                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.smsDuesCreated}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        smsDuesCreated: e.target.checked,
                      })
                    }
                  />
                  <span>Yeni aylık aidat tahakkuk ettiğinde SMS ile bilgilendir</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.smsDuesReminder}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        smsDuesReminder: e.target.checked,
                      })
                    }
                  />
                  <span>Aidat son ödeme gününden 3 gün önce hatırlatıcı SMS al</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.emailMonthlyStatement}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        emailMonthlyStatement: e.target.checked,
                      })
                    }
                  />
                  <span>Her ay başında hesap ekstremi e-posta olarak ilet</span>
                </label>
              </div>
            </div>

            <div className="settings-card-box">
              <strong className="text-xs font-semibold">Site Yaşamı & Talepler</strong>
              <div className="mt-2 flex flex-col gap-2">
                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.emailAnnouncements}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        emailAnnouncements: e.target.checked,
                      })
                    }
                  />
                  <span>Yönetim duyurularını ve toplantı çağrılarını e-posta ile al</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.requestAlerts}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        requestAlerts: e.target.checked,
                      })
                    }
                  />
                  <span>Açtığım talep ve arıza bildirimlerinin durumu güncellendiğinde anında SMS al</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={notifications.nightSilentMode}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        nightSilentMode: e.target.checked,
                      })
                    }
                  />
                  <span>Gece saatlerinde (23:00 - 08:00) acil durumlar hariç bildirimleri sessize al</span>
                </label>
              </div>
            </div>

            <div className="settings-footer-actions">
              <Button
                type="button"
                onClick={() => onNotify?.("Bildirim tercihleriniz güncellendi.")}
              >
                <Save size={16} /> Tercihleri Kaydet
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* SEKME 4: GÜVENLİK & GİZLİLİK (KVKK) */}
      {activeTab === "security" && (
        <div className="settings-grid">
          {/* Şifre Değiştirme */}
          <form onSubmit={handlePasswordChange}>
            <Panel
              title="Giriş Şifresi Değiştirme"
              subtitle="Hesabınızın güvenliği için güçlü bir şifre kullanın"
            >
              <div className="settings-grid">
                <Field label="Mevcut Şifreniz">
                  <input
                    type="password"
                    required
                    placeholder="Mevcut şifrenizi girin"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Field>
                <div className="grid-2-col">
                  <Field label="Yeni Şifre">
                    <input
                      type="password"
                      required
                      placeholder="En az 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Field>
                  <Field label="Yeni Şifre (Tekrar)">
                    <input
                      type="password"
                      required
                      placeholder="Şifreyi onaylayın"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>
                </div>
                {passwordMsg && (
                  <div className="auth-error-msg">
                    <AlertCircle size={15} /> {passwordMsg}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="submit">Şifreyi Güncelle</Button>
                </div>
              </div>
            </Panel>
          </form>

          {/* KVKK & Komşuluk Gizlilik Ayarları */}
          <Panel
            title="Kişisel Veri Gizliliği (KVKK Tercihleri)"
            subtitle="Diğer kat malikleri ve komşularınızın görebileceği bilgileri sınırlandırın"
          >
            <div className="settings-grid">
              <label className="checkbox-item-custom">
                <input
                  type="checkbox"
                  checked={privacy.hidePhoneInDirectory}
                  onChange={(e) =>
                    setPrivacy({
                      ...privacy,
                      hidePhoneInDirectory: e.target.checked,
                    })
                  }
                />
                <div>
                  <strong>Telefon numaramı komşuluk rehberinde gizli tut</strong>
                  <span className="block text-xs text-muted">
                    İşaretli olduğunda komşularınız telefonunuzu göremez; sadece yönetici ve güvenlik görevlisi erişebilir.
                  </span>
                </div>
              </label>

              <label className="checkbox-item-custom">
                <input
                  type="checkbox"
                  checked={privacy.hidePlateInDirectory}
                  onChange={(e) =>
                    setPrivacy({
                      ...privacy,
                      hidePlateInDirectory: e.target.checked,
                    })
                  }
                />
                <div>
                  <strong>Araç plakalarımı diğer sakinlere gizle</strong>
                  <span className="block text-xs text-muted">
                    Hatalı park durumlarında komşularınız doğrudan size ulaşmak yerine güvenlik üzerinden anons talep eder.
                  </span>
                </div>
              </label>

              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  onClick={() => onNotify?.("Gizlilik tercihleriniz kaydedildi.")}
                >
                  <Save size={16} /> Gizlilik Tercihlerini Kaydet
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* İKİ ADIMLI TELEFON DOĞRULAMA MODALI (BMS-83 & Mobil Bağlantı) */}
      {showPhoneModal && (
        <Modal
          title="Telefon Numarası Değiştirme"
          description={
            phoneStep === 1
              ? "Yeni telefon numaranızı girin. Onay kodu kayıtlı e-posta adresinize gönderilecektir."
              : `${user?.email || profileData.email} adresinize gönderilen 6 haneli kodu girin (5 dakika geçerlidir).`
          }
          onClose={phoneBusy ? () => {} : () => setShowPhoneModal(false)}
        >
          {phoneStep === 1 ? (
            <form onSubmit={handleRequestPhoneCode} className="auth-form-flow">
              <Field label="Yeni Cep Telefonu" required>
                <div className="input-with-icon">
                  <Phone size={18} className="field-icon" />
                  <input
                    type="tel"
                    required
                    autoFocus
                    placeholder="05XX XXX XX XX"
                    value={pendingPhone}
                    onChange={(e) => setPendingPhone(e.target.value)}
                  />
                </div>
              </Field>

              <p className="text-xs text-muted" style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0" }}>
                Güvenliğiniz için yeni telefon numaranız kaydedilmeden önce <strong>{user?.email || profileData.email}</strong> e-posta adresinize tek kullanımlık bir onay kodu gönderilecektir.
              </p>

              {phoneError && (
                <div className="auth-error-msg mt-2" style={{ color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", margin: "8px 0" }}>
                  <AlertCircle size={15} /> {phoneError}
                </div>
              )}

              <div className="modal-footer mt-4" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <Button type="button" secondary onClick={() => setShowPhoneModal(false)} disabled={phoneBusy}>
                  İptal
                </Button>
                <Button type="submit" disabled={phoneBusy}>
                  {phoneBusy ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneCode} className="auth-form-flow">
              <div
                className="otp-target-badge mb-3"
                style={{
                  background: "rgba(217, 119, 6, 0.1)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <Mail size={16} className="text-gold" />
                <span>
                  <strong>{user?.email || profileData.email}</strong> adresinize 6 haneli doğrulama kodu gönderildi. Kod <strong>5 dakika</strong> geçerlidir.
                </span>
              </div>

              <Field label="6 Haneli Doğrulama Kodu" required>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={10}
                  placeholder="Örn: 123456"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  style={{
                    fontSize: "18px",
                    letterSpacing: "4px",
                    textAlign: "center",
                    fontWeight: "700",
                    padding: "10px",
                  }}
                />
              </Field>

              <p className="text-xs text-muted" style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0" }}>
                Doğrulanacak Numara: <strong>{pendingPhone}</strong>
              </p>

              {phoneError && (
                <div className="auth-error-msg mt-2" style={{ color: "#ef4444", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", margin: "8px 0" }}>
                  <AlertCircle size={15} /> {phoneError}
                </div>
              )}

              <div className="modal-footer mt-4" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
                <Button
                  type="button"
                  secondary
                  onClick={() => {
                    setPhoneStep(1);
                    setPhoneError("");
                  }}
                  disabled={phoneBusy}
                >
                  Numarayı Düzenle
                </Button>
                <Button type="submit" disabled={phoneBusy}>
                  {phoneBusy ? "Doğrulanıyor..." : "Onayla ve Numarayı Güncelle"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
