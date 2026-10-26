// KOVAN backend ile konuşan tek yer. Oturum (token'lar, seçili site, izinler) burada tutulur;
// süresi dolan erişim token'ı bir kez yenilenir ve seçili site için yeniden yetki alınır.

const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (isVercel ? "/api-proxy" : "https://kovanbe.universeconn.online")
).replace(/\/$/, "");
const STORAGE_KEY = "kovan_auth";

export class ApiError extends Error {
  constructor(status, problem, retryAfter) {
    super(problem?.detail || "Beklenmeyen bir hata oluştu");
    this.status = status;
    this.code = problem?.code;
    this.fieldErrors = problem?.errors || [];
    this.lockedUntil = problem?.lockedUntil;
    this.remainingAttempts = problem?.remainingAttempts;
    this.nextLockMinutes = problem?.nextLockMinutes;
    this.detail = problem?.detail;
    this.retryAfter = retryAfter ? Number(retryAfter) : null;
  }
}

/** Kullanıcıya gösterilecek Türkçe mesaj: alan hataları varsa onlar, yoksa backend'in detail'i. */
export function errorMessage(error) {
  if (error?.fieldErrors?.length) {
    return error.fieldErrors.map((e) => e.message).join(" · ");
  }
  return error?.message || "Beklenmeyen bir hata oluştu";
}

// Not: Token'lar tarayıcı deposunda tutuluyor (prototip). Canlı öncesi refresh token'ın
// httpOnly çerezde tutulması ekip kararı olarak değerlendirilmeli.
let auth = load();
const listeners = new Set();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function getAuth() {
  return auth;
}

export function setAuth(next) {
  auth = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // depolama kapalıysa oturum yalnızca bu sekmede yaşar
  }
  listeners.forEach((listener) => listener(auth));
}

export function updateAuth(patch) {
  setAuth({ ...auth, ...patch });
}

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Sekmeler arası oturum senkronizasyonu: Başka bir sekmede çıkış yapılır veya token yenilenirse
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      auth = load();
      listeners.forEach((listener) => listener(auth));
      if (!auth) {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
    }
  });
}

/**
 * #62: CSRF Güvenliği (Token çereze taşındığında otomatik koruma):
 * Backend veya gateway tarafından bırakılan okunabilir XSRF-TOKEN / CSRF-TOKEN çerezini okur ve
 * durum değiştiren (POST, PUT, DELETE, PATCH) isteklerde X-XSRF-TOKEN başlığı olarak gönderir.
 */
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)(?:XSRF-TOKEN|CSRF-TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function send(method, path, body, token) {
  let response;
  const csrfToken = getCsrfToken();
  const isMutating = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

  try {
    response = await fetch(BASE_URL + path, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken && isMutating ? { "X-XSRF-TOKEN": csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { detail: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin." });
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(response.status, data, response.headers.get("Retry-After"));
  }
  return data;
}

let refreshing = null;

/**
 * Oturum yenilemeyi tek bir noktada toplar.
 * Aynı anda birden fazla istek 401 alsa dahi yalnızca TEK BİR /auth/refresh isteği gider.
 * Diğer tüm istekler bu tek yenilemeyi bekler ve depodaki güncel token ile tekrar dener.
 *
 * Backend kuralı:
 * - Aynı refreshToken ile aynı anda birden fazla /auth/refresh giderse yalnız biri başarılı olur, diğerleri 401 alır.
 * - Kullanılmış bir refreshToken 30 sn sonra tekrar gönderilirse o cihazın oturumu kapatılır (401 döner).
 * - Şifre sıfırlandığında tüm cihazların oturumu kapatılır (401 döner).
 */
function refreshSession() {
  if (refreshing) {
    return refreshing;
  }

  // Depodaki refreshToken bellektekine göre zaten güncellenmişse ağa gitmeden depodakiyle devam et
  const stored = load();
  if (stored?.refreshToken && auth?.refreshToken && stored.refreshToken !== auth.refreshToken) {
    auth = stored;
    listeners.forEach((listener) => listener(auth));
    return Promise.resolve(auth);
  }

  refreshing = (async () => {
    const current = load() || auth;
    if (!current?.refreshToken) {
      setAuth(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
      throw new ApiError(401, {
        detail: "Oturum bulunamadı, lütfen tekrar giriş yapın.",
        code: "SESSION_EXPIRED",
      });
    }

    try {
      const login = await send("POST", "/auth/refresh", { refreshToken: current.refreshToken });
      let next = {
        ...current,
        loginToken: login.token,
        token: login.token,
        refreshToken: login.refreshToken,
        workspaces: login.workspaces,
        systemAdmin: login.systemAdmin,
      };
      if (current.siteId) {
        try {
          const site = await send("POST", "/auth/switch-site", { siteId: current.siteId }, login.token);
          next = { ...next, token: site.token, roles: site.roles, permissions: site.permissions };
        } catch {
          // Site switch başarısız olsa da ana token geçerlidir
        }
      }
      setAuth(next);
      return next;
    } catch (err) {
      // 401 veya geçersiz token durumunda (kullanılmış refreshToken 30 sn aşımı, şifre sıfırlama, oturum sonu):
      // Cihazın oturumu derhal kapatılır ve kullanıcı giriş ekranına yönlendirilir.
      setAuth(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired", { detail: err }));
      }
      throw new ApiError(401, {
        detail: "Oturumunuzun süresi doldu veya oturum sonlandırıldı. Lütfen tekrar giriş yapın.",
        code: "SESSION_EXPIRED",
      });
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/** Oturum gerektiren istek: 401 durumunda depodaki güncel token'la dener veya merkezi yenileme yapar. */
export async function api(method, path, body) {
  if (!auth) auth = load();
  const initialToken = auth?.token;

  try {
    return await send(method, path, body, initialToken);
  } catch (error) {
    if (error.status !== 401 || !initialToken) throw error;

    // 1. İstek ağdayken başka bir istek veya sekme token'ı çoktan yenilemiş olabilir.
    // Depodaki güncel token'ı kontrol et:
    const stored = load();
    if (stored?.token && stored.token !== initialToken) {
      auth = stored;
      try {
        // 401 alan istek depodaki güncel token'la tekrar denensin:
        return await send(method, path, body, stored.token);
      } catch (retryError) {
        if (retryError.status !== 401) throw retryError;
        // Eğer depodaki güncel token da 401 aldıysa merkezi yenilemeyi başlat/bekle
      }
    }

    if (!auth?.refreshToken && !stored?.refreshToken) {
      setAuth(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
      throw error;
    }

    // 2. Merkezi yenilemeyi çağır (aynı anda gelen tüm 401 istekleri TEK bir /auth/refresh bekler)
    try {
      await refreshSession();
    } catch (refreshErr) {
      setAuth(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
      throw new ApiError(401, {
        detail: "Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.",
        code: "SESSION_EXPIRED",
      });
    }

    // 3. Yenileme tamamlandı: Depodaki güncel token ile isteği tekrar dene
    const freshAuth = load() || auth;
    return send(method, path, body, freshAuth?.token);
  }
}

/** Oturum gerektirmeyen istek (giriş, kayıt, şifre sıfırlama, davet önizleme). */
export function publicApi(method, path, body) {
  return send(method, path, body);
}

export { refreshSession };
