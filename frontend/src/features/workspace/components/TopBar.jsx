import React from "react";
import { Star, MoreHorizontal } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";

// ============================================
// SMALL COMPONENTS
// ============================================

/** Icon Button - Nút với icon */
const IconButton = ({ icon: Icon, label, className = "" }) => (
  <button
    type="button"
    className={`p-1 rounded hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors ${className}`}
    aria-label={label}
  >
    <Icon size={16} />
  </button>
);

// ============================================
// MAIN COMPONENT
// ============================================

const TopBar = ({ title, icon, isPrivate = true, editedDate = "Jan 10" }) => {
  const { t } = useLanguage();

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle text-sm">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-text-secondary">
        <span className="text-sm">{icon}</span>
        <span className="font-medium">{title}</span>
      </nav>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-tertiary">{t('topbar.edited')} {editedDate}</span>
        <button
          type="button"
          className="px-2 py-1 rounded hover:bg-white/5 text-text-primary text-xs cursor-pointer transition-colors"
        >
          {t('topbar.share')}
        </button>
        <IconButton icon={Star} label="Add to favorites" className="star-btn" />
        <IconButton
          icon={MoreHorizontal}
          label="More options"
          className="more-btn"
        />
      </div>
    </header>
  );
};

export default TopBar;
