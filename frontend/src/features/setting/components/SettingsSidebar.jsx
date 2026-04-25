import React from 'react';
import { User, Settings, Link as LinkIcon, Bell, Globe } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const SECTIONS = [
    { id: 'profile',       labelKey: 'nav.profile',       icon: User },
    { id: 'general',       labelKey: 'nav.general',       icon: Settings },
    { id: 'integrations',  labelKey: 'nav.integrations',  icon: LinkIcon },
    { id: 'notifications', labelKey: 'nav.notifications', icon: Bell },
    { id: 'language',      labelKey: 'nav.language',      icon: Globe },
];

/**
 * SettingsSidebar
 *
 * onNavClick(id) is now expected to call SettingsContent.scrollToSection(id)
 * via the bridge in SettingsPage — so we no longer need scrollIntoView here.
 */
const SettingsSidebar = ({ activeSection, onNavClick }) => {
    const { t } = useLanguage();

    return (
        <div className="py-6 px-3">
            <h2 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest mb-3 px-3">
                Settings
            </h2>

            <nav className="space-y-0.5">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => onNavClick(section.id)}
                            className={`
                                w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg
                                transition-colors duration-150 text-left
                                ${isActive
                                    ? 'bg-accent-primary/10 text-accent-primary font-medium'
                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                }
                            `}
                        >
                            <Icon
                                size={15}
                                className={`shrink-0 ${isActive ? 'text-accent-primary' : 'text-text-tertiary'}`}
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
