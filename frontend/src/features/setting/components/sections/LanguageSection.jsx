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
            <h2 className="text-xl font-medium text-text-primary mb-2">
                {t('lang.title')}
            </h2>
            <p className="text-[13px] text-text-secondary mb-8">
                {t('lang.subtitle')}
            </p>

            <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((language) => {
                    const isSelected = lang === language.code;
                    return (
                        <button
                            key={language.code}
                            type="button"
                            onClick={() => setLang(language.code)}
                            className={`
                                relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 
                                transition-all duration-200 cursor-pointer bg-transparent
                                ${
                                    isSelected
                                        ? 'border-accent-primary bg-accent-primary/5 shadow-[0_0_0_1px_rgba(35,131,226,0.3)] scale-[1.02]'
                                        : 'border-border-subtle hover:border-border-focused hover:bg-bg-hover/50'
                                }
                            `}
                        >
                            {/* Checkmark badge */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center">
                                    <Check size={12} className="text-white" strokeWidth={3} />
                                </div>
                            )}

                            {/* Flag */}
                            <span className="text-3xl leading-none">{language.flag}</span>

                            {/* Language name */}
                            <span className={`text-sm font-medium ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>
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
