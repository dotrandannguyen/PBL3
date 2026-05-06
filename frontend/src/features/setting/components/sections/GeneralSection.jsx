import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Clock, Globe2, Check } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Select } from '@/components/shared';
import useAuth from '../../../auth/hooks/useAuth';

const STORAGE_KEY = 'general-prefs';

const TIME_FORMATS = [
    { value: '24h', label: '24-hour', hint: '14:30' },
    { value: '12h', label: '12-hour', hint: '2:30 PM' },
];

const TIMEZONES = [
    { value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Indochina Time', hint: 'Ho Chi Minh, Hanoi' },
    { value: 'Asia/Tokyo',       label: '(GMT+9) Japan Standard',  hint: 'Tokyo, Osaka' },
    { value: 'UTC',              label: '(GMT+0) Coordinated',     hint: 'UTC' },
    { value: 'Europe/London',    label: '(GMT+0) Greenwich Mean',  hint: 'London' },
    { value: 'America/Los_Angeles', label: '(GMT-8) Pacific Time', hint: 'Los Angeles' },
    { value: 'America/New_York', label: '(GMT-5) Eastern Time',    hint: 'New York' },
];

/* ─── Theme card preview ─────────────────────────────────────────── */

const ThemePreview = ({ variant }) => {
    const isLight = variant === 'light';
    const isSystem = variant === 'system';

    if (isSystem) {
        return (
            <div className="flex h-14 w-full overflow-hidden rounded-md border border-border-subtle">
                {/* Left half = light */}
                <div className="flex-1 bg-[#f5f5f5] p-1.5">
                    <div className="h-1.5 w-3/5 rounded-full bg-[#d0d0d0]" />
                    <div className="mt-1 h-1.5 w-2/5 rounded-full bg-[#d0d0d0]" />
                </div>
                {/* Right half = dark */}
                <div className="flex-1 bg-[#1a1a1a] p-1.5">
                    <div className="h-1.5 w-3/5 rounded-full bg-[#3a3a3a]" />
                    <div className="mt-1 h-1.5 w-2/5 rounded-full bg-[#3a3a3a]" />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex h-14 w-full flex-col gap-1.5 overflow-hidden rounded-md border p-2 ${
                isLight
                    ? 'border-[#e0e0e0] bg-[#f7f7f5]'
                    : 'border-[#2a2a2a] bg-[#191919]'
            }`}
        >
            <div className="flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-red-400' : 'bg-red-500'}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-yellow-400' : 'bg-yellow-500'}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-green-400' : 'bg-green-500'}`} />
            </div>
            <div className="flex flex-1 gap-1.5">
                <div className={`h-full w-7 rounded-sm ${isLight ? 'bg-[#e8e8e6]' : 'bg-[#202020]'}`} />
                <div className="flex flex-1 flex-col gap-1 pt-0.5">
                    <div className={`h-1 w-3/4 rounded-full ${isLight ? 'bg-[#c4c4c0]' : 'bg-[#484848]'}`} />
                    <div className={`h-1 w-2/4 rounded-full ${isLight ? 'bg-[#d0d0cc]' : 'bg-[#3a3a3a]'}`} />
                    <div className={`h-1 w-3/5 rounded-full ${isLight ? 'bg-[#d0d0cc]' : 'bg-[#3a3a3a]'}`} />
                </div>
            </div>
        </div>
    );
};

/* ─── Section row helper ─────────────────────────────────────────── */

const Row = ({ icon: Icon, label, hint, children }) => (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
            {Icon && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-text-tertiary">
                    <Icon size={14} />
                </div>
            )}
            <div className="min-w-0">
                <h3 className="text-[13.5px] font-medium text-text-primary">{label}</h3>
                {hint && (
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-tertiary">
                        {hint}
                    </p>
                )}
            </div>
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

/* ─── Section ─────────────────────────────────────────────────────── */

const GeneralSection = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();

    // Local state for time format & timezone (persisted to localStorage)
    const storageKey = user?.id ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;
    const [timeFormat, setTimeFormat] = useState('24h');
    const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.timeFormat) setTimeFormat(parsed.timeFormat);
                if (parsed.timezone) setTimezone(parsed.timezone);
            }
        } catch {
            /* corrupted — ignore */
        }
    }, [storageKey]);

    useEffect(() => {
        localStorage.setItem(
            storageKey,
            JSON.stringify({ timeFormat, timezone })
        );
    }, [storageKey, timeFormat, timezone]);

    const themeOptions = [
        { value: 'light', icon: Sun, label: t('general.theme.light') || 'Light' },
        { value: 'dark', icon: Moon, label: t('general.theme.dark') || 'Dark' },
        { value: 'system', icon: Monitor, label: t('general.theme.default') || 'System' },
    ];

    const activeTheme = theme === 'light' ? 'light' : 'dark'; // system → dark for now

    const handleThemeChange = (val) => {
        if (val === 'light') setTheme('light');
        else setTheme('dark');
    };

    return (
        <section>
            {/* Section header */}
            <header className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    {t('general.title')}
                </h2>
                <p className="mt-1 text-[13px] text-text-tertiary">
                    {t('general.subtitle') || 'Personalize how the app looks and behaves.'}
                </p>
            </header>

            {/* Theme picker — visual cards */}
            <div className="mb-2">
                <h3 className="mb-3 text-[13.5px] font-medium text-text-primary">
                    {t('general.theme.label')}
                </h3>
                <p className="mb-4 text-[12.5px] text-text-tertiary">
                    {t('general.theme.hint')}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                    {themeOptions.map((opt) => {
                        const Icon = opt.icon;
                        const selected = activeTheme === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleThemeChange(opt.value)}
                                className={`group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-150 active:scale-[0.985] ${
                                    selected
                                        ? 'border-accent-primary bg-accent-primary/[0.04] ring-1 ring-accent-primary/40'
                                        : 'border-border-subtle bg-bg-sidebar/40 hover:border-border-focused hover:bg-bg-sidebar'
                                }`}
                            >
                                <ThemePreview variant={opt.value} />
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5">
                                        <Icon
                                            size={13}
                                            className={
                                                selected
                                                    ? 'text-accent-primary'
                                                    : 'text-text-tertiary'
                                            }
                                        />
                                        <span
                                            className={`text-[13px] font-medium ${
                                                selected
                                                    ? 'text-text-primary'
                                                    : 'text-text-secondary'
                                            }`}
                                        >
                                            {opt.label}
                                        </span>
                                    </span>
                                    {selected && (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-white">
                                            <Check size={10} strokeWidth={3} />
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Divider between groups */}
            <div className="my-8 h-px w-full bg-border-subtle/60" />

            {/* DateTime + timezone rows */}
            <div className="divide-y divide-border-subtle/50">
                <Row
                    icon={Clock}
                    label={t('general.datetime.label')}
                    hint={t('general.datetime.hint')}
                >
                    <Select
                        width="w-44"
                        value={timeFormat}
                        onChange={setTimeFormat}
                        options={TIME_FORMATS}
                    />
                </Row>

                <Row
                    icon={Globe2}
                    label={t('general.timezone.label')}
                    hint={t('general.timezone.hint')}
                >
                    <Select
                        width="w-72"
                        value={timezone}
                        onChange={setTimezone}
                        options={TIMEZONES}
                    />
                </Row>
            </div>
        </section>
    );
};

export default GeneralSection;
