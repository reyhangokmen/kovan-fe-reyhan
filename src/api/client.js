// KOVAN backend ile konuşan tek yer. Oturum (token, seçili site, izinler) bellekte tutulur;
// süresi dolan erişim token'ı bir kez yenilenir ve seçili site için yeniden yetki alınır.

export const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://kovanbe.universeconn.online"
).replace(/\/$/, "");

const SITE_KEY = "kovan_selected_site";

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

export function saveSelectedSite(siteId) {
  try {
    if (siteId) {
      localStorage.setItem(SITE_KEY, siteId);
    } else {
      localStorage.removeItem(SITE_KEY);
    }
  } catch {
    // depolama kapalıysa yoksay
  }
}

export function loadSelectedSite() {
  try {
    return localStorage.getItem(SITE_KEY) || null;
  } catch {
    return null;
  }
}

export function clearSelectedSite() {
  try {
    localStorage.removeItem(SITE_KEY);
  } catch {
    // yoksay
  }
}

// Token'lar ve kullanıcı bilgileri asla localStorage/sessionStorage'a yazılmaz; yalnız bellekte tutulur.
let auth = null;
const listeners = new Set();

const authChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("kovan-auth")
    : null;

if (authChannel) {
  authChannel.onmessage = (event) => {
    const data = event.data;
    if (data?.type === "logout") {
      setAuth(null, false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
    } else if (data?.type === "auth" && data.auth) {
      setAuth(data.auth, false);
    }
  };
}

export function getAuth() {
  return auth;
}

export function setAuth(next, broadcast = true) {
  auth = next;
  if (!next) {
    clearSelectedSite();
    try {
      localStorage.removeItem("kovan_auth");
      localStorage.removeItem("kovan_active_tab");
      localStorage.removeItem("kovan_users");
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
    } catch {
      // depolama kapalıysa yoksay
    }
  }
  listeners.forEach((listener) => listener(auth));
  if (broadcast && authChannel) {
    try {
      if (next) {
        authChannel.postMessage({ type: "auth", auth: next });
      } else {
        authChannel.postMessage({ type: "logout" });
      }
    } catch {
      // yoksay
    }
  }
}

export function updateAuth(patch) {
  setAuth({ ...auth, ...patch });
}

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)(?:XSRF-TOKEN|CSRF-TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function send(method, path, body, token, options = {}) {
  let response;
  const csrfToken = getCsrfToken();
  const isMutating = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

  try {
    response = await fetch(BASE_URL + path, {
      method,
      credentials: "include",
      keepalive: Boolean(options?.keepalive),
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken && isMutating ? { "X-XSRF-TOKEN": csrfToken } : {}),
        ...options?.headers,
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
 * Refresh token HttpOnly çerezdedir; gövde gönderilmez.
 * Aynı anda birden fazla istek 401 alsa dahi yalnızca TEK BİR /auth/refresh isteği gider.
 */
export function refreshSession() {
  if (refreshing) {
    return refreshing;
  }

  refreshing = (async () => {
    let login;
    try {
      login = await send("POST", "/auth/refresh");
    } catch (err) {
      // İki sekme aynı anda yenilerse biri 401 alabilir; 30 sn tolerans içinde bir kez tekrar denenir
      if (err?.status === 401) {
        try {
          login = await send("POST", "/auth/refresh");
        } catch (retryErr) {
          setAuth(null);
          throw retryErr;
        }
      } else {
        setAuth(null);
        throw err;
      }
    }

    let next = {
      ...auth,
      token: login.token,
      workspaces: login.workspaces || [],
    };

    const siteId = auth?.siteId ?? loadSelectedSite();
    if (siteId && login.workspaces?.some((w) => w.siteId === siteId)) {
      try {
        const site = await send("POST", "/auth/switch-site", { siteId }, login.token);
        const ws = login.workspaces.find((w) => w.siteId === siteId);
        next = {
          ...next,
          token: site.token,
          siteId,
          siteName: ws?.siteName || auth?.siteName,
          permissions: site.permissions || [],
        };
        saveSelectedSite(siteId);
      } catch {
        // switch-site başarısız olsa da ana token geçerlidir
      }
    } else {
      next = { ...next, siteId: null, permissions: [] };
      clearSelectedSite();
    }

    setAuth(next);
    return next;
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

export async function bootstrapSession() {
  try {
    await refreshSession();
  } catch {
    setAuth(null);
  }
}

/** Oturum gerektiren istek: 401 durumunda tek merkezden bir yenileme yapar ve isteği tekrarlar. */
export async function api(method, path, body) {
  const initialToken = auth?.token;

  try {
    return await send(method, path, body, initialToken);
  } catch (error) {
    if (error.status !== 401 || !initialToken) throw error;

    // Merkezi yenilemeyi çağır (aynı anda gelen tüm 401 istekleri TEK bir refresh bekler)
    try {
      await refreshSession();
    } catch {
      setAuth(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kovan:session-expired"));
      }
      throw new ApiError(401, {
        detail: "Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.",
        code: "SESSION_EXPIRED",
      });
    }

    // Yenileme tamamlandı: Güncel token ile isteği bir kez tekrar dene
    return send(method, path, body, auth?.token);
  }
}

/** Oturum gerektirmeyen veya doğrudan token ile yapılan istek (giriş, kayıt, şifre sıfırlama, çıkış bildirimi). */
export function publicApi(method, path, body, token, options) {
  return send(method, path, body, token, options);
}
