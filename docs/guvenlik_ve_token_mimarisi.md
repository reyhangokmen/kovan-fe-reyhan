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

---

## 6. Token Yenileme Eşzamanlılığı & Oturum Kapatma Kuralları (Sprint Güncellemesi)

Test ortamındaki oturum yenileme değişiklikleri doğrultusunda frontend mimarisi güncellenmiştir:

### 1. Tek Noktadan Yenileme (Single In-Flight Refresh)
- **Problem:** Aynı anda birden fazla API isteği 401 aldığında veya aynı `refreshToken` ile aynı anda birden fazla `/auth/refresh` çağrısı giderse backend yalnızca birini kabul eder, diğerlerine 401 döner.
- **Çözüm:** `src/api/client.js` içerisinde `refreshSession()` çağrıları tek bir Promise (`refreshing`) altında birleştirilmiştir (serialized in-flight refresh).
- Eşzamanlı gelen tüm 401 istekleri aynı yenileme işlemini bekler. Yenileme tamamlandığında, 401 alan tüm istekler depodaki güncel token (`freshToken`) ile otomatik olarak yeniden denenir (`retry`).
- İstek esnasında başka bir sekme veya çağrı token'ı zaten yenilemişse (`stored.token !== initialToken`), ağa yeni bir yenileme isteği atmadan doğrudan depodaki güncel token ile istek tekrarlanır.

### 2. Kullanılmış Refresh Token 30 Saniye Kuralı
- Backend kuralı gereği, kullanılmış bir `refreshToken` 30 saniye sonra tekrar gönderilirse backend oturumu geçersiz kılar ve 401 döner.
- Frontend, `/auth/refresh` yanıtında 401 aldığında yerel depolamayı ve bellek oturumunu anında sıfırlar (`setAuth(null)`), `kovan:session-expired` olayını fırlatır ve kullanıcıyı doğrudan giriş ekranına (`/login`) yönlendirir.

### 3. Şifre Sıfırlandığında Tüm Cihazların Oturumunun Kapanması
- Kullanıcı şifresini sıfırladığında (`POST /auth/reset-password`), backend tüm aktif cihaz oturumlarını ve refresh token'larını derhal iptal eder.
- Frontend'de şifre sıfırlama işlemi tamamlandığında yerel oturum temizlenir (`setAuth(null)`) ve kullanıcı bilgilendirilerek yeni şifresiyle giriş yapmaya yönlendirilir.
- Diğer cihaz veya sekmelerdeki açık oturumlar ilk API çağrısında 401 alıp yenileme denemesinin de 401 ile reddedilmesi üzerine otomatik olarak sonlandırılır.

### 4. Yeni Uç: POST /sites (Giriş Yapmış Kullanıcı İçin Site Açma)
- Giriş yapmış (oturum açmış) bir kullanıcı yeni bir site veya apartman oluşturmak istediğinde `POST /sites` uç noktası kullanılır.
- İstek tamamlandığında kullanıcının site listesi (`reloadWorkspaces()`) yenilenir ve otomatik olarak `POST /auth/switch-site` yapılarak yeni sitenin çalışma alanına geçilir.
- Arayüzde `SitePicker` ve profil menüsüne **"Yeni Site Aç"** (`CreateSiteModal`) eklenmiştir.

### 5. Logo Adresi Doğrulaması (Yalnızca http/https)
- Site logosu olarak girilen URL'lerin güvenliği için yalnızca `http://` veya `https://` protokolü kabul edilmektedir (`/^https?:\/\//i`).
- `CreateSiteModal`, `SiteSettingsLive` ve `kovan.js` API katmanında istemci ve istek seviyesinde zorunlu doğrulama uygulanmıştır.

---

## 7. Kişisel Verilerin Tarayıcı Deposundan Arındırılması & Çıkış Güvencesi (#11 İyileştirmesi)

### Problem Analizi
- Kullanıcı tarayıcısında depolanan veriler incelendiğinde, görünen verilerin kullanıcının kendi oturumuna ait olduğu, ancak kişisel profil bilgilerinin (`user: { name, email, phone... }`) `localStorage`'da düz metin olarak durduğu tespit edilmiştir.
- Ayrıca çıkış yapıldığında (`logout`), access token süresi dolmuşsa `api()` fonksiyonu 401 hatasını yakalayıp gereksiz yere `refreshSession()` çağırıyor, bu da çıkış bildiriminin sunucuya iletilmesini engelleyebiliyordu.

### Uygulanan Düzeltmeler:
1. **Yalnızca Token Saklama (Storage Sanitization):**
   - `src/api/client.js` içindeki `setAuth(next)` fonksiyonu revize edildi.
   - `localStorage` içerisine **yalnızca** oturumu sürdürmek ve yenilemek için zorunlu olan teknik belirteçler (`token`, `refreshToken`, `loginToken`, `siteId`, `roles`, `permissions`, `workspaces`, `systemAdmin`) kaydedilir.
   - Kullanıcının adı, soyadı, telefon numarası, e-postası ve diğer kişisel verileri (`user` nesnesi) kalıcı depoya **asla yazılmaz**, yalnızca bellekte (React state / in-memory) tutulur.
   - Sayfa yenilendiğinde (F5) `App.jsx`, `auth.token` varlığını denetleyerek `/auth/me` uç noktasından profili belleğe çeker.
2. **Çıkışta Kesintisiz Sunucu Bildirimi (Direct Revocation with keepalive):**
   - `logout()` fonksiyonu, 401 yenileme interceptor döngüsünü tamamen atlamak için doğrudan `publicApi("POST", "/auth/logout", { refreshToken }, token, { keepalive: true })` çağrısı yapar.
   - `keepalive: true` bayrağı sayesinde kullanıcı sekmeyi anında kapatsa veya yönlendirilse dahi tarayıcı isteği arka planda sunucuya ulaştırır.
   - Tarayıcının ani sonlandırılması riskine karşı `navigator.sendBeacon` yedeği entegre edilmiştir.
3. **Kapsamlı Depo Temizliği (Full Storage Purge):**
   - Çıkış anında `localStorage.removeItem("kovan_auth")`, `localStorage.removeItem("kovan_active_tab")`, `localStorage.removeItem("kovan_users")` ve `sessionStorage.clear()` çağrılarak tarayıcı hafızası sıfırlanır.

---

## 8. Canlı Test Ortamı (DigitalOcean Kubernetes) Dağıtım Analizi

### Test Ortamının 4 Ekim Sürümünde Kalma Nedeni
- DigitalOcean Kubernetes test kümesinde (`k8s-uniconn-test`, `kovan.universeconn.online`) çalışan servis, `k8s/overlays/cloud/kustomization.yaml` dosyası üzerinden yönetilmektedir.
- Bu dosyadaki imaj etiketi incelendiğinde:
  ```yaml
  images:
    - name: kovan-fe
      newName: ghcr.io/apartman-yonetim-sistemi/kovan-web
      newTag: 5428d40 # Her deploy'da commit SHA'si ile guncellenir
  ```
  `5428d40` commit'inin Hakan Tekin tarafından **4 Ekim Pazar 21:10** tarihinde atılan commit olduğu görülmüştür.
- PR #2 (`BMS-144-ui` -> `BMS-144`) 11 Ekim'den beri açık beklediği ve `newTag` değeri yeni commit SHA'si ile güncellenmediği için canlı test ortamı 4 Ekim imajını sunmaya devam etmiştir.

### Dağıtım Adımları (Deployment Runbook):
1. **İmaj Oluşturma & Registry Push:**
   ```bash
   docker build -t ghcr.io/apartman-yonetim-sistemi/kovan-web:<YENI_COMMIT_SHA> .
   docker push ghcr.io/apartman-yonetim-sistemi/kovan-web:<YENI_COMMIT_SHA>
   ```
2. **Kustomize Etiket Güncellemesi:**
   - `k8s/overlays/cloud/kustomization.yaml` dosyasındaki `newTag` değeri `<YENI_COMMIT_SHA>` olarak güncellenir.
3. **Kümeye Uygulama:**
   ```bash
   kubectl apply -k k8s/overlays/cloud
   ```

