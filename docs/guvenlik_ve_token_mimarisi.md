# KOVAN Güvenlik & Token Mimarisi (#11 & #62)

Bu doküman; KOVAN platformunun web ve mobil istemcilerinde kimlik doğrulama, token saklama, oturum kapatma, koruyucu başlıklar (CSP) ve CSRF güvenlik stratejilerini teknik detaylarıyla açıklamaktadır.

---

## 1. Web: Token Saklama & Oturum Yönetimi (#11)

### Mevcut Durum (Prototip & Canlı Hibrit)
- **Saklama Yeri:** Tarayıcı `localStorage` deposunda `kovan_auth` anahtarı altında JSON formatında saklanır.
- **Saklanan Alanlar:**
  - `token`: Kısa ömürlü JWT erişim belirteci (Access Token). Site seçilmeden önce boş izinlerle, site seçildikten sonra ilgili sitenin izinleri ve rolüyle (`sid`, `roles`, `perms`) üretilir.
  - `refreshToken`: Uzun ömürlü yenileme anahtarı (Beni Hatırla seçilirse 90 gün, seçilmezse oturum bazlı).
  - `workspaces`: Kullanıcının yetkili olduğu sitelerin listesi.
  - `siteId`: Aktif seçili sitenin UUID'si.
- **Bellek Yedeklemesi:** `localStorage` kapalı veya gizli sekmede erişilemez durumdaysa, istemci bellek içi (in-memory) oturum değişkenine düşerek sekme süresince oturumu korur.

### Çerez Tabanlı Mimariye Geçiş Önerisi
- Erişim belirteci (Access Token) bellekte (React Context/State) tutulmalıdır.
- Yenileme belirteci (`refreshToken`), `HttpOnly; Secure; SameSite=Lax; Path=/auth` bayraklarına sahip bir HTTP çerezinde saklanmalıdır. Bu sayede XSS saldırganları token'ı JavaScript ile çalamaz.

---

## 2. Çıkışta Sunucuya Haber Verme (Server-Side Logout) (#11)

### Uygulanan Çözüm
Kullanıcı web veya mobilde **"Çıkış Yap"** butonuna bastığında:
1. İstemci yalnızca yerel depolamayı temizlemekle yetinmez.
2. `POST /auth/logout` uç noktasına `{ refreshToken: current.refreshToken }` gövdesi ve `Authorization: Bearer <token>` başlığıyla istek atar.
3. Backend sunucusu veritabanındaki oturumu ve refresh token'ı geçersiz kılar (`revoked = true`).
4. Sunucu `204 No Content` döndükten sonra istemci `localStorage` ve bellek içi oturumu sıfırlar (`setAuth(null)`).
5. Sunucuya erişilemese veya ağ kesilse dahi `catch` bloğu üzerinden yerel oturum güvenle temizlenir; kullanıcının cihazda oturumu açık kalmaz.

---

## 3. Koruyucu Başlıklar & CSP (Content Security Policy) (#11)

Hem `vercel.json` hem de `index.html` meta etiketlerine aşağıdaki kurumsal güvenlik başlıkları eklenmiştir:

| Başlık | Değer | Amaç |
|---|---|---|
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://kovanbe.universeconn.online https://*.vercel.app;` | Harici kaynaklardan yetkisiz script ve stil yüklenmesini önler; sadece backend API ve Vercel domainlerine veri aktarımına izin verir. |
| **X-Content-Type-Options** | `nosniff` | MIME-type sniffing saldırılarını engeller. |
| **X-Frame-Options** | `DENY` | Sitenin iframe içinde gösterilmesini engelleyerek Clickjacking saldırılarını önler. |
| **X-XSS-Protection** | `1; mode=block` | Eski tarayıcılarda XSS filtrelemesini zorunlu kılar. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Dış linklere yönlendirilirken hassas URL parametrelerinin ve token'ların sızmasını önler. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=()` | Tarayıcının kamera, mikrofon ve konum gibi hassas donanım yetkilerini kısıtlar. |

---

## 4. Mobil: Token Saklama Kontrolü (#11)

Mobil uygulamalarda (React Native / Flutter) web'deki gibi `AsyncStorage` veya şifrelenmemiş SQLite kullanılmamalıdır.

### Güvenlik Gereksinimleri
1. **iOS:** Apple Keychain Servisi kullanılmalıdır (`kSecClassGenericPassword`).
2. **Android:** Android Keystore ile donanımsal olarak şifrelenen `EncryptedSharedPreferences` kullanılmalıdır.
3. **Kütüphane Önerileri:**
   - React Native: `expo-secure-store` (Expo için) veya `react-native-keychain` (Bare RN için).
   - Flutter: `flutter_secure_storage`.
4. **Biyometrik Kilit (Opsiyonel):** FaceID / TouchID ile token erişiminin korunması.
5. **Uygulama Silinmesi / Çıkış:** `logout` anında hem sunucuya `POST /auth/logout` gönderilmeli hem de Keychain / Keystore girdileri silinmelidir.

---

## 5. CSRF Güvenlik Politikası (#62)

Token'lar `localStorage`'dan `HttpOnly` çerezlere taşındığında, tarayıcılar her istekte çerezi otomatik göndereceği için Siteler Arası İstek Sahteciliği (CSRF) riski oluşur.

### Alınan Önlemler & Frontend Mimarisi
1. **Double Submit Cookie Standardı:**
   - Backend veya Vercel Gateway, istemciye okunabilir bir `XSRF-TOKEN` çerezi bırakır.
   - Frontend API istemcisi (`src/api/client.js`), durum değiştiren isteklerde (`POST`, `PUT`, `DELETE`, `PATCH`) bu çerezin değerini okuyarak `X-XSRF-TOKEN` HTTP başlığı olarak sunucuya iletir.
   - Kötü niyetli üçüncü taraf siteler Same-Origin Policy (SOP) nedeniyle bu çerezi okuyamaz ve başlığı üretemez.
2. **SameSite Bayrağı:**
   - Kimlik doğrulama çerezi `SameSite=Lax` veya `SameSite=Strict` olarak işaretlenir. Bu sayede harici sitelerden gelen çapraz isteklerde çerez doğrudan engellenir.
3. **API İstemcisi Entegrasyonu:**
   - `client.js` içerisine eklenen `getCsrfToken()` yardımcı fonksiyonu, `XSRF-TOKEN` veya `CSRF-TOKEN` çerezini otomatik yakalar ve istek başlıklarına ekler.
   - `api/proxy.js` sunucusuz proxy fonksiyonu da bu başlığı backend cluster'ına iletir.
