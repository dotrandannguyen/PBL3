import React, { useState, useEffect } from 'react';
import { Mail, Bell, Volume2, Calendar } from 'lucide-react';
import useAuth from '../../../auth/hooks/useAuth';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Toggle } from '@/components/shared';

const STORAGE_KEY_PREFIX = 'notif';

const DEFAULTS = {
    email: true,
    push: true,
    sound: false,
    digest: true,
};

const NotificationsSection = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const storageKey = user?.id
        ? `${STORAGE_KEY_PREFIX}-${user.id}`
        : STORAGE_KEY_PREFIX;

    const [prefs, setPrefs] = useState(DEFAULTS);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPrefs({ ...DEFAULTS, ...parsed });
            }
        } catch {
            /* corrupted — keep defaults */
        }
    }, [storageKey]);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
    }, [storageKey, prefs]);

    const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

    const items = [
        {
            id: 'email',
            icon: Mail,
            iconBg: 'bg-blue-500/12',
            iconColor: 'text-blue-400',
            label: t('notif.email.label'),
            hint: t('notif.email.hint'),
        },
        {
            id: 'push',
            icon: Bell,
            iconBg: 'bg-yellow-500/12',
            iconColor: 'text-yellow-400',
            label: t('notif.push.label'),
            hint: t('notif.push.hint'),
        },
        {
            id: 'sound',
            icon: Volume2,
            iconBg: 'bg-purple-500/12',
            iconColor: 'text-purple-400',
            label: 'Âm thanh thông báo',
            hint: 'Phát âm thanh ngắn khi có thông báo mới.',
        },
        {
            id: 'digest',
            icon: Calendar,
            iconBg: 'bg-emerald-500/12',
            iconColor: 'text-emerald-400',
            label: 'Tóm tắt hằng ngày',
            hint: 'Nhận email tóm tắt task & sự kiện vào 8:00 sáng mỗi ngày.',
        },
    ];

    return (
        <section>
            {/* Section header */}
            <header className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    {t('notif.title')}
                </h2>
                <p className="mt-1 text-[13px] text-text-tertiary">
                    {t('notif.subtitle')}
                </p>
            </header>

            {/* Notifications list — single rounded card with divided rows */}
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-sidebar/60 divide-y divide-border-subtle/50">
                {items.map((item) => {
                    const Icon = item.icon;
                    const enabled = prefs[item.id];
                    return (
                        <label
                            key={item.id}
                            htmlFor={`toggle-${item.id}`}
                            className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.015]"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <div
                                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
                                >
                                    <Icon size={16} className={item.iconColor} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[13.5px] font-medium text-text-primary">
                                        {item.label}
                                    </h3>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-text-tertiary">
                                        {item.hint}
                                    </p>
                                </div>
                            </div>
                            <Toggle
                                id={`toggle-${item.id}`}
                                checked={enabled}
                                onChange={() => toggle(item.id)}
                            />
                        </label>
                    );
                })}
            </div>
        </section>
    );
};

export default NotificationsSection;
