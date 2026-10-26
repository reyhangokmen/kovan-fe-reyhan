import { api, ApiError, getAuth, publicApi, refreshSession, setAuth, updateAuth } from "./client";

// ---- Oturum -------------------------------------------------------------------------------------

/**
 * Giriş: site seçilmemiş token + kullanıcının siteleri (workspaces). Tek sitesi varsa o site hemen seçilir.
 */
export async function login(email, password, rememberMe = false) {
  const response = await publicApi("POST", "/auth/login", { email: email.trim(), password, rememberMe });
  setAuth({
    loginToken: response.token,
    token: response.token,
    refreshToken: response.refreshToken,
    systemAdmin: response.systemAdmin,
    workspaces: response.workspaces,
    siteId: null,
    roles: [],
    permissions: [],
    user: { email: email.trim() },
  });
  // Profil yüklenemezse giriş bozulmasın; ekranda e-posta gösterilir.
  await loadCurrentUser().catch(() => null);
  if (response.workspaces.length === 1) {
    await selectSite(response.workspaces[0].siteId);
  }
  return getAuth();
}

/** Seçilen sitedeki rol ve izinleri taşıyan token alınır; site işlemleri bu token ile yapılır. */
export async function selectSite(siteId) {
  const current = getAuth();
  const response = await api("POST", "/auth/switch-site", { siteId });
  const workspace = current.workspaces?.find((w) => w.siteId === siteId);
  updateAuth({
    token: response.token,
    siteId: response.siteId,
    siteName: workspace?.siteName || current.siteName,
    roles: response.roles,
    permissions: response.permissions,
  });
  return getAuth();
}

export async function loadCurrentUser() {
  const user = await api("GET", "/auth/me");
  updateAuth({ user });
  return user;
}

/** Davet kabulü gibi işlemlerden sonra site listesini (workspaces) tazelemek için. */
export async function reloadWorkspaces() {
  await refreshSession();
  return getAuth();
}

export async function logout() {
  const current = getAuth();
  if (current?.refreshToken) {
    try {
      await api("POST", "/auth/logout", { refreshToken: current.refreshToken });
    } catch {
      // Sunucuya ulaşılamasa veya oturum zaten geçersiz olsa dahi yerel oturum temizlenir
    }
  }
  setAuth(null);
}

export const forgotPassword = (email) => publicApi("POST", "/auth/forgot-password", { email: email.trim() });

/** Şifre sıfırlandığında backend tüm cihazların oturumunu kapatır; mevcut yerel oturum da temizlenir. */
export async function resetPassword(email, code, newPassword) {
  const response = await publicApi("POST", "/auth/reset-password", { email: email.trim(), code, newPassword });
  setAuth(null);
  return response;
}

export const verifyEmail = (email, code) => publicApi("POST", "/auth/verify-email", { email: email.trim(), code });
export const resendVerification = (email) =>
  publicApi("POST", "/auth/resend-verification", { email: email.trim() });

// ---- Site ---------------------------------------------------------------------------------------

/** Logo adresi HTTP veya HTTPS protokolüyle başlamalıdır. */
export function validateLogoUrl(url) {
  const clean = (url || "").trim();
  if (!clean) return true;
  return /^https?:\/\//i.test(clean);
}

export const registerSite = (request) => {
  const siteLogo = request?.site?.logoUrl?.trim();
  if (siteLogo && !validateLogoUrl(siteLogo)) {
    throw new ApiError(400, { detail: "Logo adresi 'http://' veya 'https://' protokolüyle başlamalıdır." });
  }
  return publicApi("POST", "/sites/register", request);
};

/**
 * Giriş yapmış kullanıcının yeni site açması (POST /sites).
 * Açıldıktan sonra kullanıcının workspaces listesi yenilenir ve yeni siteye geçilir (/auth/switch-site).
 */
export async function createSite(siteData) {
  const cleanLogo = (siteData?.logoUrl || "").trim();
  if (cleanLogo && !validateLogoUrl(cleanLogo)) {
    throw new ApiError(400, { detail: "Logo adresi 'http://' veya 'https://' protokolüyle başlamalıdır." });
  }

  const payload = {
    name: siteData.name?.trim(),
    type: siteData.type,
    city: siteData.city?.trim(),
    district: siteData.district?.trim(),
    address: siteData.address?.trim(),
    ...(cleanLogo ? { logoUrl: cleanLogo } : {}),
  };

  const created = await api("POST", "/sites", payload);
  await reloadWorkspaces().catch(() => null);
  const targetId = created?.id || created?.site?.id || created?.siteId;
  if (targetId) {
    await selectSite(targetId).catch(() => null);
  }
  return created;
}

export const getCurrentSite = () => api("GET", "/sites/current");
export const updateCurrentSite = (request) => {
  const cleanLogo = (request?.logoUrl || "").trim();
  if (cleanLogo && !validateLogoUrl(cleanLogo)) {
    throw new ApiError(400, { detail: "Logo adresi 'http://' veya 'https://' protokolüyle başlamalıdır." });
  }
  return api("PUT", "/sites/current", {
    ...request,
    logoUrl: cleanLogo || null,
  });
};

export const getSiteSettings = () => api("GET", "/site-settings");
export const updateSiteSettings = (request) => api("PUT", "/site-settings", request);
export const changeLateFeeRate = (request) => api("POST", "/site-settings/late-fee-rate", request);

export const listSiteModules = () => api("GET", "/site-modules");
export const setSiteModule = (code, active) => api("PUT", `/site-modules/${encodeURIComponent(code)}`, { active });

// ---- Blok / daire -------------------------------------------------------------------------------

export const listBlocks = () => api("GET", "/blocks");
export const createBlock = (name, floorCount) => api("POST", "/blocks", { name, floorCount });
export const listUnits = (blockId) => api("GET", `/blocks/${blockId}/units`);
export const createUnit = (blockId, request) => api("POST", `/blocks/${blockId}/units`, request);

// ---- Üyeler, roller, davetler -------------------------------------------------------------------

export const listMembers = (unitId) => api("GET", unitId ? `/memberships?unitId=${unitId}` : "/memberships");
export const assignResident = (unitId, email, type) =>
  api("POST", `/memberships/units/${unitId}/residents`, { email: email.trim(), type });
export const assignBoardRole = (email, roleCode) =>
  api("POST", "/memberships/board-roles", { email: email.trim(), roleCode });

export const listInvitations = () => api("GET", "/invitations");
export const revokeInvitation = (id) => api("POST", `/invitations/${id}/revoke`);
export const resendInvitation = (id) => api("POST", `/invitations/${id}/resend`);
export const issueUnitLink = (unitId) => api("POST", `/units/${unitId}/invitation-link`);
export const listApprovals = (status = "PENDING_APPROVAL") =>
  api("GET", `/invitations/approvals?status=${status}`);
export const approveJoin = (useId) => api("POST", `/invitations/uses/${useId}/approve`);
export const rejectJoin = (useId) => api("POST", `/invitations/uses/${useId}/reject`);
export const reopenJoin = (useId) => api("POST", `/invitations/uses/${useId}/reopen`);

// ---- Davet linkiyle katılım (token) -------------------------------------------------------------

export const previewInvitation = (token) => publicApi("POST", "/invitations/preview", { token });
export const registerWithInvitation = (request) => publicApi("POST", "/invitations/register", request);
export const acceptInvitation = (token, membershipType) =>
  api("POST", "/invitations/accept", { token, membershipType: membershipType || null });

/** Yapıştırılan davet linkinden ya da düz metinden token'ı çıkarır. */
export function extractInvitationToken(value) {
  const text = (value || "").trim();
  try {
    const url = new URL(text);
    return url.searchParams.get("token") || "";
  } catch {
    return text;
  }
}

// ---- İzinler --------------------------------------------------------------------------------------

export function can(auth, permission) {
  return Boolean(auth?.permissions?.includes(permission));
}

// ---- Profil & Telefon Değişikliği (İki Adımlı) ---------------------------------------------------

export const updateProfile = (request) => api("PUT", "/auth/me", request);
export const requestPhoneChangeCode = (phone) =>
  api("POST", "/auth/me/phone/code", { phone: (phone || "").trim() });
export const verifyPhoneChange = (phone, code) =>
  api("POST", "/auth/me/phone", { phone: (phone || "").trim(), code: (code || "").trim() });

