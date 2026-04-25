import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useLanguage } from '../../../../contexts/LanguageContext';

const GeneralSection = () => {
    const { theme, setTheme } = useTheme();
    const { t } = useLanguage();

    const handleThemeChange = (e) => {
        const value = e.target.value;
        if (value === 'dark') setTheme('dark');
        else if (value === 'light') setTheme('light');
        else setTheme('dark'); // App Default = dark
    };

    const selectValue = theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : 'default';

    return (
        <section>
            <h2 className="text-xl font-medium text-text-primary mb-8">{t('general.title')}</h2>
            <div className="max-w-2xl space-y-8">
                
                {/* Theme Setting */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">{t('general.theme.label')}</h3>
                        <p className="text-[13px] text-text-secondary mt-1">{t('general.theme.hint')}</p>
                    </div>
                    <select 
                        value={selectValue}
                        onChange={handleThemeChange}
                        className="h-9 w-40 bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer"
                    >
                        <option value="default">{t('general.theme.default')}</option>
                        <option value="dark">{t('general.theme.dark')}</option>
                        <option value="light">{t('general.theme.light')}</option>
                    </select>
                </div>

                {/* Date/Time Format */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">{t('general.datetime.label')}</h3>
                        <p className="text-[13px] text-text-secondary mt-1">{t('general.datetime.hint')}</p>
                    </div>
                    <select className="h-9 w-40 bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer">
                        <option>24-hour (14:30)</option>
                        <option>12-hour (2:30 PM)</option>
                    </select>
                </div>

                {/* Timezone */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">{t('general.timezone.label')}</h3>
                        <p className="text-[13px] text-text-secondary mt-1">{t('general.timezone.hint')}</p>
                    </div>
                    <select className="h-9 w-[260px] bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer">
                        <option defaultValue>(GMT+07:00) Indochina Time - Ho Chi Minh</option>
                        <option>(GMT+00:00) Universal Coordinated Time</option>
                        <option>(GMT-08:00) Pacific Time - Los Angeles</option>
                    </select>
                </div>

            </div>
        </section>
    );
};

export default GeneralSection;

