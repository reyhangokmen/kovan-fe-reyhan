# KOVAN Ekran Gereksinim Eşleştirmesi & Mimari Durum Raporu (#117 & #114)

Bu doküman; KOVAN Apartman & Site Yönetim Platformu web arayüzünde yer alan tüm ekranların eski gereksinimleri (prototip/mock) ile yeni canlı backend gereksinimleri arasındaki durumunu, uç noktalarını ve #114 kapsamındaki Alan Tipi / Arsa Payı analizini detaylandırmaktadır.

---

## 1. Genel Mimari Durum Özeti

| Modül / Ekran | Durum | Veri Kaynağı | Backend Uç Noktaları |
|---|---|---|---|
| **Giriş & Oturum** | Canlı (Live) | Gerçek Backend | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/switch-site`, `POST /auth/logout` |
| **Site Kurulum Sihirbazı** | Canlı (Live) | Gerçek Backend | `POST /sites/register` |
| **Kat ve Daireler** | Canlı (Live) | Gerçek Backend | `GET /sites/current`, `GET/POST /blocks`, `GET/POST /blocks/{id}/units`, `POST /units/{id}/assignments`, `POST /units/{id}/invitation-links`, `GET /sites/current/approvals` |
| **Rol ve Yetkiler** | Canlı (Live) | Gerçek Backend | `GET /memberships`, `POST /sites/current/board-roles`, `GET/POST/DELETE /invitations`, `GET /sites/current/approvals` |
| **Site Ayarları (Yönetici)** | Canlı (Live) | Gerçek Backend | `GET/PUT /sites/current`, `GET/PUT /sites/current/settings`, `POST /sites/current/settings/late-fee-rate`, `GET/PUT /sites/current/modules/{key}` |
| **Davet Kabulü (/davet)** | Canlı (Live) | Gerçek Backend | `GET /invitations/preview`, `POST /invitations/accept`, `POST /invitations/register` |
| **Profil & Telefon Değişikliği** | Canlı (Live) | Gerçek Backend | `GET /auth/me`, `PUT /auth/me`, `POST /auth/me/phone/code`, `POST /auth/me/phone` |
| **Aidat ve Finans** | Prototip / Mock | Örnek Veri | Backend geliştirme aşamasında (Üstte uyarı bandı mevcut) |
| **Talep Masası** | Prototip / Mock | Örnek Veri | Backend geliştirme aşamasında (Üstte uyarı bandı mevcut) |
| **Duyuru Panosu** | Prototip / Mock | Örnek Veri | Backend geliştirme aşamasında (Üstte uyarı bandı mevcut) |

---

## 2. Ekran Bazlı Eski ve Yeni Gereksinim Eşleştirmesi

### 2.1 Giriş & Kimlik Doğrulama (`src/prototype/Login.jsx`, `src/api/client.js`)
- **Eski Gereksinim:**
  - Statik e-posta/şifre kontrolü veya doğrudan demo rollere geçiş butonları.
  - Sınırsız yanlış şifre denemesi.
  - Doğrulama kodları için "10 dakika" sabit metin.
  - TCKN alanı formlarda mevcuttu.
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - Gerçek Spring Boot JWT kimlik doğrulaması (`POST /auth/login`).
  - Çoklu site (workspaces) desteği; tek site varsa otomatik seçim (`POST /auth/switch-site`).
  - **Giriş Kilidi:** 5 yanlış şifrede dinamik kilitlenme (`status: 423`, `lockedUntil`). Kalan süre sabit yazılmaz, `Date.now()` ile dinamik dakika olarak gösterilir.
  - **Kilit Sonrası Hak Kontrolü:** Kilit bitince 2 deneme hakkı; ilk yanlışta `remainingAttempts: 1`, `nextLockMinutes` ve `detail` mesajı ("Son hakkınız…") gösterilir.
  - Kod geçerlilik süreleri **5 dakikaya** indirildi.
  - **TCKN** hem backend'den hem frontend arayüzünden tamamen kaldırıldı.
  - **#11 Çıkış Bildirimi:** `POST /auth/logout` uç noktasına refresh token gönderilerek sunucuda oturum geçersiz kılınır.

---

### 2.2 Kat ve Daireler (`src/live/ApartmentsLive.jsx`)
- **Eski Gereksinim:**
  - Mock daire dizisi (`initialUnits`), rastgele doluluk durumları.
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - Seçili sitenin blokları (`/blocks`) ve kat planı (`/blocks/{id}/units`) backend'den dinamik çekilir.
  - Toplu daire oluşturma sihirbazı (önekli, kat bazlı veya düz sıralı).
  - Sakin ve kat maliki atama (`POST /units/{id}/assignments`).
  - Daire davet bağlantısı (`UNIT_LINK`) üretme ve panoya kopyalama.
  - Başvuru onay mekanizması (`GET /sites/current/approvals`).
  - **#114 Alan Tipi & Arsa Payı Entegrasyonu:**
    - Daire ekleme modalında Alan Tipi (`areaType`), Daire Tipi (`unitType`), Brüt m² (`grossM2`) ve Arsa Payı (`landShare`) giriş alanları aktiftir.
    - Kat planındaki daire kartlarında `unitType` (örn. `2+1`), `grossM2` (örn. `95 m²`) ve `landShare` (örn. `Arsa: 0.0125` / `12/1000`) rozet olarak ekrana yansıtılmıştır.
    - Daire detay modalında arsa payı başlık açıklamasında listelenmektedir.

---

### 2.3 Rol ve Yetkiler (`src/live/RolesLive.jsx`)
- **Eski Gereksinim:**
  - Statik üye listesi ve sabit rol filtreleri.
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - Sitedeki gerçek üyelikler (`GET /memberships`) üzerinden yönetim ve sakin ayrımı.
  - Kurul Üyesi Atama (`POST /sites/current/board-roles`): E-posta ve rol (`YONETIM_KURULU`, `DENETIM_KURULU`) ile doğrudan yetkilendirme veya davet oluşturma.
  - Davet yönetimi: Bekleyen davetleri görme, süresi dolanı tekrar gönderme (`POST /invitations/{id}/resend`) ve iptal etme (`DELETE /invitations/{id}`).
  - Form hizalaması ve panel iç boşlukları (24px padding) tasarım sistemine tam uyumlu hale getirildi.

---

### 2.4 Site Ayarları (`src/live/SiteSettingsLive.jsx`)
- **Eski Gereksinim:**
  - 6 sekmeli yerel mock formlar (kaydedilmiyordu).
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - **Site Kimliği:** Site adı, il, ilçe, posta kodu ve adres bilgileri okunur ve güncellenir (`PUT /sites/current`).
  - **Aidat Politikası:** Tolerans günü (0–30) ve avans taksit alt sınırı (`PUT /sites/current/settings`).
  - **Gecikme Faizi:** KMK Madde 20 uyumlu aylık azami %5 gecikme oranı, ileri tarihli yürürlük planlama (`POST /sites/current/settings/late-fee-rate`).
  - **Site Modülleri:** Zorunlu modüller kilitli; isteğe bağlı modüller kapatıldığında 10 dakikalık vazgeçme sayacı çalışır (`PUT /sites/current/modules/{key}`).

---

### 2.5 Davet ile Katılım (`src/live/InviteJoinModal.jsx`, `src/App.jsx`)
- **Eski Gereksinim:**
  - Statik davet kabul simülasyonu.
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - URL'den davet token'ı alma (`/davet?token=...`).
  - Token ile davet önizleme (`GET /invitations/preview`).
  - E-posta davetinde hesabı olmayanlar için doğrudan kayıt (`POST /invitations/register`), hesabı olanlar için tek tıkla kabul (`POST /invitations/accept`).
  - Daire davetinde (UNIT_LINK) malik/kiracı seçimi ve yönetici onayına gönderme.
  - **#42 Adres Çubuğu Temizliği:** Davet token'ı URL'de yakalandığı anda `sessionStorage`'a aktarılır ve `window.history.replaceState` ile adres çubuğundaki `?token=...` parametresi anında temizlenir. Kullanıcı sayfayı yenilese dahi davet kaybolmaz.

---

### 2.6 Hesap & Profil Ayarları (`src/prototype/ResidentSettings.jsx`)
- **Eski Gereksinim:**
  - Formda doğrudan yeni telefon yazıp "Kaydet" denildiğinde tek adımda PUT atılması.
- **Yeni Gereksinim (Canlıda Uygulanan):**
  - **İki Adımlı Telefon Değişikliği:**
    1. Kullanıcı yeni numarasını yazar ve "Doğrulama Kodu Gönder" der (`POST /auth/me/phone/code`). Kod kişinin e-postasına gider.
    2. Gelen 6 haneli kod girilerek onaylanır (`POST /auth/me/phone`).
    3. `PUT /auth/me` uç noktasına asla doğrulanmamış numara gönderilmez (`phone: verifiedPhone || null`).
  - Kod süresi 5 dakika olarak gösterilir.

---

## 3. #114: Aidat İçin Alan Tipi / Arsa Payı Alanları Analizi

| Alan Adı | Backend Varlık Modeli | Kat ve Daireler Ekranı | Aidat / Borçlandırma Ekranı | Site Ayarları Ekranı |
|---|---|---|---|---|
| **Alan / Kullanım Tipi (`areaType`)** | `Unit.areaType` (KONUT, ISYERI vb.) | **Var** (Ekleme modalı, kat planı kartı rozeti, detay modalı) | **Var** (Tablo listesinde daire tipinin yanında görüntülenir) | **Var** (Daire/Alan tipine göre tarife tablosu) |
| **Daire Tipi (`unitType`)** | `Unit.unitType` (1+0, 1+1, 2+1, 3+1...) | **Var** (Giriş alanı, kart etiketi, detay modalı) | **Var** (Hesaplama modeli ve tablo görünümü) | **Var** (Tip bazlı tarife matrisi) |
| **Brüt / Net m² (`grossM2`)** | `Unit.grossM2` (Sayısal m²) | **Var** (Giriş alanı, kart etiketi, detay modalı) | **Var** (m² başına katsayı ile hesaplama modeli) | **Var** (m² başına aidat katsayısı) |
| **Arsa Payı (`landShare`)** | `Unit.landShare` (Pay/Payda veya ondalık oran) | **Var** (Daire ekleme formu, kat planı kartı rozeti, detay modalı) | **Var** (#114 kapsamında Toplu Borçlandırma modalına **"Arsa Payı (KMK 20)"** hesaplama seçeneği eklendi; tabloda daire yanında gösterildi) | **Var** (Aidat dağıtım modeline KMK 20 Arsa Payı eklendi) |

---

## 4. Henüz Backend'i Olmayan Modüller İçin Yol Haritası

1. **Aidat ve Finans (`Payments.jsx`):**
   - Backend'de `dues` ve `installments` tabloları ve aidat tahakkuk API'si (`POST /sites/current/dues/accrual`) yayınlandığında, prototip veri katmanı `src/live/PaymentsLive.jsx`'e dönüştürülecektir.
2. **Talep Masası (`Requests.jsx`):**
   - Sakinlerin arıza/talep bildirimi ve yöneticinin durum güncelleme API'si (`GET/POST/PUT /sites/current/requests`) beklenmektedir.
3. **Duyuru Panosu (`Announcements.jsx`):**
   - Yönetici duyuru yayını ve sakin bildirim servisi (`GET/POST /sites/current/announcements`) beklenmektedir.
