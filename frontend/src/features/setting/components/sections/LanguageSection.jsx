import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

const LANGUAGES = [
    {
        code: 'vi',
        flag: '🇻🇳',
        name: 'Tiếng Việt',
        nativeName: 'Vietnamese',
    },
    {
        code: 'ja',
        flag: '🇯🇵',
        name: '日本語',
        nativeName: 'Japanese',
    },
    {
        code: 'en',
        flag: '🇺🇸',
        name: 'English',
        nativeName: 'English',
    },
];

const LanguageSection = () => {
    const { lang, setLang, t } = useLanguage();

    return (
        <section>
            {/* Section header */}
            <header className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    {t('lang.title')}
                </h2>
                <p className="mt-1 text-[13px] text-text-tertiary">
                    {t('lang.subtitle')}
                </p>
            </header>

            {/* Language picker */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LANGUAGES.map((language) => {
                    const isSelected = lang === language.code;
                    return (
                        <button
                            key={language.code}
                            type="button"
                            onClick={() => setLang(language.code)}
                            aria-pressed={isSelected}
                            className={`group relative flex flex-col items-center gap-2 rounded-xl border bg-bg-sidebar/40 p-5 transition-all duration-200 ease-out active:scale-[0.985] ${
                                isSelected
                                    ? 'border-accent-primary/60 bg-accent-primary/[0.04] ring-1 ring-accent-primary/40 shadow-lg shadow-accent-primary/[0.08]'
                                    : 'border-border-subtle hover:border-border-focused hover:bg-bg-sidebar'
                            }`}
                        >
                            {/* Checkmark badge */}
                            <span
                                className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-white transition-all duration-200 ${
                                    isSelected
                                        ? 'opacity-100 scale-100'
                                        : 'opacity-0 scale-50'
                                }`}
                            >
                                <Check size={11} strokeWidth={3} />
                            </span>

                            {/* Flag */}
                            <span
                                className={`text-[34px] leading-none transition-transform duration-200 ${
                                    isSelected
                                        ? 'scale-105'
                                        : 'group-hover:scale-105'
                                }`}
                            >
                                {language.flag}
                            </span>

                            {/* Name */}
                            <span
                                className={`text-sm font-semibold transition-colors duration-200 ${
                                    isSelected
                                        ? 'text-text-primary'
                                        : 'text-text-secondary group-hover:text-text-primary'
                                }`}
                            >
                                {language.name}
                            </span>

                            {/* Sub-label */}
                            <span className="text-[11px] text-text-tertiary">
                                {language.nativeName}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default LanguageSection;
