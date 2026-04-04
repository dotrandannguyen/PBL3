import React from 'react';
import { User, Settings, Link as LinkIcon, Bell } from 'lucide-react';

const SECTIONS = [
    { id: 'profile', label: 'Account & Profile', icon: User },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
];

const SettingsSidebar = ({ activeSection, onNavClick }) => {
    return (
        <div className="py-6 px-4">
            <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-3">
                Settings
            </h2>
            <nav className="space-y-0.5">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                        <button
                            key={section.id}
                            onClick={() => {
                                onNavClick(section.id);
                                const el = document.getElementById(`section-${section.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                isActive 
                                    ? 'bg-accent-primary/10 text-accent-primary font-medium' 
                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                            }`}
                        >
                            <Icon size={16} className={`mr-3 ${isActive ? 'text-accent-primary' : 'text-text-tertiary'}`} />
                            {section.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default SettingsSidebar;
