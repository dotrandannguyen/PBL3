import React, { useState, useEffect } from 'react';
import { Mail, Bell } from 'lucide-react';
import useAuth from '../../../auth/hooks/useAuth';
import { useLanguage } from '../../../../contexts/LanguageContext';

/**
 * Animated toggle switch component
 * Custom implementation — no external library needed.
 */
const ToggleSwitch = ({ enabled, onToggle, id }) => (
    <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer border-0 ${
            enabled ? 'bg-accent-primary' : 'bg-border-subtle'
        }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

const STORAGE_KEY_PREFIX = 'notif';

const NotificationsSection = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}-${user.id}` : STORAGE_KEY_PREFIX;

    const [emailNotif, setEmailNotif] = useState(true);
    const [pushNotif, setPushNotif] = useState(true);

    // Load saved preferences on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.email === 'boolean') setEmailNotif(parsed.email);
                if (typeof parsed.push === 'boolean') setPushNotif(parsed.push);
            }
        } catch {
            // Corrupted data — use defaults
        }
    }, [storageKey]);

    // Persist whenever values change
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify({ email: emailNotif, push: pushNotif }));
    }, [emailNotif, pushNotif, storageKey]);

    return (
        <section>
            <h2 className="text-xl font-medium text-text-primary mb-2">{t('notif.title')}</h2>
            <p className="text-[13px] text-text-secondary mb-8">{t('notif.subtitle')}</p>

            <div className="max-w-2xl space-y-6">
                {/* Email Notifications */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border-subtle bg-bg-sidebar/50 hover:bg-bg-hover/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                            <Mail size={18} className="text-accent-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-text-primary">{t('notif.email.label')}</h3>
                            <p className="text-[12px] text-text-secondary mt-0.5">
                                {t('notif.email.hint')}
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch
                        id="toggle-email-notif"
                        enabled={emailNotif}
                        onToggle={() => setEmailNotif(!emailNotif)}
                    />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border-subtle bg-bg-sidebar/50 hover:bg-bg-hover/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <Bell size={18} className="text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-text-primary">{t('notif.push.label')}</h3>
                            <p className="text-[12px] text-text-secondary mt-0.5">
                                {t('notif.push.hint')}
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch
                        id="toggle-push-notif"
                        enabled={pushNotif}
                        onToggle={() => setPushNotif(!pushNotif)}
                    />
                </div>
            </div>
        </section>
    );
};

export default NotificationsSection;
