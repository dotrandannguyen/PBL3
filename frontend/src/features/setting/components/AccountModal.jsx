import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  X,
  User,
  Camera,
  Mail,
  Shield,
  CalendarDays,
  Fingerprint,
  Trash2,
  KeyRound,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "../../auth/hooks/useAuth";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAccountModal } from "../contexts/AccountModalContext";

/* ─── Tiny helper ─────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, children, mono = false }) => (
  <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && <Icon size={13} className="shrink-0 text-text-tertiary" />}
      <span className="text-[12px] font-medium text-text-tertiary">{label}</span>
    </div>
    <div
      className={`min-w-0 truncate text-[12.5px] ${
        mono ? "font-mono text-text-tertiary" : "font-medium text-text-primary"
      }`}
    >
      {children}
    </div>
  </div>
);

const NAV_ITEMS = [
  { id: "identity", labelKey: "account.nav.identity", icon: IdCard },
  { id: "personal", labelKey: "account.nav.personal", icon: User },
  { id: "security", labelKey: "account.nav.security", icon: Shield },
  { id: "danger", labelKey: "account.nav.danger", icon: AlertTriangle },
];

const AccountModal = () => {
  const { isOpen, close } = useAccountModal();
  const { user, updateUserInStorage } = useAuth();
  const { t, lang } = useLanguage();

  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});
  const isProgrammaticRef = useRef(false);
  const programmaticTimerRef = useRef(null);

  const [activeSection, setActiveSection] = useState("identity");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Load from localStorage when modal opens / user changes
  useEffect(() => {
    if (!user?.id) return;
    const savedAvatar = localStorage.getItem(`avatar-${user.id}`);
    setAvatarPreview(savedAvatar || null);
    const savedBio = localStorage.getItem(`bio-${user.id}`);
    setBio(savedBio || "");
  }, [user?.id, isOpen]);

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);

  // ESC to close + lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  // Scroll-spy
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticRef.current) return;
      const top = container.scrollTop;
      let active = NAV_ITEMS[0].id;
      for (const item of NAV_ITEMS) {
        const el = sectionRefs.current[item.id];
        if (el && el.offsetTop <= top + 80) active = item.id;
      }
      setActiveSection(active);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const scrollToSection = useCallback((id) => {
    const container = scrollContainerRef.current;
    const el = sectionRefs.current[id];
    if (!container || !el) return;
    isProgrammaticRef.current = true;
    setActiveSection(id);
    container.scrollTo({ top: Math.max(0, el.offsetTop - 16), behavior: "smooth" });
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 600);
  }, []);

  // ── Avatar handlers ───────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("account.toast.avatarTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setAvatarPreview(base64);
      if (user?.id) localStorage.setItem(`avatar-${user.id}`, base64);
      toast.success(t("account.toast.avatarUpdated"));
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (user?.id) localStorage.removeItem(`avatar-${user.id}`);
    toast.success(t("account.toast.avatarRemoved"));
  };

  // ── Save / Reset ──────────────────────────────────────────────
  const hasChanges = useMemo(
    () =>
      fullName.trim() !== (user?.fullName || "") ||
      bio !== (localStorage.getItem(`bio-${user?.id}`) || ""),
    [fullName, bio, user]
  );

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateUserInStorage({ fullName: fullName.trim() || user?.fullName });
      if (user?.id) localStorage.setItem(`bio-${user.id}`, bio);
      setIsSaving(false);
      toast.success(t("account.toast.saved"));
    }, 300);
  };

  const handleResetChanges = () => {
    setFullName(user?.fullName || "");
    setBio(localStorage.getItem(`bio-${user?.id}`) || "");
  };

  const handleCopyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setIdCopied(true);
      toast.success(t("account.toast.idCopied"));
      setTimeout(() => setIdCopied(false), 1600);
    } catch {
      toast.error(t("account.toast.idCopyFailed"));
    }
  };

  const initial =
    user?.fullName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  const localeMap = { vi: "vi-VN", ja: "ja-JP", en: "en-US" };
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(localeMap[lang] || "en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm animate-backdrop-in"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal shell */}
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-[1100px] h-[88vh] max-h-[820px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label={t("account.title")}
        >
          {/* ── Left nav ────────────────────────────────────── */}
          <aside className="hidden md:flex md:w-[240px] flex-col border-r border-border-subtle bg-bg-sidebar/60">
            <div className="px-5 py-5 border-b border-border-subtle">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-2">
                {t("account.sidebar.label")}
              </p>
              <p className="truncate text-sm font-semibold text-text-primary">
                {user?.fullName || user?.email || "—"}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-text-tertiary">
                {user?.email}
              </p>
            </div>
            <nav className="flex flex-col gap-0.5 px-3 py-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isDanger = item.id === "danger";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 active:scale-[0.99] ${
                      isActive
                        ? isDanger
                          ? "bg-red-500/10 font-medium text-red-300"
                          : "bg-white/[0.04] font-medium text-text-primary"
                        : isDanger
                          ? "text-red-400/80 hover:bg-red-500/5 hover:text-red-300"
                          : "text-text-secondary hover:bg-white/[0.025] hover:text-text-primary"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full transition-all duration-200 ${
                        isActive
                          ? `${isDanger ? "bg-red-400" : "bg-accent-primary"} opacity-100 scale-y-100`
                          : "bg-accent-primary opacity-0 scale-y-50"
                      }`}
                    />
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive
                          ? isDanger
                            ? "text-red-300"
                            : "text-accent-primary"
                          : "text-text-tertiary group-hover:text-text-secondary"
                      }`}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Right content ──────────────────────────────── */}
          <div className="relative flex-1 flex flex-col min-w-0">
            {/* Header bar */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  {t("account.title")}
                </h2>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  {t("account.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                title={t("account.close")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable cards */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[760px] px-6 py-6 space-y-6">
                {/* ── Identity card ─────────────────────────── */}
                <div
                  ref={(el) => (sectionRefs.current.identity = el)}
                  id="account-identity"
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-sidebar to-bg-sidebar/60"
                >
                  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_240px]">
                    <div className="flex items-center gap-5 p-6">
                      <div className="group relative shrink-0">
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          className="relative h-20 w-20 overflow-hidden rounded-full border border-border-subtle bg-gradient-to-br from-accent-primary/30 to-accent-primary/10 p-0 text-3xl font-semibold text-accent-primary outline-none ring-2 ring-transparent transition-all duration-150 hover:ring-accent-primary/40 active:scale-95"
                          title={t("account.identity.changeAvatar")}
                        >
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">{initial}</span>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <Camera size={16} className="text-white" />
                            <span className="text-[9.5px] font-medium uppercase tracking-wide text-white/90">{t("account.identity.changeAvatar")}</span>
                          </div>
                        </button>
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border-subtle bg-bg-sidebar text-text-tertiary opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 active:scale-90"
                            title={t("account.identity.removeAvatar")}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-text-primary">
                          {user?.fullName || user?.email || "—"}
                        </p>
                        <p className="mt-0.5 truncate text-[12.5px] text-text-tertiary">{user?.email}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="flex h-7 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-main/60 px-2.5 text-[11.5px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97]"
                          >
                            <Camera size={12} />
                            {t("account.identity.changeAvatar")}
                          </button>
                          <span className="text-[10.5px] text-text-tertiary">{t("account.identity.avatarHint")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-border-subtle bg-white/[0.015] p-6 lg:border-l lg:border-t-0">
                      <InfoRow icon={Shield} label={t("account.identity.accountType")}>
                        {user?.provider === "google" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 ring-1 ring-blue-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            {t("account.provider.google")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {t("account.provider.local")}
                          </span>
                        )}
                      </InfoRow>
                      <InfoRow icon={CalendarDays} label={t("account.identity.memberSince")}>
                        {memberSince}
                      </InfoRow>
                      <InfoRow icon={Fingerprint} label={t("account.identity.userId")}>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="group inline-flex items-center gap-1.5 rounded px-1 text-text-tertiary transition-colors hover:text-text-primary border-none bg-transparent cursor-pointer"
                          title={t("account.identity.copyId")}
                        >
                          <span className="font-mono">{user?.id ? `…${user.id.slice(-10)}` : "N/A"}</span>
                          {idCopied ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                          )}
                        </button>
                      </InfoRow>
                    </div>
                  </div>
                </div>

                {/* ── Personal info card ─────────────────────── */}
                <div
                  ref={(el) => (sectionRefs.current.personal = el)}
                  id="account-personal"
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar/60"
                >
                  <div className="border-b border-border-subtle/70 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
                      <User size={14} className="text-text-tertiary" />
                      {t("account.personal.title")}
                    </h3>
                  </div>
                  <div className="space-y-5 p-6">
                    <div className="space-y-1.5">
                      <label htmlFor="account-fullname" className="block text-[11.5px] font-medium text-text-secondary">
                        {t("profile.label.fullName")}
                      </label>
                      <input
                        id="account-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("account.personal.fullNamePlaceholder")}
                        className="h-10 w-full max-w-lg rounded-lg border border-border-subtle bg-bg-main/60 px-3 text-[13.5px] text-text-primary placeholder-text-tertiary outline-none transition-all duration-150 focus:border-accent-primary focus:bg-bg-main focus:ring-2 focus:ring-accent-primary/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11.5px] font-medium text-text-secondary">{t("profile.label.email")}</label>
                      <div className="relative max-w-lg">
                        <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                        <input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="h-10 w-full cursor-not-allowed rounded-lg border border-border-subtle/60 bg-white/[0.015] pl-9 pr-3 text-[13.5px] text-text-tertiary"
                        />
                      </div>
                      <p className="text-[11.5px] text-text-tertiary">{t("profile.email.hint")}</p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="account-bio" className="block text-[11.5px] font-medium text-text-secondary">
                        {t("account.personal.bio")}
                      </label>
                      <textarea
                        id="account-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("account.personal.bioPlaceholder")}
                        maxLength={200}
                        rows={3}
                        className="w-full max-w-lg resize-none rounded-lg border border-border-subtle bg-bg-main/60 px-3 py-2 text-[13.5px] text-text-primary placeholder-text-tertiary outline-none transition-all duration-150 focus:border-accent-primary focus:bg-bg-main focus:ring-2 focus:ring-accent-primary/20"
                      />
                      <div className="flex max-w-lg items-center justify-end">
                        <span className={`text-[11px] tabular-nums ${bio.length > 180 ? "text-yellow-400" : "text-text-tertiary"}`}>
                          {bio.length}/200
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`grid overflow-hidden border-t border-border-subtle/70 bg-bg-main/40 transition-[grid-template-rows] duration-200 ease-out ${
                      hasChanges ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-6 py-3">
                        <span className="flex items-center gap-2 text-[12px] text-text-secondary">
                          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent-primary" />
                          {t("account.personal.unsavedChanges")}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleResetChanges}
                            disabled={isSaving}
                            className="rounded-md px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-40 border-none bg-transparent cursor-pointer"
                          >
                            {t("account.personal.undo")}
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-md bg-accent-primary px-4 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-accent-hover hover:shadow-accent-primary/25 hover:shadow-md active:scale-[0.97] disabled:opacity-60 border-none cursor-pointer"
                          >
                            {isSaving ? t("profile.btn.saving") : t("profile.btn.save")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Security card ──────────────────────────── */}
                <div
                  ref={(el) => (sectionRefs.current.security = el)}
                  id="account-security"
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar/60"
                >
                  <div className="border-b border-border-subtle/70 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
                      <Shield size={14} className="text-text-tertiary" />
                      {t("account.security.title")}
                    </h3>
                  </div>
                  <div className="divide-y divide-border-subtle/50">
                    <div className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
                          <KeyRound size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-text-primary">{t("account.security.password")}</p>
                          <p className="mt-0.5 text-[12px] text-text-tertiary">
                            {user?.provider === "google"
                              ? t("account.security.password.googleHint")
                              : t("account.security.password.localHint")}
                          </p>
                        </div>
                      </div>
                      {user?.provider === "google" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {t("account.security.password.googleBadge")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="rounded-md border border-border-subtle bg-bg-main/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97] cursor-pointer"
                          onClick={() => toast.info(t("account.toast.featureWIP"))}
                        >
                          {t("account.security.password.changeBtn")}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
                          <Smartphone size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-text-primary">{t("account.security.sessions")}</p>
                          <p className="mt-0.5 text-[12px] text-text-tertiary">{t("account.security.sessions.hint")}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-border-subtle bg-bg-main/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97] cursor-pointer"
                        onClick={() => toast.info(t("account.toast.featureWIP"))}
                      >
                        {t("account.security.sessions.viewBtn")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Danger zone ─────────────────────────────── */}
                <div
                  ref={(el) => (sectionRefs.current.danger = el)}
                  id="account-danger"
                  className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/[0.04]"
                >
                  <div className="border-b border-red-500/20 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-red-300">
                      <AlertTriangle size={14} className="text-red-300" />
                      {t("account.danger.title")}
                    </h3>
                    <p className="mt-1 text-[11.5px] text-text-tertiary">
                      {t("account.danger.subtitle")}
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-text-primary">{t("account.danger.delete.title")}</p>
                        <p className="mt-0.5 text-[12px] text-text-tertiary">
                          {t("account.danger.delete.hint")}
                        </p>
                      </div>
                      {!isConfirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(true)}
                          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-300 transition-all duration-150 hover:bg-red-500/20 hover:text-red-200 active:scale-[0.97] cursor-pointer"
                        >
                          {t("account.danger.delete.btn")}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(false)}
                            className="rounded-md border border-border-subtle bg-bg-main/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary cursor-pointer"
                          >
                            {t("account.danger.cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toast.info(t("account.toast.featureWIP"));
                              setIsConfirmingDelete(false);
                            }}
                            className="rounded-md bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-all duration-150 hover:bg-red-600 active:scale-[0.97] border-none cursor-pointer"
                          >
                            {t("account.danger.confirm")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountModal;
