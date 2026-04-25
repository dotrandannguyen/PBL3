import { RefreshCw } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";

/**
 * @component InboxHeader
 * Header với tên user và nút refresh
 * @param {Object} user - Thông tin user { name, fullName }
 * @param {Function} onRefresh - Callback khi click nút refresh
 * @param {boolean} isLoading - Trạng thái loading
 */
export function InboxHeader({ user, onRefresh, isLoading }) {
  const { t } = useLanguage();

  // Time-of-day greeting
  const getGreetingKey = () => {
    const h = new Date().getHours();
    if (h < 12) return 'inbox.greeting.morning';
    if (h < 18) return 'inbox.greeting.afternoon';
    return 'inbox.greeting.evening';
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1">
          {t(getGreetingKey())}, {user?.name || user?.fullName || t('inbox.greeting.fallback')}
        </h1>
        <p className="text-sm text-text-tertiary">
          {t('inbox.subtitle')}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="p-2.5 rounded-full hover:bg-bg-hover text-text-tertiary transition-colors flex items-center justify-center disabled:opacity-50"
        title={t('inbox.refresh')}
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
