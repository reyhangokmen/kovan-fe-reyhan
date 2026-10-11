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
 * Aynı anda 401 alan istekler tek bir yenilemeyi bekler; yenilemede dönen yeni refresh token saklanır
 * (eskisi geçersiz olur), seçili site varsa site yetkisi tekrar alınır.
 */
function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const current = auth;
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
        const site = await send("POST", "/auth/switch-site", { siteId: current.siteId }, login.token);
        next = { ...next, token: site.token, roles: site.roles, permissions: site.permissions };
      }
      setAuth(next);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Oturum gerektiren istek. */
export async function api(method, path, body) {
  const token = auth?.token;
  try {
    return await send(method, path, body, token);
  } catch (error) {
    if (error.status !== 401 || !token || !auth?.refreshToken) throw error;
    try {
      await refreshSession();
    } catch {
      setAuth(null);
      throw new ApiError(401, {
        detail: "Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.",
        code: "SESSION_EXPIRED",
      });
    }
    return send(method, path, body, auth.token);
  }
}

/** Oturum gerektirmeyen istek (giriş, kayıt, şifre sıfırlama, davet önizleme). */
export function publicApi(method, path, body) {
  return send(method, path, body);
}

export { refreshSession };
