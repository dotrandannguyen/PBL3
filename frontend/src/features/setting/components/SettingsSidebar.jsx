import React from 'react';
import { User, Settings, Link as LinkIcon, Bell, Globe, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAccountModal } from '../contexts/AccountModalContext';

const SECTIONS = [
    { id: 'general',       labelKey: 'nav.general',       icon: Settings },
    { id: 'integrations',  labelKey: 'nav.integrations',  icon: LinkIcon },
    { id: 'notifications', labelKey: 'nav.notifications', icon: Bell },
    { id: 'language',      labelKey: 'nav.language',      icon: Globe },
];

/**
 * SettingsSidebar — refined navigation with vertical accent bar on active.
 *
 * onNavClick(id) calls SettingsContent.scrollToSection(id) via the bridge
 * in SettingsPage.
 */
const SettingsSidebar = ({ activeSection, onNavClick }) => {
    const { t } = useLanguage();
    const { open: openAccountModal } = useAccountModal();

    return (
        <div className="px-3 py-6">
            <h2 className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                {t('settings.section.label') || 'Settings'}
            </h2>

            {/* Shortcut: open Account modal */}
            <button
                type="button"
                onClick={openAccountModal}
                className="group mb-3 flex w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-sidebar/60 px-3 py-2 text-left text-[13px] text-text-secondary transition-all duration-150 hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.99]"
            >
                <User
                    size={15}
                    className="shrink-0 text-text-tertiary group-hover:text-accent-primary transition-colors"
                />
                <span className="flex-1 truncate">Hồ sơ & Tài khoản</span>
                <ExternalLink
                    size={12}
                    className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </button>

            <nav className="flex flex-col gap-0.5">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => onNavClick(section.id)}
                            className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-left text-[13px] transition-all duration-150 active:scale-[0.99] ${
                                isActive
                                    ? 'bg-white/[0.04] font-medium text-text-primary'
                                    : 'text-text-secondary hover:bg-white/[0.025] hover:text-text-primary'
                            }`}
                        >
                            {/* Vertical active indicator bar */}
                            <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent-primary transition-all duration-200 ${
                                    isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'
                                }`}
                            />
                            <Icon
                                size={15}
                                className={`shrink-0 transition-colors duration-150 ${
                                    isActive
                                        ? 'text-accent-primary'
                                        : 'text-text-tertiary group-hover:text-text-secondary'
                                }`}
                            />
                            <span className="truncate">{t(section.labelKey)}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default SettingsSidebar;
