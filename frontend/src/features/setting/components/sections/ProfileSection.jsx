import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Mail, Shield, CalendarDays, CheckCircle2, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import useAuth from '../../../auth/hooks/useAuth';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ProfileSection = () => {
    const { user, updateUserInStorage } = useAuth();
    const { t } = useLanguage();
    const fileInputRef = useRef(null);

    const [fullName, setFullName] = useState(user?.fullName || '');
    const [bio, setBio] = useState('');
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load saved avatar & bio from localStorage
    useEffect(() => {
        if (user?.id) {
            const savedAvatar = localStorage.getItem(`avatar-${user.id}`);
            if (savedAvatar) setAvatarPreview(savedAvatar);
            const savedBio = localStorage.getItem(`bio-${user.id}`);
            if (savedBio) setBio(savedBio);
        }
    }, [user?.id]);

    // Sync fullName if user changes
    useEffect(() => {
        if (user?.fullName) setFullName(user.fullName);
    }, [user?.fullName]);

    const initial = user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error(t('profile.toast.avatarTooLarge'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            setAvatarPreview(base64);
            if (user?.id) localStorage.setItem(`avatar-${user.id}`, base64);
            toast.success(t('profile.toast.avatarUpdated'));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        setAvatarPreview(null);
        if (user?.id) localStorage.removeItem(`avatar-${user.id}`);
        toast.success('Đã xóa ảnh đại diện');
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            updateUserInStorage({ fullName: fullName.trim() || user?.fullName });
            if (user?.id) localStorage.setItem(`bio-${user.id}`, bio);
            setIsSaving(false);
            toast.success(t('profile.toast.saved'));
        }, 300);
    };

    const hasChanges =
        fullName.trim() !== (user?.fullName || '') ||
        bio !== (localStorage.getItem(`bio-${user?.id}`) || '');

    return (
        <section className="space-y-10">
            {/* ── Section title ── */}
            <div>
                <h2 className="text-xl font-semibold text-text-primary">{t('profile.title')}</h2>
                <p className="text-[13px] text-text-tertiary mt-1">Quản lý thông tin hồ sơ và tài khoản của bạn.</p>
            </div>

            {/* ── Avatar card ── */}
            <div className="rounded-xl border border-border-subtle bg-bg-sidebar p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                    {/* Left — avatar + actions */}
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                className="w-20 h-20 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-3xl font-semibold border-2 border-accent-primary/30 relative overflow-hidden cursor-pointer p-0"
                                title={t('profile.avatar.hint')}
                            >
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    initial
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                    <Camera size={18} className="text-white" />
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        {/* Name / email / actions */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{user?.fullName || user?.email}</p>
                            <p className="text-xs text-text-tertiary mt-0.5 truncate">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={handleAvatarClick}
                                    className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-main hover:bg-bg-hover rounded-md border border-border-subtle transition-all active:scale-[0.97]"
                                >
                                    Đổi ảnh
                                </button>
                                {avatarPreview && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-all active:scale-[0.97]"
                                    >
                                        Xóa ảnh
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-text-tertiary mt-2">Cho phép JPG, PNG. Tối đa 2MB.</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px self-stretch bg-border-subtle" />

                    {/* Right — account metadata */}
                    <div className="sm:w-52 shrink-0 flex flex-col gap-3.5">
                        {/* Account type */}
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Loại tài khoản</p>
                                {user?.provider === 'google' ? (
                                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 text-[11px] font-semibold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                        Google Account
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 text-[11px] font-semibold text-text-secondary bg-white/5 rounded-full border border-border-subtle">
                                        Tài khoản cục bộ
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Member since */}
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                <CalendarDays size={13} className="text-text-tertiary" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Thành viên từ</p>
                                <p className="text-xs text-text-primary mt-0.5">
                                    {user?.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* User ID */}
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                <Fingerprint size={13} className="text-text-tertiary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">User ID</p>
                                <p className="text-[11px] text-text-tertiary mt-0.5 font-mono truncate" title={user?.id}>
                                    {user?.id ? `...${user.id.slice(-12)}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Personal info card ── */}
            <div className="rounded-xl border border-border-subtle bg-bg-sidebar p-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                    <User size={15} className="text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Thông tin cá nhân</h3>
                </div>

                {/* Full name */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                        {t('profile.label.fullName')}
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên..."
                        className="w-full max-w-lg h-9 bg-bg-main border border-border-subtle rounded-lg px-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                    />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                        {t('profile.label.email')}
                    </label>
                    <div className="relative max-w-lg">
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full h-9 bg-bg-main border border-border-subtle rounded-lg px-3 pr-10 text-sm text-text-tertiary cursor-not-allowed opacity-60"
                        />
                        <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    </div>
                    <p className="text-xs text-text-tertiary">{t('profile.email.hint')}</p>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                        Giới thiệu bản thân
                    </label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Viết một vài dòng giới thiệu về bạn..."
                        maxLength={200}
                        rows={3}
                        className="w-full max-w-lg bg-bg-main border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all resize-none"
                    />
                    <p className="text-[11px] text-text-tertiary text-right max-w-lg">{bio.length}/200</p>
                </div>

                {/* Save button */}
                <div className="pt-1">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-all shadow-sm ${
                            hasChanges && !isSaving
                                ? 'bg-accent-primary hover:bg-accent-hover active:scale-[0.98] cursor-pointer'
                                : 'bg-accent-primary/40 cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? t('profile.btn.saving') : t('profile.btn.save')}
                    </button>
                </div>
            </div>

            {/* ── Account security card ── */}
            <div className="rounded-xl border border-border-subtle bg-bg-sidebar p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={15} className="text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Bảo mật tài khoản</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                        <div>
                            <p className="text-sm text-text-primary font-medium">Mật khẩu</p>
                            <p className="text-xs text-text-tertiary mt-0.5">
                                {user?.provider === 'google'
                                    ? 'Tài khoản đăng nhập bằng Google, không có mật khẩu.'
                                    : 'Thay đổi mật khẩu tài khoản của bạn.'}
                            </p>
                        </div>
                        {user?.provider !== 'google' && (
                            <button
                                type="button"
                                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary bg-bg-main hover:bg-bg-hover rounded-md border border-border-subtle transition-all active:scale-[0.97]"
                                onClick={() => toast.info('Tính năng đang phát triển.')}
                            >
                                Đổi mật khẩu
                            </button>
                        )}
                        {user?.provider === 'google' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                Google Auth
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-sm text-text-primary font-medium">Phiên đăng nhập</p>
                            <p className="text-xs text-text-tertiary mt-0.5">Quản lý các thiết bị đang đăng nhập.</p>
                        </div>
                        <button
                            type="button"
                            className="px-3.5 py-1.5 text-xs font-medium text-text-secondary bg-bg-main hover:bg-bg-hover rounded-md border border-border-subtle transition-all active:scale-[0.97]"
                            onClick={() => toast.info('Tính năng đang phát triển.')}
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
