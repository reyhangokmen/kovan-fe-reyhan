import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  MessageSquare,
  Megaphone,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  CircleHelp,
  MapPin,
  Bell,
  Shield,
  Settings,
  Phone,
  Clock,
  Wrench,
  Mail,
  KeyRound,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import Login from "./prototype/Login";
import Dashboard from "./prototype/Dashboard";
import Payments, { PaymentModal } from "./prototype/Payments";
import Requests, { RequestModal } from "./prototype/Requests";
import ResidentSettings from "./prototype/ResidentSettings";
import Announcements from "./prototype/Announcements";
import ComingSoon from "./prototype/ComingSoon";
import { Brand, Button, ErrorBoundary, Modal, ThemeToggle } from "./prototype/UI";
import useTheme from "./prototype/useTheme";
import {
  initialUsers,
  initialUnits,
  initialMemberships,
  initialDues,
  initialRequests,
  initialAnnouncements,
  TODAY,
} from "./prototype/data";
import { getAuth, onAuthChange } from "./api/client";
import { can, getCurrentSite, listMembers, logout, selectSite } from "./api/kovan";
import ApartmentsLive from "./live/ApartmentsLive";
import RolesLive from "./live/RolesLive";
import SiteSettingsLive from "./live/SiteSettingsLive";
import InviteJoinModal from "./live/InviteJoinModal";
import CreateSiteModal from "./live/CreateSiteModal";
import { EmailVerifyBanner, SitePicker } from "./live/SessionScreens";
import { fullName, roleLabel } from "./live/labels";
import "./App.css";

function getInitials(name) {
  if (!name || typeof name !== "string") return "KV";
  const clean = name.trim();
  if (!clean) return "KV";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr-TR");
}

const navigation = [
  { id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  {
    id: "apartments",
    label: "Kat ve Daireler",
    icon: Building2,
    manager: true,
  },
  {
    id: "roles",
    label: "Rol ve Yetkiler",
    icon: Shield,
    manager: true,
  },
  { id: "payments", label: "Aidat ve Ödemeler", icon: Wallet },
  { id: "requests", label: "Talep ve Şikayetler", icon: MessageSquare },
  { id: "announcements", label: "Duyurular", icon: Megaphone },
  {
    id: "settings",
    label: "Site Ayarları",
    icon: Settings,
    manager: true,
  },
];

// Yönetim ekranlarını açan izinler (backend'deki role_permissions seed'i)
const MANAGEMENT_PERMISSIONS = ["SITE.AYARLAR", "SITE.BLOK_DAIRE", "KULLANICI.SAKIN_LISTE", "KULLANICI.DAVET"];

const INVITE_STORAGE_KEY = "kovan_pending_invite_token";

function invitationTokenFromUrl() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = (window.location.pathname === "/davet" || searchParams.has("token"))
      ? searchParams.get("token")
      : null;

    if (tokenFromUrl) {
      // #42: Token adres çubuğunda açık durmasın (referrer sızıntısı / geçmiş kirliliği önlenir),
      // ancak sayfa yenilendiğinde davet kaybolmasın diye sessionStorage'a güvenle alınır.
      sessionStorage.setItem(INVITE_STORAGE_KEY, tokenFromUrl);
      searchParams.delete("token");
      const cleanSearch = searchParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? "?" + cleanSearch : "");
      window.history.replaceState({}, "", cleanUrl);
      return tokenFromUrl;
    }

    if (window.location.pathname === "/davet") {
      return sessionStorage.getItem(INVITE_STORAGE_KEY) || "";
    }
    return "";
  } catch {
    return "";
  }
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [auth, setAuthState] = useState(getAuth);
  const [inviteToken, setInviteToken] = useState(invitationTokenFromUrl);
  const [dues, setDues] = useState(initialDues);
  const [requests, setRequests] = useState(initialRequests);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  // Adres çubuğundaki sayfa (/manager/settings gibi) önceliklidir; yoksa son açık sekme.
  const [tab, setTab] = useState(() => {
    const fromUrl = window.location.pathname.split("/")[2];
    if (fromUrl && navigation.some((n) => n.id === fromUrl)) return fromUrl;
    try {
      return localStorage.getItem("kovan_active_tab") || "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [site, setSite] = useState(null); // /sites/current (yalnızca SITE.AYARLAR izniyle okunur)
  const [occupiedCount, setOccupiedCount] = useState(null);
  const [siteMenuOpen, setSiteMenuOpen] = useState(true);
  const [showTanitim, setShowTanitim] = useState(() => window.location.pathname === "/tanitim");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [onboardingBusy, setOnboardingBusy] = useState(false); // kurulum/davet sürerken giriş ekranında kalınır
  const profileRef = useRef(null);

  useEffect(() => onAuthChange(setAuthState), []);

  useEffect(() => {
    const handleExpired = () => {
      setModal(null);
      setToast("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
      window.history.pushState({}, "", "/login");
    };
    window.addEventListener("kovan:session-expired", handleExpired);
    return () => window.removeEventListener("kovan:session-expired", handleExpired);
  }, []);

  const inSite = Boolean(auth?.token && auth?.siteId) && !onboardingBusy;
  const manager = inSite && MANAGEMENT_PERMISSIONS.some((p) => can(auth, p));
  const canSiteSettings = can(auth, "SITE.AYARLAR");
  const canApartments = can(auth, "SITE.BLOK_DAIRE");
  const canRoles = ["KULLANICI.SAKIN_LISTE", "KULLANICI.ROL_ATAMA", "KULLANICI.DAVET"].some((p) => can(auth, p));

  const user = {
    name: fullName(auth?.user),
    email: auth?.user?.email || "",
  };

  const siteMeta = {
    name: site?.name || auth?.siteName || "Siteniz",
    location: site ? `${site.district}, ${site.city}` : (auth?.roles || []).map(roleLabel).join(", "),
    blockSummary: site ? `${site.blockCount} blok, ${site.unitCount} daire` : "",
  };

  // Site seçilince ve Genel Bakış'a her dönüşte site bilgileri ile doluluk yeniden okunur
  // (Kat ve Daireler ekranında eklenen daireler sayıya yansısın).
  const activeSiteId = inSite ? auth.siteId : null;
  const canListMembers = can(auth, "KULLANICI.SAKIN_LISTE");
  const onDashboard = tab === "dashboard";
  useEffect(() => {
    if (!activeSiteId) {
      setSite(null);
      setOccupiedCount(null);
      return;
    }
    let cancelled = false;
    if (canSiteSettings) {
      getCurrentSite()
        .then((data) => !cancelled && setSite(data))
        .catch(() => !cancelled && setSite(null));
    } else {
      setSite(null);
    }
    if (canListMembers) {
      listMembers()
        .then((members) => !cancelled && setOccupiedCount(new Set(members.filter((m) => m.unitId).map((m) => m.unitId)).size))
        .catch(() => !cancelled && setOccupiedCount(null));
    }
    return () => {
      cancelled = true;
    };
  }, [activeSiteId, canSiteSettings, canListMembers, onDashboard]);

  useEffect(() => {
    try {
      if (inSite && tab) localStorage.setItem("kovan_active_tab", tab);
      if (!auth) localStorage.removeItem("kovan_active_tab");
    } catch {
      // depolama kapalı olabilir
    }
  }, [auth, inSite, tab]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const allowedTab = useCallback(
    (id) => {
      if (id === "apartments") return canApartments;
      if (id === "roles") return canRoles;
      return navigation.some((n) => n.id === id);
    },
    [canApartments, canRoles],
  );

  const navigate = useCallback(
    (next) => {
      setTab(next);
      if (next === "apartments" || next === "settings") {
        setSiteMenuOpen(true);
      }
      setMobile(false);
      window.history.pushState(
        {},
        "",
        `/${manager ? "manager" : "resident"}${next === "dashboard" ? "" : "/" + next}`,
      );
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [manager],
  );

  // Açılışta adres çubuğu oturuma göre düzeltilir; /davet linki yakalandıktan sonra temizlenir.
  useEffect(() => {
    if (showTanitim) return;
    if (inSite) {
      const safeTab = allowedTab(tab) ? tab : "dashboard";
      if (safeTab !== tab) setTab(safeTab);
      window.history.replaceState(
        {},
        "",
        `/${manager ? "manager" : "resident"}${safeTab === "dashboard" ? "" : "/" + safeTab}`,
      );
    } else {
      window.history.replaceState({}, "", "/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTanitim, inSite, manager]);

  useEffect(() => {
    const pop = () => {
      if (window.location.pathname === "/tanitim") {
        setShowTanitim(true);
        return;
      }
      setShowTanitim(false);
      if (!inSite || window.location.pathname === "/login") {
        setTab("dashboard");
        setModal(null);
        window.history.replaceState({}, "", inSite ? `/${manager ? "manager" : "resident"}` : "/login");
        return;
      }
      const parts = window.location.pathname.split("/");
      const target = parts[2] || "dashboard";
      if (parts[1] !== (manager ? "manager" : "resident") || !allowedTab(target)) {
        window.history.replaceState({}, "", `/${manager ? "manager" : "resident"}`);
        setTab("dashboard");
      } else setTab(target);
      setModal(null);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [inSite, manager, allowedTab]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeModal = useCallback(() => setModal(null), []);
  const notify = useCallback((message) => setToast(message), []);
  const closeInvite = useCallback(() => {
    setInviteToken("");
    try {
      sessionStorage.removeItem(INVITE_STORAGE_KEY);
    } catch {}
  }, []);

  const handleLoggedIn = useCallback(() => {
    setInviteToken("");
    try {
      sessionStorage.removeItem(INVITE_STORAGE_KEY);
    } catch {}
    setTab("dashboard");
    setToast("");
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    setModal(null);
    setMobile(false);
    setToast("");
    window.history.pushState({}, "", "/login");
  };

  const switchSite = async (siteId) => {
    setProfileMenuOpen(false);
    if (siteId === auth?.siteId) return;
    try {
      const next = await selectSite(siteId);
      setTab("dashboard");
      notify(`${next.siteName} sitesine geçildi.`);
    } catch (error) {
      notify(error.message);
    }
  };

  // Sakin daire çözümleme
  const residentFor = (id) =>
    initialUsers.find((u) => u.id === initialMemberships.find((m) => m.unitId === id)?.userId);
  const residentName = (id) => residentFor(id)?.name || "Boş daire";
  const currentWorkspace = auth?.workspaces?.find((w) => w.siteId === auth?.siteId);
  const userUnitId = currentWorkspace?.unitNo || auth?.unitNumber || auth?.unitId || null;
  const activeUnitId = manager ? null : userUnitId;
  const visibleDues = manager ? dues : (userUnitId ? dues.filter((d) => d.unitId === userUnitId) : dues);
  const visibleRequests = manager ? requests : (userUnitId ? requests.filter((r) => r.unitId === userUnitId) : requests);

  const pay = (id, method) => {
    setDues((prev) =>
      prev.map((d) =>
        d.id === id && d.status === "Ödenmemiş"
          ? {
              ...d,
              status: method === "card" ? "Ödendi" : "Onay bekliyor",
              method: method === "card" ? "Kredi Kartı" : "Banka Havalesi",
              paidDate: TODAY,
            }
          : d,
      ),
    );
    notify(
      method === "card"
        ? "Ödeme başarıyla gerçekleştirildi."
        : "Ödeme bildirimi oluşturuldu, yönetici onayı bekleniyor.",
    );
  };

  const createRequest = (r) => {
    setRequests((prev) => [r, ...prev]);
    notify("Talebiniz başarıyla iletildi.");
  };

  // ---- Oturum yoksa: giriş, tanıtım; site seçilmediyse: site seçimi ------------------------------------
  if (!auth?.token || onboardingBusy) {
    if (showTanitim && !onboardingBusy) {
      return (
        <ErrorBoundary>
          <ComingSoon
            theme={theme}
            onToggleTheme={toggleTheme}
            onBackToLogin={() => {
              setShowTanitim(false);
              window.history.pushState({}, "", "/login");
            }}
          />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Login
          theme={theme}
          onToggleTheme={toggleTheme}
          onNotify={notify}
          inviteToken={inviteToken}
          onLoggedIn={handleLoggedIn}
          onBusyChange={setOnboardingBusy}
          onNavigateTanitim={() => {
            setShowTanitim(true);
            window.history.pushState({}, "", "/tanitim");
          }}
        />
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={19} />
            {toast}
            <button aria-label="Bildirimi kapat" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  if (!inSite) {
    return (
      <ErrorBoundary>
        <SitePicker
          auth={auth}
          onSelected={() => setTab("dashboard")}
          onLogout={handleLogout}
          onOpenInvite={() => setModal({ type: "invite" })}
          onOpenCreateSite={() => setModal({ type: "create-site" })}
        />
        {modal?.type === "invite" && (
          <InviteJoinModal onClose={closeModal} onNotify={notify} onJoined={closeModal} />
        )}
        {modal?.type === "create-site" && (
          <CreateSiteModal
            onClose={closeModal}
            onNotify={notify}
            onCreated={() => {
              closeModal();
              setTab("dashboard");
            }}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={19} />
            {toast}
            <button aria-label="Bildirimi kapat" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  const activeCount = visibleRequests.filter((r) => r.status !== "Çözüldü").length;
  const otherSites = (auth.workspaces || []).filter((w) => w.siteId !== auth.siteId);

  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand onClick={() => navigate("dashboard")} />
          <button
            className="icon-button mobile-only"
            aria-label="Menüyü kapat"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="site-selector">
          <span className="site-icon">
            <Building2 size={20} />
          </span>
          <div>
            <strong>{siteMeta.name}</strong>
            <small>{siteMeta.location}</small>
          </div>
          <ChevronsUpDown size={15} />
        </div>

        <div className="nav-caption">ÇALIŞMA ALANI</div>
        <nav aria-label="Ana menü">
          {/* Genel Bakış */}
          <button
            onClick={() => navigate("dashboard")}
            aria-current={tab === "dashboard" ? "page" : undefined}
            className={`nav-item ${tab === "dashboard" ? "active" : ""}`}
          >
            <LayoutDashboard size={19} />
            <span>Genel Bakış</span>
          </button>

          {/* Yönetici İçin: Site Grubu (Kat & Daireler + Site Ayarları) */}
          {(canApartments || canSiteSettings) && (
            <div className="nav-group">
              <button
                type="button"
                className={`nav-item nav-group-header ${tab === "apartments" || tab === "settings" ? "group-active" : ""}`}
                onClick={() => setSiteMenuOpen(!siteMenuOpen)}
                aria-expanded={siteMenuOpen}
              >
                <div className="nav-group-title">
                  <Building2 size={19} />
                  <span>Site</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`menu-chevron ${siteMenuOpen ? "open" : ""}`}
                />
              </button>

              {siteMenuOpen && (
                <div className="nav-sub-items">
                  {canApartments && (
                    <button
                      type="button"
                      onClick={() => navigate("apartments")}
                      aria-current={tab === "apartments" ? "page" : undefined}
                      className={`nav-sub-item ${tab === "apartments" ? "active" : ""}`}
                    >
                      <span className="sub-bullet" />
                      <span>Kat ve Daireler</span>
                    </button>
                  )}

                  {canSiteSettings && (
                    <button
                      type="button"
                      onClick={() => navigate("settings")}
                      aria-current={tab === "settings" ? "page" : undefined}
                      className={`nav-sub-item ${tab === "settings" ? "active" : ""}`}
                    >
                      <span className="sub-bullet" />
                      <span>Ayarlar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rol ve Yetkiler (Yönetici) */}
          {canRoles && (
            <button
              onClick={() => navigate("roles")}
              aria-current={tab === "roles" ? "page" : undefined}
              className={`nav-item ${tab === "roles" ? "active" : ""}`}
            >
              <Shield size={19} />
              <span>Rol ve Yetkiler</span>
            </button>
          )}

          {/* Ortak: Aidat ve Ödemeler */}
          <button
            onClick={() => navigate("payments")}
            aria-current={tab === "payments" ? "page" : undefined}
            className={`nav-item ${tab === "payments" ? "active" : ""}`}
          >
            <Wallet size={19} />
            <span>Aidat ve Ödemeler</span>
          </button>

          {/* Ortak: Talep ve Şikayetler */}
          <button
            onClick={() => navigate("requests")}
            aria-current={tab === "requests" ? "page" : undefined}
            className={`nav-item ${tab === "requests" ? "active" : ""}`}
          >
            <MessageSquare size={19} />
            <span>{!manager ? "Taleplerim" : "Talep ve Şikayetler"}</span>
            {activeCount > 0 && <span className="nav-count">{activeCount}</span>}
          </button>

          {/* Ortak: Duyurular */}
          <button
            onClick={() => navigate("announcements")}
            aria-current={tab === "announcements" ? "page" : undefined}
            className={`nav-item ${tab === "announcements" ? "active" : ""}`}
          >
            <Megaphone size={19} />
            <span>Duyurular</span>
          </button>

          {/* Site ayarı yetkisi olmayan için: Hesap & Daire Ayarları */}
          {!canSiteSettings && (
            <button
              onClick={() => navigate("settings")}
              aria-current={tab === "settings" ? "page" : undefined}
              className={`nav-item ${tab === "settings" ? "active" : ""}`}
            >
              <Settings size={19} />
              <span>Ayarlar</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setModal({ type: "help" })}
          >
            <CircleHelp size={18} />
            <span>Yardım ve İletişim</span>
            <ArrowChevron />
          </button>
          <div className="site-mini desktop-only">
            <span className="eyebrow">BİRLİKTE DAHA İYİ</span>
            <img src="/brand/KOVAN_Binalar.svg" alt="" />
            <strong>Yaşamın düzeni.</strong>
            <span>
              {siteMeta.name}
              {siteMeta.blockSummary ? ` · ${siteMeta.blockSummary}` : ""}
            </span>
          </div>
          <div className="sidebar-footnote desktop-only">
            <span className="status-dot" />
            Kovan ERP v2.4<span>2026</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Menüyü aç"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="desktop-only">Çalışma alanı</span>
            <ChevronRight size={14} className="desktop-only" />
            {tab === "settings" ? (
              canSiteSettings ? (
                <>
                  <span className="desktop-only">Site</span>
                  <ChevronRight size={14} className="desktop-only" />
                  <strong>Site Ayarları</strong>
                </>
              ) : (
                <strong>Hesap ve Daire Ayarları</strong>
              )
            ) : tab === "apartments" ? (
              <>
                <span className="desktop-only">Site</span>
                <ChevronRight size={14} className="desktop-only" />
                <strong>Kat ve Daireler</strong>
              </>
            ) : (
              <strong>{navigation.find((n) => n.id === tab)?.label}</strong>
            )}
          </div>
          <div className="topbar-right">
            <div className="desktop-only">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
            <button
              className="notification-button icon-button"
              aria-label="Duyuruları görüntüle"
              onClick={() => navigate("announcements")}
            >
              <Bell size={19} />
              <i />
            </button>

            {/* Profil, site değiştirme ve çıkış */}
            <div className="profile-dropdown-container" ref={profileRef}>
              <button
                type="button"
                className={`user-profile-trigger has-dropdown ${profileMenuOpen ? "is-active" : ""}`}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                style={{ cursor: "pointer" }}
                title={`${user?.name || "Kullanıcı"} - Profil menüsü ve oturumu kapat`}
              >
                <span className="avatar avatar-initials">
                  {getInitials(user?.name)}
                </span>
                <div className="user-profile-meta desktop-only">
                  <div className="user-profile-name-row">
                    <strong>{user.name}</strong>
                  </div>
                  <small>{(auth.roles || []).map(roleLabel).join(", ")}</small>
                </div>
                <ChevronDown
                  size={14}
                  className={`profile-chevron desktop-only ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <span className="avatar avatar-lg avatar-initials">
                      {getInitials(user?.name)}
                    </span>
                    <div className="header-meta">
                      <strong>{user.name}</strong>
                      <span className="header-email">{user.email}</span>
                      <span className="header-role-badge">
                        {(auth.roles || []).map(roleLabel).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Görünüm Teması Switcher (Özellikle Mobil Kullanıcılar İçin) */}
                  <div className="profile-theme-switch-row">
                    <div className="profile-theme-info">
                      {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                      <span>Görünüm Teması</span>
                    </div>
                    <button
                      type="button"
                      className="profile-theme-toggle-btn"
                      onClick={toggleTheme}
                      title="Açık ve koyu tema arasında geçiş yapın"
                    >
                      <span className={`theme-pill ${theme === "light" ? "active" : ""}`}>
                        <Sun size={12} /> Açık
                      </span>
                      <span className={`theme-pill ${theme === "dark" ? "active" : ""}`}>
                        <Moon size={12} /> Koyu
                      </span>
                    </button>
                  </div>

                  {/* Kullanıcının üye olduğu diğer siteler */}
                  {otherSites.length > 0 && (
                    <div className="profile-dropdown-section">
                      <span className="profile-section-label">Siteleriniz</span>
                      <div className="profile-accounts-list">
                        <button type="button" className="profile-account-item active">
                          <span className="profile-account-icon">
                            <Building2 size={15} />
                          </span>
                          <div className="profile-account-details">
                            <span className="profile-account-title">{auth.siteName}</span>
                            <span className="profile-account-sub">{(auth.roles || []).map(roleLabel).join(", ")}</span>
                          </div>
                          <span className="profile-account-active-badge">
                            <CheckCircle2 size={14} />
                            <span>Aktif</span>
                          </span>
                        </button>
                        {otherSites.map((w) => (
                          <button
                            key={w.siteId}
                            type="button"
                            className="profile-account-item"
                            onClick={() => switchSite(w.siteId)}
                          >
                            <span className="profile-account-icon">
                              <Building2 size={15} />
                            </span>
                            <div className="profile-account-details">
                              <span className="profile-account-title">{w.siteName}</span>
                              <span className="profile-account-sub">{w.roles.map(roleLabel).join(", ")}</span>
                            </div>
                            <span className="profile-account-switch-hint">Geçiş Yap</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="profile-dropdown-section">
                    <button
                      type="button"
                      className="profile-account-item"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setModal({ type: "create-site" });
                      }}
                    >
                      <span className="profile-account-icon">
                        <Plus size={15} />
                      </span>
                      <div className="profile-account-details">
                        <span className="profile-account-title">Yeni Site Aç</span>
                        <span className="profile-account-sub">Yeni bir apartman veya site oluştur</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="profile-account-item"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setModal({ type: "invite" });
                      }}
                    >
                      <span className="profile-account-icon">
                        <KeyRound size={15} />
                      </span>
                      <div className="profile-account-details">
                        <span className="profile-account-title">Davet bağlantım var</span>
                        <span className="profile-account-sub">Başka bir siteye katıl</span>
                      </div>
                    </button>
                  </div>

                  <div className="profile-dropdown-footer">
                    <button
                      type="button"
                      className="profile-dropdown-logout-btn"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <EmailVerifyBanner user={auth.user} onNotify={notify} />
          {tab !== "dashboard" && (
            <div className="page-intro module-title">
              <div>
                <span className="eyebrow">
                  {tab === "settings"
                    ? canSiteSettings
                      ? "SİTE YÖNETİMİ / AYARLAR"
                      : "PROFİL & DAİRE YÖNETİMİ"
                    : tab === "apartments"
                    ? "SİTE YÖNETİMİ / DAİRELER"
                    : siteMeta.name.toLocaleUpperCase("tr-TR")}
                </span>
                <h1>
                  {tab === "settings"
                    ? canSiteSettings
                      ? "Site Ayarları"
                      : "Hesap & Daire Ayarları"
                    : navigation.find((n) => n.id === tab)?.label}
                  <span className="heading-dot">.</span>
                </h1>
              </div>
              <span className="demo-pill">
                <span />
                Aktif Yönetim
              </span>
            </div>
          )}
          <ErrorBoundary>
          {tab === "dashboard" && (
            <Dashboard
              manager={manager}
              user={user}
              units={initialUnits}
              dues={visibleDues}
              requests={visibleRequests}
              announcements={announcements}
              onNavigate={navigate}
              onPay={(due) => setModal({ type: "pay", due })}
              onRequest={() => setModal({ type: "request" })}
              residentName={residentName}
              siteName={siteMeta.name}
              siteStats={site ? { unitCount: site.unitCount, blockCount: site.blockCount, occupiedCount } : undefined}
            />
          )}{" "}
          {tab === "apartments" && canApartments && <ApartmentsLive auth={auth} onNotify={notify} />}{" "}
          {tab === "roles" && canRoles && <RolesLive auth={auth} onNotify={notify} />}{" "}
          {tab === "settings" && (
            canSiteSettings ? (
              <SiteSettingsLive auth={auth} siteMeta={siteMeta} onSiteUpdated={setSite} onNotify={notify} />
            ) : (
              <ResidentSettings
                user={user}
                session={{ unitId: userUnitId || "" }}
                units={initialUnits}
                onNotify={notify}
                onSwitchToManager={() => {}}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )
          )}{" "}
          {tab === "payments" && (
            <Payments
              dues={visibleDues}
              units={initialUnits}
              residentName={residentName}
              manager={manager}
              onPay={pay}
              onAccrue={(items) => {
                if (!manager) return;
                setDues((prev) => [...items, ...prev]);
                notify(`${items.length} daire için borç kaydı oluşturuldu.`);
              }}
              onReview={(id, approved) => {
                if (!manager) return;
                setDues((prev) =>
                  prev.map((d) =>
                    d.id === id
                      ? {
                          ...d,
                          status: approved ? "Ödendi" : "Ödenmemiş",
                          paidDate: approved ? TODAY : null,
                        }
                      : d,
                  ),
                );
                notify(approved ? "Ödeme onaylandı." : "Ödeme bildirimi reddedildi.");
              }}
              notify={notify}
            />
          )}{" "}
          {tab === "requests" && (
            <Requests
              requests={visibleRequests}
              manager={manager}
              residentName={residentName}
              unitId={activeUnitId}
              onCreate={createRequest}
              onStatus={(id, status) => {
                if (!manager) return;
                setRequests((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, status } : r)),
                );
                notify("Talep durumu güncellendi.");
              }}
            />
          )}{" "}
          {tab === "announcements" && (
            <Announcements
              announcements={announcements}
              manager={manager}
              auth={auth}
              onAddAnnouncement={(newAnn) => {
                setAnnouncements((prev) => [newAnn, ...prev]);
                notify("Yeni duyuru başarıyla yayınlandı.");
              }}
              onDeleteAnnouncement={(id) => {
                setAnnouncements((prev) => prev.filter((a) => a.id !== id));
                notify("Duyuru yayından kaldırıldı.");
              }}
            />
          )}
          </ErrorBoundary>
          <footer className="page-footer">
            <span>© 2026 Kovan · Yaşamın düzeni.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button aria-label="Bildirimi kapat" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {(inviteToken || modal?.type === "invite") && (
        <InviteJoinModal
          initialToken={inviteToken}
          onClose={() => {
            closeInvite();
            closeModal();
          }}
          onNotify={notify}
          onJoined={() => {
            closeInvite();
            closeModal();
            setTab("dashboard");
          }}
        />
      )}
      {modal?.type === "create-site" && (
        <CreateSiteModal
          onClose={closeModal}
          onNotify={notify}
          onCreated={() => {
            closeModal();
            setTab("dashboard");
          }}
        />
      )}
      {modal?.type === "pay" && (
        <PaymentModal
          due={modal.due}
          onClose={closeModal}
          onSubmit={(id, method) => {
            pay(id, method);
            closeModal();
          }}
        />
      )}
      {modal?.type === "request" && (
        <RequestModal
          unitId={activeUnitId}
          onClose={closeModal}
          onSubmit={(r) => {
            createRequest(r);
            closeModal();
          }}
        />
      )}
      {modal?.type === "help" && (
        <Modal
          title="Yardım ve İletişim Rehberi"
          description={`${siteMeta.name} yönetim, güvenlik ve teknik destek irtibatları`}
          onClose={closeModal}
        >
          <div className="help-modal-content">
            <div className="help-cards-grid">
              {/* 1. Yönetim Ofisi */}
              <div className="help-contact-card">
                <div className="help-card-icon text-gold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4>Yönetim Ofisi</h4>
                  <span className="help-badge">A Blok · Zemin Kat</span>
                  <div className="help-info-list">
                    <div className="help-info-item">
                      <Clock size={13} />
                      <span>Hafta İçi: 09:00 – 18:00</span>
                    </div>
                    <div className="help-info-item">
                      <Phone size={13} />
                      <span>Dahili: <strong>100</strong> (0532 555 99 00)</span>
                    </div>
                    <div className="help-info-item">
                      <Mail size={13} />
                      <span>yonetim@kovan.app</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 7/24 Güvenlik & Danışma */}
              <div className="help-contact-card">
                <div className="help-card-icon text-gold">
                  <Shield size={20} />
                </div>
                <div>
                  <h4>Güvenlik & Danışma</h4>
                  <span className="help-badge success">7/24 Kesintisiz Hizmet</span>
                  <div className="help-info-list">
                    <div className="help-info-item">
                      <MapPin size={13} />
                      <span>Ana Giriş Nizamiyesi</span>
                    </div>
                    <div className="help-info-item">
                      <Phone size={13} />
                      <span>Dahili: <strong>101</strong> (0532 555 99 01)</span>
                    </div>
                    <div className="help-info-item">
                      <Clock size={13} />
                      <span>Misafir Araç & Kargo Kabulü</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Teknik Servis & Arıza Bildirimi */}
              <div className="help-contact-card full-span">
                <div className="help-card-icon text-gold">
                  <Wrench size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center justify-between">
                    <h4>Teknik Servis & Arıza Masası</h4>
                    <span className="help-badge progress">Dahili: 102</span>
                  </div>
                  <p className="help-desc">
                    Ortak alan elektrik, hidrofor, asansör veya sıhhi tesisat arızalarını doğrudan sistem üzerinden iletebilir ve durumunu takip edebilirsiniz.
                  </p>
                  <div className="help-actions-row">
                    <Button
                      type="button"
                      secondary
                      onClick={() => {
                        closeModal();
                        navigate("requests");
                      }}
                    >
                      <MessageSquare size={14} /> Talepleri Görüntüle
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        closeModal();
                        setModal({ type: "request" });
                      }}
                    >
                      Yeni Talep / Arıza Bildir
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* SSS / Hızlı İpuçları Kutusu */}
            <div className="help-faq-box">
              <div className="faq-title">
                <CircleHelp size={15} className="text-gold" />
                <strong>Hızlı Bilgiler & Sıkça Sorulanlar</strong>
              </div>
              <ul className="faq-list">
                <li>
                  <strong>Aidat Ödemeleri:</strong> Sol menüdeki <em>"Aidat ve Ödemeler"</em> sekmesinden kredi kartı veya havale ile anında ödenebilir.
                </li>
                <li>
                  <strong>Talep ve Arıza Bildirimi:</strong> Ortak alanlardaki teknik arıza ve temizlik taleplerinizi <em>"Talep ve Şikayetler"</em> sekmesinden iletebilirsiniz.
                </li>
              </ul>
            </div>

            <div className="modal-footer mt-3">
              <Button secondary type="button" onClick={closeModal} className="w-full">
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ArrowChevron() {
  return <ChevronRight size={15} />;
}
