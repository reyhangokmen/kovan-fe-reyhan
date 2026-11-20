import React, { Component, useEffect, useRef } from "react";
import { ArrowUpRight, Check, X, CircleHelp, Sun, Moon } from "lucide-react";
export function ThemeToggle({ theme, onToggle }) {
  const label = theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      <span>{theme === "dark" ? "Açık tema" : "Koyu tema"}</span>
    </button>
  );
}
export function Brand({ onClick, className = "", style }) {
  return (
    <div
      className={`brand ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      title={onClick ? "Genel Bakış ana sayfasına git" : undefined}
    >
      <img src="/brand/KOVAN_Yazi_ve_Simgeler.svg" alt="KOVAN" />
      <span>KONUT & SİTE YÖNETİMİ</span>
    </div>
  );
}
export function Badge({ status }) {
  return (
    <span
      className={`badge ${["Ödendi", "Çözüldü"].includes(status) ? "complete" : ["Yeni", "Ödenmemiş"].includes(status) ? "pending" : "progress"}`}
    >
      {["Ödendi", "Çözüldü"].includes(status) ? (
        <Check size={12} />
      ) : (
        <span className="status-dot" />
      )}
      {status}
    </span>
  );
}
export function Button({ children, secondary, className = "", ...props }) {
  return (
    <button
      className={`button ${secondary ? "secondary" : "primary"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function TextLink({ children, onClick }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Empty({ text = "Bu filtrelere uygun kayıt bulunamadı." }) {
  return (
    <div className="empty">
      <CircleHelp size={24} />
      <p>{text}</p>
    </div>
  );
}
export function Stat({ icon: Icon, label, value, note, accent, children }) {
  return (
    <div className={`stat ${accent ? "accent-stat" : ""}`}>
      <div className="stat-label">
        {label}
        <Icon size={18} />
      </div>
      <strong className="stat-value tabular-nums">{value}</strong>
      <div className="stat-note">{note}</div>
      {children}
    </div>
  );
}
export function Modal({ title, description, children, onClose }) {
  const ref = useRef(null);
  // onClose her çizimde yeni bir fonksiyon olabilir; pencere yalnızca açılışta bir kez açılmalı, aksi halde
  // her tuş vuruşunda kapanıp açılır ve imleç alandan kaçar.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const before = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const close = (e) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", close);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.removeEventListener("cancel", close);
      dialog.close();
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <h2 id="modal-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Kapat">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, required, error, children }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && (
          <span className="field-required-star" style={{ color: "#ef4444", marginLeft: "4px", fontWeight: "700" }} title="Zorunlu alan">
            *
          </span>
        )}
      </span>
      {children}
      {error && (
        <span className="field-error-msg" style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: "500" }}>
          {error}
        </span>
      )}
    </label>
  );
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, textAlign: "center" }}>
          <h2>Beklenmedik bir hata oluştu.</h2>
          <p style={{ color: "#888" }}>{this.state.error?.message}</p>
          <button
            className="button primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Yeniden Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
