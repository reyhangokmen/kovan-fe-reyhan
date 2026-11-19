# 🚀 KOVAN AI Agent Geliştirme Fabrikası (Frontend Paketi)

Bu dokümantasyon, **Oğuz Hoca**'nın talep ettiği yapay zeka ajan mimarisinin **Frontend & Test Otomasyonu (UI/UX, React ve E2E QA)** bacağını temsil eder.

---

## 👥 Frontend Agent Ailesi

| Ajan Adı | Rolü | Girdi (Input) | Çıktı (Output) |
| :--- | :--- | :--- | :--- |
| **01-ui-designer** | UI/UX & Wireframe Ajanı | Analiz, UseCase & Endpoint Listesi | ASCII Layout Çizimi, Renk/İkon Paleti, Kullanıcı Akışları |
| **02-react-ui-agent** | React Geliştirme Ajanı | Wireframe + API Spec | KOVAN State/In-Memory Token Standartlarında `.jsx` Kodları |
| **03-selenium-tester** | E2E & Selenium Test Ajanı | React Ekranı + UseCase Senaryosu | Selenium (Python) / Playwright (JS) Testleri & Koşum Raporu |

---

## 🔄 Uçtan Uca Çalışma Akışı (Pipeline)

1. **Adım 1 (Tasarım):** Backend/Analiz ekibinden gelen UseCase, `01-ui-designer` ajanına iletilir. Ajan, KOVAN Design System (`#CDA65B`, `Outfit`, `lucide-react`) kurallarına uygun ASCII wireframe ve alan gereksinimlerini üretir.
2. **Adım 2 (Kodlama):** Çıkan tasarım `02-react-ui-agent` ajanına verilir. Ajan, token'ları sadece bellekte tutan, `src/api/client.js` üzerinden konuşan ve rol/izin denetimi yapan üretim kalitesinde React bileşenini yazar.
3. **Adım 3 (Test):** Yazılan bileşen `03-selenium-tester` ajanına devredilir. Ajan, tüm başarı ve hata senaryolarını test eden otomasyon scriptlerini hazırlar, koşturur ve raporlar.

---

## 📂 Dosya Yapısı

```text
agents/
├── README.md                      <-- Genel Mimari ve Yönetici Özeti
├── 01-ui-designer/
│   └── SYSTEM_PROMPT.md           <-- Tasarım ve Wireframe Ajanı Talimatları
├── 02-react-ui-agent/
│   ├── SYSTEM_PROMPT.md           <-- React Kodlama Ajanı Talimatları
│   ├── STATE_STANDARDS.md         <-- KOVAN State ve Token Güvenlik Rehberi
│   └── EXAMPLE_TASK.md            <-- Uçtan Uca Örnek Çalışma Çıktısı
└── 03-selenium-tester/
    └── SYSTEM_PROMPT.md           <-- Selenium ve Playwright Test Ajanı Talimatları
```

---

> **Ekip İçi İş Bölümü Notu:**
> * **Frontend Ekibi (Reyhan):** 5. (Tasarım), 6. (React UI) ve 7. (Selenium/QA) maddelerdeki agent standartlarını hazırlamış ve projenin mevcut oturum/güvenlik mimarisine entegre etmiştir.
> * **Backend & Mobil Ekibi:** 1-4. (Analiz, DTO, Spring Boot, BE Test) ve 8. (Flutter) maddeleri hazırlamaktadır.
