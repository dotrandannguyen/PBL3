import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Camera,
  User,
  Mail,
  Shield,
  CalendarDays,
  Fingerprint,
  Trash2,
  KeyRound,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "../../../auth/hooks/useAuth";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { updateCurrentUser } from "../../api/user.api";

/* ─── Tiny helpers ────────────────────────────────────────────────── */

const InfoRow = ({ icon: Icon, label, children, mono = false }) => (
  <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && <Icon size={13} className="shrink-0 text-text-tertiary" />}
      <span className="text-[12px] font-medium text-text-tertiary">
        {label}
      </span>
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

/* ─── Section ─────────────────────────────────────────────────────── */

const ProfileSection = () => {
  const { user, updateUserInStorage } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  // Initial load from localStorage when user becomes available
  useEffect(() => {
    if (!user?.id) return;
    setAvatarPreview(user?.avatarUrl || null);
    setBio(user?.bio || "");
  }, [user?.id, user?.avatarUrl, user?.bio]);

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);

  const initial =
    user?.fullName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("profile.toast.avatarTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setAvatarPreview(base64);
      toast.success(t("profile.toast.avatarUpdated"));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    toast.success("Đã xóa ảnh đại diện");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await updateCurrentUser({
        fullName: fullName.trim() || null,
        avatarUrl: avatarPreview || null,
        bio: bio.trim() || null,
      });
      const updated = response?.data?.data;
      if (updated) {
        updateUserInStorage(updated);
      }
      toast.success(t("profile.toast.saved"));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Lưu thông tin thất bại";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetChanges = () => {
    setFullName(user?.fullName || "");
    setBio(user?.bio || "");
  };

  const hasChanges = useMemo(() => {
    const currentAvatar = user?.avatarUrl || null;
    return (
      fullName.trim() !== (user?.fullName || "") ||
      bio !== (user?.bio || "") ||
      (avatarPreview || null) !== currentAvatar
    );
  }, [fullName, bio, avatarPreview, user]);

  const handleCopyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setIdCopied(true);
      toast.success("Đã sao chép User ID");
      setTimeout(() => setIdCopied(false), 1600);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  const providerMeta = (() => {
    switch (user?.provider) {
      case "google":
        return { label: "Google", tone: "blue" };
      case "github":
        return { label: "GitHub", tone: "slate" };
      case "slack":
        return { label: "Slack", tone: "purple" };
      default:
        return { label: "Local", tone: "emerald" };
    }
  })();

  return (
    <section>
      {/* Section header */}
      <header className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          {t("profile.title")}
        </h2>
        <p className="mt-1 text-[13px] text-text-tertiary">
          {t("profile.subtitle") ||
            "Quản lý thông tin hồ sơ và tài khoản của bạn."}
        </p>
      </header>

      {/* ── Profile card ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-sidebar to-bg-sidebar/60">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_240px]">
          {/* Left column: avatar + identity */}
          <div className="flex items-center gap-5 p-6">
            {/* Avatar with hover overlay */}
            <div className="group relative shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="relative h-20 w-20 overflow-hidden rounded-full border border-border-subtle bg-gradient-to-br from-accent-primary/30 to-accent-primary/10 p-0 text-3xl font-semibold text-accent-primary outline-none ring-2 ring-transparent transition-all duration-150 hover:ring-accent-primary/40 active:scale-95"
                title={t("profile.avatar.hint")}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    {initial}
                  </span>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Camera size={16} className="text-white" />
                  <span className="text-[9.5px] font-medium uppercase tracking-wide text-white/90">
                    Đổi ảnh
                  </span>
                </div>
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border-subtle bg-bg-sidebar text-text-tertiary opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 active:scale-90"
                  title="Xoá ảnh"
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

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-text-primary">
                {user?.fullName || user?.email || "—"}
              </p>
              <p className="mt-0.5 truncate text-[12.5px] text-text-tertiary">
                {user?.email}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-main/60 px-2.5 text-[11.5px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97]"
                >
                  <Camera size={12} />
                  Đổi ảnh
                </button>
                <span className="text-[10.5px] text-text-tertiary">
                  JPG/PNG · ≤ 2MB
                </span>
              </div>
            </div>
          </div>

          {/* Right column: metadata grid (border-left on desktop, top on mobile) */}
          <div className="border-t border-border-subtle bg-white/[0.015] p-6 lg:border-l lg:border-t-0">
            <InfoRow icon={Shield} label="Loại tài khoản">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                  providerMeta.tone === "blue"
                    ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                    : providerMeta.tone === "slate"
                      ? "bg-slate-500/10 text-slate-300 ring-slate-500/20"
                      : providerMeta.tone === "purple"
                        ? "bg-purple-500/10 text-purple-300 ring-purple-500/20"
                        : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    providerMeta.tone === "blue"
                      ? "bg-blue-400"
                      : providerMeta.tone === "slate"
                        ? "bg-slate-300"
                        : providerMeta.tone === "purple"
                          ? "bg-purple-300"
                          : "bg-emerald-400"
                  }`}
                />
                {providerMeta.label}
              </span>
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Thành viên từ">
              {memberSince}
            </InfoRow>
            <InfoRow icon={Fingerprint} label="User ID">
              <button
                type="button"
                onClick={handleCopyId}
                className="group inline-flex items-center gap-1.5 rounded px-1 text-text-tertiary transition-colors hover:text-text-primary"
                title="Sao chép User ID"
              >
                <span className="font-mono">
                  {user?.id ? `…${user.id.slice(-10)}` : "N/A"}
                </span>
                {idCopied ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy
                    size={11}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                )}
              </button>
            </InfoRow>
          </div>
        </div>
      </div>

      {/* ── Personal info card ─────────────────────────────── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar/60">
        <div className="border-b border-border-subtle/70 px-6 py-4">
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
            <User size={14} className="text-text-tertiary" />
            Thông tin cá nhân
          </h3>
        </div>

        <div className="space-y-5 p-6">
          {/* Full name */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-fullname"
              className="block text-[11.5px] font-medium text-text-secondary"
            >
              {t("profile.label.fullName")}
            </label>
            <input
              id="profile-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên..."
              className="h-10 w-full max-w-lg rounded-lg border border-border-subtle bg-bg-main/60 px-3 text-[13.5px] text-text-primary placeholder-text-tertiary outline-none transition-all duration-150 focus:border-accent-primary focus:bg-bg-main focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[11.5px] font-medium text-text-secondary">
              {t("profile.label.email")}
            </label>
            <div className="relative max-w-lg">
              <Mail
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="h-10 w-full cursor-not-allowed rounded-lg border border-border-subtle/60 bg-white/[0.015] pl-9 pr-3 text-[13.5px] text-text-tertiary"
              />
            </div>
            <p className="text-[11.5px] text-text-tertiary">
              {t("profile.email.hint")}
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-bio"
              className="block text-[11.5px] font-medium text-text-secondary"
            >
              Giới thiệu bản thân
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết một vài dòng giới thiệu về bạn..."
              maxLength={200}
              rows={3}
              className="w-full max-w-lg resize-none rounded-lg border border-border-subtle bg-bg-main/60 px-3 py-2 text-[13.5px] text-text-primary placeholder-text-tertiary outline-none transition-all duration-150 focus:border-accent-primary focus:bg-bg-main focus:ring-2 focus:ring-accent-primary/20"
            />
            <div className="flex max-w-lg items-center justify-end">
              <span
                className={`text-[11px] tabular-nums ${
                  bio.length > 180 ? "text-yellow-400" : "text-text-tertiary"
                }`}
              >
                {bio.length}/200
              </span>
            </div>
          </div>
        </div>

        {/* Sticky save bar (appears when there are unsaved changes) */}
        <div
          className={`grid overflow-hidden border-t border-border-subtle/70 bg-bg-main/40 transition-[grid-template-rows] duration-200 ease-out ${
            hasChanges ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-3">
              <span className="flex items-center gap-2 text-[12px] text-text-secondary">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent-primary" />
                Có thay đổi chưa lưu
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetChanges}
                  disabled={isSaving}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-40"
                >
                  Hoàn tác
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-md bg-accent-primary px-4 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-accent-hover hover:shadow-accent-primary/25 hover:shadow-md active:scale-[0.97] disabled:opacity-60"
                >
                  {isSaving ? t("profile.btn.saving") : t("profile.btn.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security card ──────────────────────────────────── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar/60">
        <div className="border-b border-border-subtle/70 px-6 py-4">
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-text-primary">
            <Shield size={14} className="text-text-tertiary" />
            Bảo mật tài khoản
          </h3>
        </div>

        <div className="divide-y divide-border-subtle/50">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
                <KeyRound size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text-primary">
                  Mật khẩu
                </p>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  {user?.provider === "google"
                    ? "Bạn đăng nhập bằng Google — không có mật khẩu."
                    : "Thay đổi mật khẩu tài khoản của bạn."}
                </p>
              </div>
            </div>
            {user?.provider === "google" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Google Auth
              </span>
            ) : (
              <button
                type="button"
                className="rounded-md border border-border-subtle bg-bg-main/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97]"
                onClick={() => toast.info("Tính năng đang phát triển.")}
              >
                Đổi mật khẩu
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
                <Smartphone size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text-primary">
                  Phiên đăng nhập
                </p>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Quản lý các thiết bị đang đăng nhập.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md border border-border-subtle bg-bg-main/60 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.97]"
              onClick={() => toast.info("Tính năng đang phát triển.")}
            >
              Xem phiên
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileSection;
