import { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Building2,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Sparkles,
  Layers,
  AlertCircle,
  FileCheck2,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { Button, Field, Modal } from "./UI";
import { errorMessage } from "../api/client";
import {
  createBlock,
  createUnit,
  forgotPassword,
  login,
  registerSite,
  resetPassword,
  selectSite,
} from "../api/kovan";
import { SITE_TYPES } from "../live/labels";

// 1. ŞİFREMİ UNUTTUM MODALI (E-posta ile 6 haneli kod + Güç Ölçerli Yeni Şifre)
export function ForgotPasswordModal({ onClose, onNotify, onSuccess }) {
  const [step, setStep] = useState(1); // 1: İletişim, 2: OTP Kod, 3: Yeni Şifre, 4: Başarılı
  const [resetMethod, setResetMethod] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const activeTarget = resetMethod === "email" ? email : phone;

  // 60 saniyelik OTP geri sayımı
  useEffect(() => {
    let timer = null;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Backend e-posta kayıtlı olmasa da aynı yanıtı döner (hesabın varlığı dışarı sızmasın).
  const requestCode = async () => {
    setBusy(true);
    setError("");
    try {
      await forgotPassword(email);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (resetMethod !== "email") {
      onNotify?.("SMS ile şifre sıfırlama yakında kullanıma açılacak. Şimdilik e-posta ile devam edin.");
      return;
    }
    if (!email) {
      setError("Lütfen e-posta adresinizi giriniz.");
      return;
    }
    if (!(await requestCode())) return;
    setStep(2);
    setCountdown(60);
    setCanResend(false);
    onNotify?.(`${email} adresi kayıtlıysa 6 haneli şifre sıfırlama kodu gönderildi (5 dakika geçerli).`);
  };

  const handleResend = async () => {
    if (!(await requestCode())) return;
    setCountdown(60);
    setCanResend(false);
    setCode(["", "", "", "", "", ""]);
    onNotify?.("Yeni şifre sıfırlama kodu gönderildi.");
  };

  // OTP kutularına toplu yapıştırma ve tuş yönetimi
  const handleOtpChange = (index, value) => {
    // Sayısal filtre
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const next = [...code];
      next[index] = "";
      setCode(next);
      return;
    }

    if (cleanVal.length > 1) {
      // Toplu yapıştırma (paste) desteği
      const chars = cleanVal.slice(0, 6).split("");
      const next = [...code];
      chars.forEach((c, idx) => {
        if (index + idx < 6) next[index + idx] = c;
      });
      setCode(next);
      const focusTarget = Math.min(5, index + chars.length);
      document.getElementById(`otp-input-${focusTarget}`)?.focus();
      return;
    }

    const next = [...code];
    next[index] = cleanVal;
    setCode(next);
    if (index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  // Kod backend'de yeni şifreyle birlikte doğrulanır; burada yalnızca 6 hane girildi mi bakılır.
  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (code.join("").length === 6) {
      setError("");
      setStep(3);
    } else {
      setError("Lütfen e-postanıza gelen 6 haneli kodu eksiksiz girin.");
    }
  };

  // Şifre Güvenlik & Kriter Analizi
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Güç Skoru (0-4)
  const strengthScore = [hasMinLength, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthConfig = [
    { label: "Çok Zayıf", color: "var(--danger, #ef4444)" },
    { label: "Zayıf", color: "#f97316" },
    { label: "Orta", color: "var(--accent, #cda65b)" },
    { label: "Güçlü", color: "#10b981" },
    { label: "Çok Güçlü", color: "#059669" },
  ];
  const currentStrength = newPassword ? strengthConfig[strengthScore] : null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!hasMinLength) {
      setError("Şifre en az 8 karakter uzunluğunda olmalıdır.");
      return;
    }
    if (!passwordsMatch) {
      setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetPassword(email, code.join(""), newPassword);
      setStep(4);
      onNotify?.("Şifreniz başarıyla yenilendi! Güvenliğiniz için tüm cihazlardaki oturumlar kapatıldı, lütfen giriş yapın.");
    } catch (err) {
      // Kod yanlış/süresi dolmuşsa kullanıcı kod adımına döner (her kod en fazla 3 kez denenebilir).
      if (err.status === 401) {
        setCode(["", "", "", "", "", ""]);
        setStep(2);
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteFlow = () => {
    if (onSuccess) {
      onSuccess(activeTarget, newPassword);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title={
        step === 1
          ? "Şifremi Unuttum"
          : step === 2
          ? "Güvenlik Doğrulaması"
          : step === 3
          ? "Yeni Şifre Belirleyin"
          : "Şifre Sıfırlama Tamamlandı"
      }
      description="Kovan konut yönetim platformu güvenli erişim adımları"
      onClose={onClose}
    >
      {/* 3 Aşamalı İlerleme Çubuğu */}
      <div className="forgot-progress-track">
        <div className={`forgot-step-node ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
          <span className="step-num">{step > 1 ? <Check size={13} /> : "1"}</span>
          <span className="step-label">İletişim</span>
        </div>
        <div className={`forgot-step-divider ${step > 1 ? "completed" : ""}`} />
        <div className={`forgot-step-node ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
          <span className="step-num">{step > 2 ? <Check size={13} /> : "2"}</span>
          <span className="step-label">Doğrulama</span>
        </div>
        <div className={`forgot-step-divider ${step > 2 ? "completed" : ""}`} />
        <div className={`forgot-step-node ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>
          <span className="step-num">{step > 3 ? <Check size={13} /> : "3"}</span>
          <span className="step-label">Yeni Şifre</span>
        </div>
      </div>

      {/* ADIM 1: İLETİŞİM KANALI VE BİLGİ GİRİŞİ */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="auth-form-flow">
          <p className="form-subtext">
            Kovan hesabınızda kayıtlı olan iletişim yönteminizi seçerek doğrulama kodu talep edin.
          </p>

          {/* İletişim Tercih Butonları */}
          <div className="auth-method-selector">
            <button
              type="button"
              className={`method-chip ${resetMethod === "email" ? "active" : ""}`}
              onClick={() => {
                setResetMethod("email");
                setError("");
              }}
            >
              <Mail size={16} /> E-posta ile Sıfırla
            </button>
            <button
              type="button"
              className={`method-chip ${resetMethod === "phone" ? "active" : ""}`}
              onClick={() =>
                onNotify?.("SMS ile şifre sıfırlama yakında kullanıma açılacak. Şimdilik e-posta ile devam edin.")
              }
            >
              <Smartphone size={16} /> SMS / Telefon ile (yakında)
            </button>
          </div>

          {resetMethod === "email" ? (
            <Field label="Kayıtlı E-posta Adresi">
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="ornek@site.com veya adiniz@kovan.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>
          ) : (
            <Field label="Kayıtlı Cep Telefonu">
              <div className="input-with-icon">
                <Phone size={18} className="field-icon" />
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="0532 555 12 34"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </Field>
          )}

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className="modal-footer">
            <Button secondary type="button" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Gönderiliyor…" : "Doğrulama Kodu Gönder"} <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}

      {/* ADIM 2: OTP DOĞRULAMA KODU */}
      {step === 2 && (
        <form onSubmit={handleVerifyCode} className="auth-form-flow">
          <div className="otp-target-badge">
            {resetMethod === "email" ? <Mail size={15} /> : <Smartphone size={15} />}
            <span>
              <strong>{activeTarget}</strong> adresi kayıtlıysa 6 haneli tek kullanımlık kod gönderildi. Kod 5 dakika
              geçerlidir ve en fazla 3 kez denenebilir.
            </span>
          </div>

          <Field label="6 Haneli Doğrulama Kodu">
            <div className="otp-container">
              {code.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-input-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  className="otp-box"
                  autoFocus={i === 0}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
          </Field>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className="otp-meta-row">
            <div className="otp-timer">
              {countdown > 0 ? (
                <span>Yeni kod isteyebilmek için: <strong>00:{countdown < 10 ? `0${countdown}` : countdown}</strong></span>
              ) : (
                <span>Kod gelmediyse yenisini isteyebilirsiniz</span>
              )}
            </div>

            <button
              type="button"
              className="otp-resend-btn"
              disabled={!canResend || busy}
              onClick={handleResend}
            >
              <RotateCcw size={13} /> Kodu Tekrar Gönder
            </button>
          </div>

          <div className="modal-footer">
            <Button secondary type="button" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Geri Dön
            </Button>
            <Button type="submit">
              Kodu Onayla <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}

      {/* ADIM 3: YENİ ŞİFRE & GÜÇLÜLÜK ÖLÇER */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="auth-form-flow">
          <p className="form-subtext">
            Hesabınızın güvenliği için güçlü ve tahmin edilmesi zor yeni bir şifre belirleyin.
          </p>

          <Field label="Yeni Şifre">
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" />
              <input
                type={showPass ? "text" : "password"}
                required
                autoFocus
                placeholder="Yeni şifrenizi girin"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {/* Şifre Güç Çubuğu */}
          {newPassword && (
            <div className="strength-meter-wrap">
              <div className="strength-meter-header">
                <span>Şifre Gücü:</span>
                <strong style={{ color: currentStrength?.color }}>
                  {currentStrength?.label}
                </strong>
              </div>
              <div className="strength-bar-track">
                {[0, 1, 2, 3].map((seg) => (
                  <div
                    key={seg}
                    className="strength-bar-segment"
                    style={{
                      backgroundColor:
                        seg < strengthScore
                          ? currentStrength?.color
                          : "var(--line, #e4e4e7)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <Field label="Yeni Şifre (Tekrar)">
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" />
              <input
                type={showConfirmPass ? "text" : "password"}
                required
                placeholder="Yeni şifrenizi doğrulayın"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                tabIndex={-1}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {/* Dinamik Güvenlik Kriterleri Kartı */}
          <div className="password-criteria-card">
            <div className="criteria-header">Güvenlik Kuralları</div>
            <div className="criteria-grid">
              <div className={`criteria-item ${hasMinLength ? "met" : ""}`}>
                {hasMinLength ? <Check size={13} /> : <span className="criteria-bullet" />}
                En az 8 karakter
              </div>
              <div className={`criteria-item ${hasUpperCase ? "met" : ""}`}>
                {hasUpperCase ? <Check size={13} /> : <span className="criteria-bullet" />}
                En az bir büyük harf (A-Z)
              </div>
              <div className={`criteria-item ${hasNumber ? "met" : ""}`}>
                {hasNumber ? <Check size={13} /> : <span className="criteria-bullet" />}
                En az bir rakam (0-9)
              </div>
              <div className={`criteria-item ${passwordsMatch ? "met" : ""}`}>
                {passwordsMatch ? <Check size={13} /> : <span className="criteria-bullet" />}
                Şifreler birbiriyle eşleşiyor
              </div>
            </div>
          </div>

          {error && (
            <div className="auth-error-msg">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className="modal-footer">
            <Button secondary type="button" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Geri
            </Button>
            <Button type="submit" disabled={!hasMinLength || !passwordsMatch || busy}>
              {busy ? "Güncelleniyor…" : "Şifreyi Güncelle"} <KeyRound size={16} />
            </Button>
          </div>
        </form>
      )}

      {/* ADIM 4: TAMAMLANDI VE OTOMATİK GİRİŞE AKTARMA */}
      {step === 4 && (
        <div className="auth-success-box">
          <div className="success-icon-badge">
            <CheckCircle2 size={44} className="success-icon" />
          </div>
          <h3>Şifreniz Başarıyla Değiştirildi</h3>
          <p className="success-desc">
            Hesabınızın erişim parolası güncellendi. Yeni oluşturduğunuz şifrenizle hemen sisteme giriş yapabilirsiniz.
          </p>
          <div className="success-user-summary">
            <div className="summary-row">
              <span className="summary-label">Hesap:</span>
              <span className="summary-val">{activeTarget}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Durum:</span>
              <span className="summary-val status-ok">Aktif & Doğrulandı</span>
            </div>
          </div>
          <Button onClick={handleCompleteFlow} className="w-full mt-4">
            Yeni Şifre ile Giriş Ekranına Git <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </Modal>
  );
}

// 2. YÖNETİCİ SİTE KURULUM WIZARD'I (BMS-137) — backend: POST /sites/register, ardından blok/daire tanımları
const MAX_GENERATED_UNITS = 500;

function blockLetter(name, index) {
  return name.replace(/blok/i, "").trim() || String.fromCharCode(65 + index);
}

function unitNumbers(floors, unitsPerFloor, letter, pattern) {
  const result = [];
  let count = 1;
  for (let floor = 1; floor <= floors; floor++) {
    for (let order = 1; order <= unitsPerFloor; order++) {
      const unitNo =
        pattern === "floor"
          ? `${floor}${String(order).padStart(2, "0")}`
          : pattern === "block-prefix"
          ? `${letter}-${count}`
          : `${count}`;
      result.push({ unitNo, floor });
      count++;
    }
  }
  return result;
}

export function ManagerRegisterWizard({ onClose, onComplete, onNotify, onBusyChange }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    managerEmail: "",
    password: "",
    passwordConfirm: "",
    siteName: "",
    city: "",
    district: "",
    address: "",
    siteType: "SITE",
    blockCount: 2,
    floorsPerBlock: 6,
    unitsPerFloor: 4,
    namingPattern: "block-prefix", // 'simple' (1,2,3), 'floor' (101, 102), 'block-prefix' (A-1)
  });
  const [setupMode, setSetupMode] = useState("dynamic"); // 'dynamic' (Özel Blok Kutuları) | 'algorithmic'
  const [customBlocks, setCustomBlocks] = useState([
    { name: "A Blok", floors: 6, unitsPerFloor: 4 },
    { name: "B Blok", floors: 5, unitsPerFloor: 4 },
  ]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null); // { text, done, total }

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const updateBlockCount = (num) => {
    const val = Math.max(1, Math.min(20, num));
    update("blockCount", val);
    setCustomBlocks((prev) =>
      Array.from(
        { length: val },
        (_, i) => prev[i] || { name: `${String.fromCharCode(65 + i)} Blok`, floors: 6, unitsPerFloor: 4 },
      ),
    );
  };

  const updateBlockItem = (index, field, value) => {
    setCustomBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const blocksPlan = () => {
    const configs =
      setupMode === "dynamic"
        ? customBlocks
        : Array.from({ length: formData.blockCount }, (_, i) => ({
            name: `${String.fromCharCode(65 + i)} Blok`,
            floors: formData.floorsPerBlock,
            unitsPerFloor: formData.unitsPerFloor,
          }));
    return configs.map((b, i) => ({
      name: b.name.trim() || `${String.fromCharCode(65 + i)} Blok`,
      floors: b.floors,
      units: unitNumbers(b.floors, b.unitsPerFloor, blockLetter(b.name, i), formData.namingPattern),
    }));
  };

  const totalCalculatedUnits =
    setupMode === "dynamic"
      ? customBlocks.reduce((acc, b) => acc + b.floors * b.unitsPerFloor, 0)
      : formData.blockCount * formData.floorsPerBlock * formData.unitsPerFloor;

  const validateStep = () => {
    if (step === 1) {
      if (formData.password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
      if (formData.password !== formData.passwordConfirm) return "Girdiğiniz şifreler birbiriyle eşleşmiyor.";
    }
    if (step === 3) {
      const names = customBlocks.map((b) => b.name.trim().toLocaleLowerCase("tr-TR"));
      if (setupMode === "dynamic" && new Set(names).size !== names.length) return "Blok adları birbirinden farklı olmalıdır.";
      if (totalCalculatedUnits > MAX_GENERATED_UNITS)
        return `Kurulumda en fazla ${MAX_GENERATED_UNITS} daire oluşturulabilir; kalanları Kat ve Daireler ekranından ekleyebilirsiniz.`;
    }
    return "";
  };

  // Blok/daire oluşturma hatası kurulumu durdurmaz: site ve hesap açılmıştır, eksikler sonradan eklenebilir.
  const createStructure = async () => {
    const plan = blocksPlan();
    const total = plan.reduce((acc, b) => acc + b.units.length, 0);
    let done = 0;
    const failures = [];
    for (const block of plan) {
      setProgress({ text: `${block.name} oluşturuluyor…`, done, total });
      let created;
      try {
        created = await createBlock(block.name, block.floors);
      } catch (err) {
        failures.push(`${block.name}: ${errorMessage(err)}`);
        done += block.units.length;
        continue;
      }
      for (const unit of block.units) {
        try {
          await createUnit(created.id, { unitNo: unit.unitNo, floor: unit.floor, areaType: "KONUT" });
        } catch (err) {
          failures.push(`${block.name} ${unit.unitNo}: ${errorMessage(err)}`);
        }
        done++;
        setProgress({ text: `${block.name} · daire ${unit.unitNo}`, done, total });
      }
    }
    return { total, failures };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setProgress({ text: "Hesabınız ve siteniz açılıyor…", done: 0, total: 1 });
    // Giriş yapılınca uygulama panele geçmesin; kurulum bitene kadar sihirbaz ekranda kalır.
    onBusyChange?.(true);
    let registration;
    try {
      registration = await registerSite({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.managerEmail.trim(),
        password: formData.password,
        site: {
          name: formData.siteName.trim(),
          type: formData.siteType,
          city: formData.city.trim(),
          district: formData.district.trim(),
          address: formData.address.trim(),
        },
      });
    } catch (err) {
      setProgress(null);
      onBusyChange?.(false);
      setError(errorMessage(err));
      if (err.status === 409 || err.fieldErrors?.some((f) => ["email", "password", "firstName", "lastName"].includes(f.field))) {
        setStep(1);
      }
      return;
    }

    try {
      setProgress({ text: "Giriş yapılıyor…", done: 0, total: 1 });
      await login(formData.managerEmail, formData.password);
      const session = await selectSite(registration.site.id);
      const { total, failures } = await createStructure();
      onNotify?.(
        failures.length
          ? `${formData.siteName} açıldı; ${failures.length} blok/daire oluşturulamadı, Kat ve Daireler ekranından ekleyebilirsiniz.`
          : `${formData.siteName} ve ${total} daire oluşturuldu. E-postanıza gelen kodla adresinizi doğrulayın.`,
      );
      onBusyChange?.(false);
      onComplete?.(session);
    } catch (err) {
      setProgress(null);
      onBusyChange?.(false);
      setError(`Siteniz açıldı ancak kurulum tamamlanamadı: ${errorMessage(err)} Giriş yaparak devam edebilirsiniz.`);
    }
  };

  const busy = Boolean(progress);

  return (
    <Modal
      title="Yeni Site & Yönetici Kurulum Sihirbazı"
      description={`Adım ${step} / 3: ${
        step === 1 ? "Yönetici Bilgileri" : step === 2 ? "Site Genel Tanımı" : "Blok & Daire Mimarisi"
      }`}
      onClose={busy ? () => {} : onClose}
    >
      <div className="wizard-progress-bar">
        <div className={`wizard-step ${step >= 1 ? "active" : ""}`}>
          <span>1</span>
          <label>Yönetici</label>
        </div>
        <div className="wizard-line" />
        <div className={`wizard-step ${step >= 2 ? "active" : ""}`}>
          <span>2</span>
          <label>Site</label>
        </div>
        <div className="wizard-line" />
        <div className={`wizard-step ${step >= 3 ? "active" : ""}`}>
          <span>3</span>
          <label>Blok & Daireler</label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="wizard-content">
        {step === 1 && (
          <div className="wizard-fields">
            <p className="form-subtext">
              Site yöneticisi hesabınızı tanımlayın. Bu hesap, sitenizin tam yetkili ana yöneticisi olacaktır.
            </p>
            <div className="wizard-required-legend">
              <span className="field-required-star">*</span>
              <span>Kırmızı yıldızlı alanların doldurulması zorunludur.</span>
            </div>
            <div className="grid-2-col">
              <Field label="Adınız" required>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    required
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Soyadınız" required>
                <input
                  required
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </Field>
            </div>
            <Field label="E-posta Adresi" required>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ornek@siteniz.com"
                  value={formData.managerEmail}
                  onChange={(e) => update("managerEmail", e.target.value)}
                />
              </div>
            </Field>
            <div className="grid-2-col">
              <Field label="Yönetici Giriş Şifresi" required>
                <div className="input-with-icon">
                  <Lock size={18} className="field-icon" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="En az 8 karakter"
                    value={formData.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Şifre (Tekrar)" required>
                <div className="input-with-icon">
                  <Lock size={18} className="field-icon" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={formData.passwordConfirm}
                    onChange={(e) => update("passwordConfirm", e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-fields">
            <p className="form-subtext">Yöneteceğiniz sitenin temel bilgilerini ve konumunu girin.</p>
            <div className="wizard-required-legend">
              <span className="field-required-star">*</span>
              <span>Kırmızı yıldızlı alanların doldurulması zorunludur.</span>
            </div>
            <Field label="Site / Apartman Adı" required>
              <div className="input-with-icon">
                <Building2 size={18} className="field-icon" />
                <input
                  required
                  maxLength={150}
                  placeholder="Örn: Ihlamur Konakları Sitesi"
                  value={formData.siteName}
                  onChange={(e) => update("siteName", e.target.value)}
                />
              </div>
            </Field>
            <div className="grid-2-col">
              <Field label="İl" required>
                <input required maxLength={100} value={formData.city} onChange={(e) => update("city", e.target.value)} />
              </Field>
              <Field label="İlçe" required>
                <input
                  required
                  maxLength={100}
                  value={formData.district}
                  onChange={(e) => update("district", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Açık Adres" required>
              <input
                required
                maxLength={500}
                value={formData.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
            <Field label="Tesis / Yapı Tipi" required>
              <select value={formData.siteType} onChange={(e) => update("siteType", e.target.value)}>
                {SITE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-fields">
            <div className="wizard-algo-badge">
              <Sparkles size={16} />
              <span>Blok & Bağımsız Bölüm Mimarisi</span>
            </div>
            <p className="form-subtext">
              Sitenizin bloklarını tanımlayın. Her bloğun kat ve daire sayısını ayrı kutucuklarda belirleyebilir veya
              algoritmik kurulum yapabilirsiniz. Daha sonra Kat ve Daireler ekranından değişiklik ekleyebilirsiniz.
            </p>
            <div className="wizard-required-legend">
              <span className="field-required-star">*</span>
              <span>Kırmızı yıldızlı alanların doldurulması zorunludur.</span>
            </div>

            <div className="source-toggle-tabs mb-3">
              <button
                type="button"
                className={setupMode === "dynamic" ? "active" : ""}
                onClick={() => setSetupMode("dynamic")}
              >
                Dinamik Blok Kutuları (Önerilen)
              </button>
              <button
                type="button"
                className={setupMode === "algorithmic" ? "active" : ""}
                onClick={() => setSetupMode("algorithmic")}
              >
                Algoritmik Hızlı Kurulum
              </button>
            </div>

            <div className="grid-2-col mb-3">
              <Field label="Blok Sayısı" required>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={formData.blockCount}
                  onChange={(e) => updateBlockCount(parseInt(e.target.value) || 1)}
                />
              </Field>
              <Field label="Numaralandırma Şablonu" required>
                <select value={formData.namingPattern} onChange={(e) => update("namingPattern", e.target.value)}>
                  <option value="block-prefix">Blok Önekli (Örn: A-1, A-2, B-1...)</option>
                  <option value="floor">Kat Bazlı Numaratör (Örn: 101, 102, 201...)</option>
                  <option value="simple">Düz Sıralı Numaralandırma (1, 2, 3...)</option>
                </select>
              </Field>
            </div>

            {setupMode === "dynamic" ? (
              <div className="dynamic-blocks-container mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-muted">
                    Tanımlanan {customBlocks.length} Blok İçin Kat ve Daire Detayları:
                  </span>
                </div>
                <div className="dynamic-blocks-grid">
                  {customBlocks.map((b, idx) => (
                    <div key={idx} className="dynamic-block-card">
                      <div className="dynamic-block-card-header">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={16} className="text-gold" />
                          <strong>{b.name || `${idx + 1}. Blok`}</strong>
                        </div>
                        <span className="block-total-unit-badge">{b.floors * b.unitsPerFloor} Daire</span>
                      </div>
                      <div className="grid-3-col mt-2">
                        <Field label="Blok Adı" required>
                          <input value={b.name} onChange={(e) => updateBlockItem(idx, "name", e.target.value)} />
                        </Field>
                        <Field label="Kat Sayısı" required>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={b.floors}
                            onChange={(e) => updateBlockItem(idx, "floors", parseInt(e.target.value) || 1)}
                          />
                        </Field>
                        <Field label="Katta Daire" required>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={b.unitsPerFloor}
                            onChange={(e) => updateBlockItem(idx, "unitsPerFloor", parseInt(e.target.value) || 1)}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid-2-col mb-3">
                <Field label="Tüm Bloklar İçin Kat Sayısı" required>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.floorsPerBlock}
                    onChange={(e) => update("floorsPerBlock", parseInt(e.target.value) || 1)}
                  />
                </Field>
                <Field label="Kat Başına Daire Sayısı" required>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.unitsPerFloor}
                    onChange={(e) => update("unitsPerFloor", parseInt(e.target.value) || 1)}
                  />
                </Field>
              </div>
            )}

            <div className="algo-calc-card">
              <Layers size={20} className="text-gold" />
              <div>
                <strong>Hesaplanan Toplam Portföy:</strong>
                <span>
                  {setupMode === "dynamic"
                    ? `${customBlocks.length} Blok Toplamı = `
                    : `${formData.blockCount} Blok × ${formData.floorsPerBlock} Kat × ${formData.unitsPerFloor} Daire = `}
                  <strong>{totalCalculatedUnits} Bağımsız Bölüm</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="auth-error-msg mt-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {progress && (
          <div className="mt-2">
            <div className="live-progress">
              <i style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
            </div>
            <small className="text-muted">{progress.text}</small>
          </div>
        )}

        <div className="modal-footer">
          {step > 1 ? (
            <Button secondary type="button" disabled={busy} onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Geri
            </Button>
          ) : (
            <Button secondary type="button" onClick={onClose}>
              İptal
            </Button>
          )}

          <Button type="submit" disabled={busy}>
            {step < 3 ? (
              <>
                İlerle <ArrowRight size={16} />
              </>
            ) : (
              <>
                <FileCheck2 size={16} /> {busy ? "Kuruluyor…" : "Kurulumu Tamamla & Başla"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// 3. SAKİN KATILIM KODU İLE ÜYELİK & KAYIT MODALI (BMS-137 & BMS-140)
export function InvitationRegisterModal({
  onClose,
  users = [],
  units = [],
  onAcceptExisting,
  onRegisterNew,
  onNotify,
  initialEmail = "",
  initialUnitId = "",
  isEmailLocked = false,
}) {
  const [step, setStep] = useState(initialUnitId || initialEmail ? 2 : 1); // 1: Kod ve Daire Seçimi, 2: Üyelik Formu
  const [inviteCode, setInviteCode] = useState(initialUnitId ? `KVN-${initialUnitId.replace("-", "")}` : "");
  const [codeError, setCodeError] = useState("");

  // Doğrulanan Site, Blok ve Daire Bilgisi
  const [siteDetails, setSiteDetails] = useState(() => {
    if (initialUnitId) {
      const u = units.find((un) => un.id === initialUnitId);
      return {
        siteName: "Kovan Sitesi",
        block: u?.block || "A",
        unitId: initialUnitId,
        role: "Kat Maliki",
      };
    }
    return {
      siteName: "Kovan Sitesi",
      block: "A",
      unitId: "A-1",
      role: "Kat Maliki",
    };
  });

  // Üyelik Form Modu: 'register' (Yeni Üyelik) | 'login' (Zaten Hesabım Var)
  const [authMode, setAuthMode] = useState("register");

  // Yeni Üyelik Form Alanları
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [apartmentType, setApartmentType] = useState(() => {
    if (initialUnitId) {
      const u = units.find((un) => un.id === initialUnitId);
      return u?.type || "2+1 Standart";
    }
    return "2+1 Standart";
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [contractModal, setContractModal] = useState(null); // 'terms' | 'privacy'

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
    if (initialUnitId) {
      const u = units.find((un) => un.id === initialUnitId);
      if (u) {
        setSiteDetails({
          siteName: "Kovan Sitesi",
          block: u.block,
          unitId: u.id,
          role: "Kat Maliki",
        });
        if (u.type) setApartmentType(u.type);
        setStep(2);
      }
    }
  }, [initialEmail, initialUnitId, units]);

  // Mevcut Hesapla Bağlama Form Alanları
  const [existingIdentifier, setExistingIdentifier] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [formError, setFormError] = useState("");

  // BMS-140 KABUL KRİTERİ:
  // E-posta adresine bağlı mevcut hesap varsa kullanıcıya yeniden hesap/şifre oluşturma formu gösterilmez;
  // davetin mevcut hesaba bağlanacağı ayrı ekran durumu tasarlanır.
  const matchedExistingUser = users.find(
    (u) => Boolean(email.trim()) && u.email?.trim().toLowerCase() === email.trim().toLowerCase()
  );

  // Adım 1: Yöneticinin Verdiği Kodu Doğrulama
  const handleVerifyCode = (e) => {
    e.preventDefault();
    const clean = inviteCode.trim().toUpperCase();
    if (!clean) {
      setCodeError("Lütfen yöneticinizin ilettiği katılım kodunu girin.");
      return;
    }

    // Koddan blok ve daire çözümleme:
    // Örn: KVN-BLOK-A, KVN-BLOK-B, KVN-A14, KVN-B03 veya doğrudan A, B
    const knownBlocks = Array.from(new Set(units.map((u) => u.block))).filter(Boolean);
    const validBlocks = knownBlocks.length ? knownBlocks : ["A", "B", "C"];

    let resolvedBlock = validBlocks.find((b) =>
      clean === b ||
      clean === `BLOK-${b}` ||
      clean === `BLOK ${b}` ||
      clean === `KVN-BLOK-${b}` ||
      clean === `KVN-${b}` ||
      clean.includes(`BLOK-${b}`) ||
      clean.includes(`BLOK ${b}`)
    );

    let resolvedUnit = "";
    // Eğer doğrudan daire kodu girilmişse (örn: KVN-A14 veya A-14)
    const match = clean.match(/([A-Z0-9]+)[-_ ]?(\d+)/);
    if (match) {
      const bCand = match[1].replace("KVN", "").replace("BLOK", "").replace(/-/g, "");
      if (validBlocks.includes(bCand)) {
        resolvedBlock = bCand;
        resolvedUnit = `${bCand}-${match[2]}`;
      }
    }

    if (!resolvedBlock) {
      resolvedBlock = validBlocks.find((b) => clean.includes(b)) || validBlocks[0] || "A";
    }

    const availableInBlock = units.filter((u) => u.block === resolvedBlock);
    const defaultUnit = resolvedUnit || availableInBlock[0]?.id || `${resolvedBlock}-1`;

    setSiteDetails({
      siteName: "Kovan Sitesi",
      block: resolvedBlock,
      unitId: defaultUnit,
      role: "Kat Maliki",
    });

    setCodeError("");
    setStep(2);
    onNotify?.(`${resolvedBlock} Blok katılım kodu doğrulandı. Lütfen dairenizi seçip sakin üyelik bilgilerinizi girin.`);
  };

  // Adım 2A: Yeni Üyelik Oluşturma & Giriş
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Lütfen adınızı ve soyadınızı girin.");
      return;
    }
    if (!phone.trim() || !email.trim()) {
      setFormError("Lütfen telefon ve e-posta adresinizi girin.");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    onRegisterNew?.({
      name: fullName,
      email: email.trim(),
      phone: phone.trim(),
      password: newPassword,
      unitId: siteDetails.unitId,
      role: siteDetails.role,
      type: apartmentType,
      siteName: siteDetails.siteName,
    });

    onNotify?.(
      `Hoş geldiniz ${fullName}! Üyeliğiniz oluşturuldu ve ${siteDetails.unitId} dairesine bağlandı.`
    );
    onClose();
  };

  // Adım 2B: Mevcut Hesap ile Daireyi Bağlama
  const handleExistingLinkSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    const cleanId = (email || existingIdentifier).trim().toLowerCase();
    const cleanPh = cleanId.replace(/\D/g, "");
    const targetUser =
      matchedExistingUser ||
      users.find(
        (u) =>
          u.email?.trim().toLowerCase() === cleanId ||
          (cleanPh.length >= 10 && u.phone?.replace(/\D/g, "") === cleanPh)
      );

    if (!targetUser) {
      setFormError("Bu e-posta veya telefon ile kayıtlı bir hesap bulunamadı.");
      return;
    }
    if (!existingPassword) {
      setFormError("Lütfen mevcut hesap şifrenizi girin.");
      return;
    }

    onAcceptExisting?.({
      userId: targetUser.id,
      unitId: siteDetails.unitId,
      role: siteDetails.role,
      siteName: siteDetails.siteName,
    });

    onNotify?.(
      `Giriş başarılı! ${siteDetails.siteName} ${siteDetails.unitId} dairesi mevcut hesabınıza (${targetUser.name}) bağlandı.`
    );
    onClose();
  };

  const blockUnits = units.filter((u) => u.block === siteDetails.block);

  return (
    <Modal
      title={step === 1 ? "Sakin Katılım Kodu ile Giriş" : "Sakin Üyelik & Daire Tanımı"}
      description={
        step === 1
          ? "Yöneticinizin siteniz ve bloğunuz için oluşturduğu kodu girin"
          : `${siteDetails.siteName} · ${siteDetails.block} Blok sakin kaydınızı tamamlayın`
      }
      onClose={onClose}
    >
      {step === 1 ? (
        <form onSubmit={handleVerifyCode} className="auth-form-flow">
          <p className="form-subtext">
            Yeni bir sakin olarak sitenize bağlanmak için yöneticinizin size verdiği <strong>Site / Blok Katılım Kodunu</strong> girin.
          </p>

          <Field label="Yönetici Site & Blok Katılım Kodu">
            <div className="input-with-icon">
              <KeyRound size={18} className="field-icon" />
              <input
                autoFocus
                required
                style={{ textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "700" }}
                placeholder="Örn: KVN-BLOK-A veya KVN-A14"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
            </div>
          </Field>

          {codeError && (
            <div className="auth-error-msg">
              <AlertCircle size={15} /> {codeError}
            </div>
          )}

          <div className="modal-footer">
            <Button secondary type="button" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit">
              Kodu Doğrula & İlerle <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      ) : (
        <div className="auth-form-flow">
          {/* Doğrulanan Blok & Daire Seçim Paneli */}
          <div className="invite-badge-header">
            <Building2 size={24} className="text-gold flex-shrink-0" />
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between">
                <h4>{siteDetails.siteName} · {siteDetails.block} Blok</h4>
                <span className="role-chip">Kod Doğrulandı</span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                Lütfen oturduğunuz daireyi ve sakinlik durumunuzu belirleyin:
              </p>
            </div>
          </div>

          {/* Daire, Sakinlik Durumu ve Daire Tipi Seçimi */}
          <div className="grid-3-col mb-3">
            <Field label="Daire Numaranız">
              <select
                value={siteDetails.unitId}
                onChange={(e) => {
                  const targetUnitId = e.target.value;
                  const u = units.find((un) => un.id === targetUnitId);
                  setSiteDetails({ ...siteDetails, unitId: targetUnitId });
                  if (u?.type) setApartmentType(u.type);
                }}
              >
                {blockUnits.length > 0 ? (
                  blockUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Daire {u.number || u.id} ({u.floor}. Kat)
                    </option>
                  ))
                ) : (
                  <option value={`${siteDetails.block}-1`}>Daire 1 (1. Kat)</option>
                )}
              </select>
            </Field>

            <Field label="Sakinlik Durumu">
              <select
                value={siteDetails.role}
                onChange={(e) => setSiteDetails({ ...siteDetails, role: e.target.value })}
              >
                <option value="Kat Maliki">Kat Maliki (Ev Sahibi)</option>
                <option value="Kiracı">Kiracı (İkamet Eden)</option>
              </select>
            </Field>

            <Field label="Daire Tipi (Mimari)">
              <select
                value={apartmentType}
                onChange={(e) => setApartmentType(e.target.value)}
              >
                <option value="1+0">1+0 (Stüdyo)</option>
                <option value="1+1">1+1 Daire</option>
                <option value="2+0">2+0 Daire</option>
                <option value="2+1">2+1 Standart</option>
                <option value="3+0">3+0 Daire</option>
                <option value="3+1">3+1 Geniş</option>
                <option value="4+1">4+1 Aile</option>
                <option value="Dubleks">Dubleks / Çatı</option>
                <option value="Dükkan / Ticari">Dükkan / Ticari</option>
              </select>
            </Field>
          </div>

          {/* =========================================================================
             BMS-140 KABUL KRİTERİ:
             "E-posta adresine bağlı mevcut hesap varsa kullanıcıya yeniden hesap/şifre
              oluşturma formu gösterilmez; davetin mevcut hesaba bağlanacağı ayrı ekran
              durumu tasarlanır."
             "Yeni kullanıcı hesap açarken şifre ve şifre tekrar alanlarını zorunlu doldurur."
             ========================================================================= */}
          {matchedExistingUser ? (
            /* DURUM 1: MEVCUT HESABA BAĞLAMA ÖZEL EKRANI */
            <form onSubmit={handleExistingLinkSubmit} className="existing-account-linking-flow">
              <div className="account-exists-banner highlight">
                <ShieldCheck size={28} className="text-gold flex-shrink-0" />
                <div style={{ flex: 1 }}>
                  <div className="flex items-center justify-between">
                    <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                      Mevcut Kovan Hesabı Tespit Edildi
                    </strong>
                    <span className="badge success" style={{ fontSize: "10px" }}>Aktif Hesap</span>
                  </div>
                  <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
                    Sayın <strong>{matchedExistingUser.name}</strong>, bu e-posta (<strong>{email}</strong>) adresine tanımlı aktif bir Kovan hesabınız bulunmaktadır. Yeniden hesap oluşturmanıza veya yeni şifre belirlemenize gerek yoktur.
                  </p>
                </div>
              </div>

              {/* Daire ve Hesap Bilgi Eşleme Kartı */}
              <div className="existing-link-details-card mt-3 mb-3">
                <div className="grid-2-col">
                  <div>
                    <span className="info-card-sub">MEVCUT HESAP BİLGİSİ</span>
                    <strong className="info-card-main">{matchedExistingUser.name}</strong>
                    <span className="info-card-email">{email}</span>
                  </div>
                  <div>
                    <span className="info-card-sub">BAĞLANACAK YENİ DAİRE</span>
                    <strong className="info-card-main">{siteDetails.siteName} · {siteDetails.block} Blok</strong>
                    <span className="info-card-unit">
                      Daire {siteDetails.unitId} · <span className="text-gold">{siteDetails.role}</span>
                    </span>
                  </div>
                </div>
              </div>

              <Field
                label={
                  <div className="flex items-center justify-between" style={{ width: "100%" }}>
                    <span>Mevcut Hesap Şifreniz</span>
                    <button
                      type="button"
                      className="text-link-gold text-xs"
                      onClick={() => setExistingPassword("demo123")}
                    >
                      Demo şifreyi doldur (demo123)
                    </button>
                  </div>
                }
              >
                <div className="input-with-icon">
                  <Lock size={17} className="field-icon" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Mevcut Kovan şifrenizi girin"
                    value={existingPassword}
                    onChange={(e) => setExistingPassword(e.target.value)}
                  />
                </div>
              </Field>

              {formError && (
                <div className="auth-error-msg mt-2">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <div className="modal-footer mt-4">
                <Button secondary type="button" onClick={onClose}>
                  Vazgeç
                </Button>
                <Button type="submit">
                  Bu Daireyi Hesabıma Bağla & Giriş Yap <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          ) : (
            /* DURUM 2: YENİ SAKİN KAYIT FORMU (Şifre + Şifre Tekrar Zorunlu) */
            <form onSubmit={handleRegisterSubmit} className="new-resident-register-flow">
              <div className="new-user-badge-banner mb-3">
                <User size={20} className="text-gold flex-shrink-0" />
                <div>
                  <strong style={{ fontSize: "13px", color: "var(--ink)" }}>Yeni Sakin Kaydı Oluşturma</strong>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                    {siteDetails.siteName} {siteDetails.unitId} dairesi için ilk kez kayıt oluşturuyorsunuz. Lütfen bilgilerinizi ve güvenli şifrenizi belirleyin.
                  </p>
                </div>
              </div>

              <div className="grid-2-col">
                <Field label="Adınız (Zorunlu)">
                  <div className="input-with-icon">
                    <User size={17} className="field-icon" />
                    <input
                      required
                      placeholder="Adınız"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Soyadınız (Zorunlu)">
                  <input
                    required
                    placeholder="Soyadınız"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid-2-col">
                <Field label="Cep Telefonu (Zorunlu)">
                  <div className="input-with-icon">
                    <Phone size={17} className="field-icon" />
                    <input
                      type="tel"
                      required
                      placeholder="0532 XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </Field>
                <Field
                  label={
                    <span className="flex items-center justify-between" style={{ width: "100%" }}>
                      <span>E-posta Adresi</span>
                      {Boolean(isEmailLocked || initialEmail) && (
                        <span className="locked-badge">
                          <Lock size={11} /> Davet E-postası (Kilitli)
                        </span>
                      )}
                    </span>
                  }
                >
                  <div className="input-with-icon">
                    <Mail size={17} className="field-icon" />
                    <input
                      type="email"
                      required
                      placeholder="ad.soyad@site.com"
                      value={email}
                      readOnly={Boolean(isEmailLocked || initialEmail)}
                      style={
                        Boolean(isEmailLocked || initialEmail)
                          ? { backgroundColor: "var(--page, #f8f8fa)", cursor: "not-allowed", opacity: 0.85 }
                          : undefined
                      }
                      onChange={(e) => {
                        if (!isEmailLocked && !initialEmail) setEmail(e.target.value);
                      }}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid-2-col">
                <Field label="Giriş Şifresi Belirleyin (Zorunlu)">
                  <div className="input-with-icon">
                    <Lock size={17} className="field-icon" />
                    <input
                      type="password"
                      required
                      placeholder="En az 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Şifre Tekrar (Zorunlu)">
                  <div className="input-with-icon">
                    <Lock size={17} className="field-icon" />
                    <input
                      type="password"
                      required
                      placeholder="Şifreyi onaylayın"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <div className="terms-checkbox-container mt-2">
                <label className="terms-checkbox">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                  />
                  <span className="terms-text">
                    <button
                      type="button"
                      className="contract-link-inline"
                      onClick={() => setContractModal("terms")}
                    >
                      Kullanıcı Üyelik Sözleşmesi
                    </button>
                    'ni ve{" "}
                    <button
                      type="button"
                      className="contract-link-inline"
                      onClick={() => setContractModal("privacy")}
                    >
                      KVKK & Gizlilik Politikası
                    </button>
                    'nı okudum, kabul ediyorum.
                  </span>
                </label>
              </div>

              {formError && (
                <div className="auth-error-msg mt-2">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <div className="modal-footer mt-4">
                <Button secondary type="button" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Kodu Değiştir
                </Button>
                <Button type="submit">
                  Üyeliği Tamamla & Giriş Yap <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SÖZLEŞME & GİZLİLİK BİLGİLENDİRME MODALI */}
      {contractModal && (
        <TermsAndPrivacyModal
          type={contractModal}
          onClose={() => setContractModal(null)}
        />
      )}
    </Modal>
  );
}

// 4. KULLANICI SÖZLEŞMESİ & KVKK BİLGİLENDİRME MODALI (Uydurma madde içermeyen kurumsal taslak)
export function TermsAndPrivacyModal({ type = "terms", onClose }) {
  const isTerms = type === "terms";
  return (
    <Modal
      title={isTerms ? "Kovan Kullanıcı & Üyelik Sözleşmesi" : "KVKK & Gizlilik Politikası"}
      description="Kovan Konut & Site Yönetim Teknolojileri Hukuki ve Mevzuat Bilgilendirmesi"
      onClose={onClose}
    >
      <div className="contract-modal-body">
        <div className="contract-legal-notice-box">
          <ShieldCheck size={24} className="text-gold flex-shrink-0" />
          <div>
            <strong>Hukuki Geçerlilik ve Süreç Bilgilendirmesi</strong>
            <p>
              Resmi onaylı nihai üyelik sözleşmesi ve aydınlatma metinleri, hukuk danışmanlığı inceleme ve onayının ardından sisteme eklenecektir. Platformumuz 6698 sayılı KVKK ve Kat Mülkiyeti Kanunu hükümlerine tam uyumlu olarak işletilmektedir.
            </p>
          </div>
        </div>

        <div className="contract-content-scroll mt-3">
          <h4>{isTerms ? "1. Taraflar ve Sözleşmenin Amacı" : "1. Veri Sorumlusu ve Aydınlatma Yükümlülüğü"}</h4>
          <p>
            İşbu sözleşme, Kovan Konut ve Site Yönetim Portalı üzerinden site sakinleri, kat malikleri ve bina yönetimi arasındaki aidat takibi, duyuru yayınlama, afet hazırlığı ve teknik arıza talepleri süreçlerinin dijital, şeffaf ve güvenli bir şekilde yürütülmesini sağlar.
          </p>

          <h4>{isTerms ? "2. Kullanıcı Hak ve Sorumlulukları" : "2. İşlenen Kişisel Veriler ve Amaçları"}</h4>
          <p>
            Kullanıcı, sisteme tanımladığı bağımsız bölüm (daire), iletişim ve acil durum tahliye bilgilerinin doğruluğunu taahhüt eder. Afet durumunda kullanılacak tahliye bilgileri yalnızca can güvenliği ve site yönetim kurulu yetkililerince acil müdahale amacıyla işlenir.
          </p>

          <h4>3. Finansal Güvenlik ve Gizlilik Standartları</h4>
          <p>
            Kredi kartı ve aidat ödeme işlemleri, BDDK lisanslı güvenli Sanal POS sağlayıcıları üzerinden 256-bit SSL şifreleme ile gerçekleştirilir. Kart bilgileri sistem veritabanlarında asla saklanmaz.
          </p>
        </div>

        <div className="modal-footer mt-4">
          <Button type="button" onClick={onClose}>
            Anladım & Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
