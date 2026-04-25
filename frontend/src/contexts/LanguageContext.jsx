/**
 * Language Context — App-wide language & translation management
 *
 * Strategy:
 *   - Reads language preference from localStorage keyed per user ID
 *   - Exposes `t(key)` translation function to all consumers
 *   - No external i18n library — lightweight flat dictionary
 *
 * Usage:
 *   const { lang, setLang, t } = useLanguage();
 *   <h1>{t('profile.title')}</h1>
 */

import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    useMemo,
} from 'react';
import { translate } from './translations';

const LanguageContext = createContext(null);

const STORAGE_KEY_PREFIX = 'lang';
const SUPPORTED_LANGS = ['vi', 'ja', 'en'];
const DEFAULT_LANG = 'vi';

const getStorageKey = (userId) =>
    userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_PREFIX;

/**
 * LanguageProvider
 * Accepts an optional `userId` prop so it can scope
 * the preference to the currently logged-in user.
 */
export function LanguageProvider({ children, userId }) {
    const [lang, setLangState] = useState(() => {
        const key = getStorageKey(userId);
        const stored = localStorage.getItem(key);
        return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
    });

    // Re-read from storage when userId changes (login / logout)
    useEffect(() => {
        const key = getStorageKey(userId);
        const stored = localStorage.getItem(key);
        setLangState(SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG);
    }, [userId]);

    const setLang = useCallback(
        (code) => {
            if (!SUPPORTED_LANGS.includes(code)) return;
            setLangState(code);
            const key = getStorageKey(userId);
            localStorage.setItem(key, code);
        },
        [userId],
    );

    /**
     * Translation function — memoised per lang so consumers
     * only re-render when the language actually changes.
     */
    const t = useMemo(
        () => (key) => translate(lang, key),
        [lang],
    );

    const value = useMemo(
        () => ({ lang, setLang, t }),
        [lang, setLang, t],
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a <LanguageProvider>');
    }
    return context;
}

export default LanguageContext;
