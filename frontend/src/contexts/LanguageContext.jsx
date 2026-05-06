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
} from "react";
import { translate } from "./translations";
import { updateCurrentUser } from "../features/setting/api/user.api";

const LanguageContext = createContext(null);

const SUPPORTED_LANGS = ["vi", "ja", "en"];
const DEFAULT_LANG = "vi";

/**
 * LanguageProvider
 * Accepts an optional `userId` prop so it can scope
 * the preference to the currently logged-in user.
 */
export function LanguageProvider({
  children,
  userId,
  initialLang,
  onUserUpdate,
}) {
  const [lang, setLangState] = useState(() =>
    SUPPORTED_LANGS.includes(initialLang) ? initialLang : DEFAULT_LANG,
  );

  useEffect(() => {
    const resolved = SUPPORTED_LANGS.includes(initialLang)
      ? initialLang
      : DEFAULT_LANG;
    setLangState(resolved);
  }, [initialLang]);

  const setLang = useCallback(
    async (code) => {
      if (!SUPPORTED_LANGS.includes(code)) return;
      setLangState(code);

      if (!userId) {
        return;
      }

      try {
        const response = await updateCurrentUser({ language: code });
        const updated = response?.data?.data;
        if (updated && typeof onUserUpdate === "function") {
          onUserUpdate(updated);
        }
      } catch (error) {
        console.warn("Không thể lưu ngôn ngữ lên server", error);
      }
    },
    [userId, onUserUpdate],
  );

  /**
   * Translation function — memoised per lang so consumers
   * only re-render when the language actually changes.
   */
  const t = useMemo(() => (key) => translate(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a <LanguageProvider>");
  }
  return context;
}

export default LanguageContext;
