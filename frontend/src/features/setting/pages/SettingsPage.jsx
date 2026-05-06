import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SettingsSidebar from '../components/SettingsSidebar';
import SettingsContent from '../components/SettingsContent';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAccountModal } from '../contexts/AccountModalContext';

const VALID_SECTIONS = new Set(['general', 'integrations', 'notifications', 'language']);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { open: openAccountModal } = useAccountModal();
  const initialSection = searchParams.get('section');
  const [activeSection, setActiveSection] = useState(
    VALID_SECTIONS.has(initialSection) ? initialSection : 'general'
  );

  const contentScrollRef = useRef(null);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    // Legacy: ?section=profile → open modal instead
    if (section === 'profile') {
      openAccountModal();
      setSearchParams({}, { replace: true });
      return;
    }
    if (VALID_SECTIONS.has(section)) {
      const timer = setTimeout(() => {
        contentScrollRef.current?.scrollToSection(section);
      }, 150);
      setSearchParams({}, { replace: true });
      return () => clearTimeout(timer);
    }
    setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavClick = (id) => {
    contentScrollRef.current?.scrollToSection(id);
  };

  return (
    <div className="flex h-full flex-col bg-bg-main text-text-primary">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-main/80 px-4 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-all duration-150 hover:bg-white/5 hover:text-text-primary active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="h-4 w-px bg-border-subtle" />
        <h1 className="text-[13px] font-medium text-text-primary">
          {t('sidebar.settings') || 'Settings'}
        </h1>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[240px] shrink-0 overflow-y-auto border-r border-border-subtle bg-bg-main">
          <SettingsSidebar
            activeSection={activeSection}
            onNavClick={handleNavClick}
          />
        </aside>

        <div className="flex-1 overflow-hidden bg-bg-main">
          <SettingsContent
            onSectionChange={setActiveSection}
            scrollRef={contentScrollRef}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
