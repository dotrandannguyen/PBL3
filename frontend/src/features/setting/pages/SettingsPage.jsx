import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SettingsSidebar from '../components/SettingsSidebar';
import SettingsContent from '../components/SettingsContent';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(
    searchParams.get('section') || 'profile'
  );

  // Shared ref that SettingsContent populates with { scrollToSection }
  const contentScrollRef = useRef(null);

  // Handle ?section= from URL (e.g. navigated here from UserMenu)
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      // Small delay so SettingsContent has mounted and populated scrollRef
      const timer = setTimeout(() => {
        contentScrollRef.current?.scrollToSection(section);
      }, 150);
      setSearchParams({}, { replace: true });
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavClick = (id) => {
    contentScrollRef.current?.scrollToSection(id);
  };

  return (
    <div className="flex flex-col h-full bg-bg-main text-text-primary">
      {/* Header */}
      <div className="flex items-center h-[45px] px-4 border-b border-border-subtle bg-bg-sidebar shadow-sm z-10 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 mr-3 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-medium">Settings</h1>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[220px] flex-shrink-0 border-r border-border-subtle bg-bg-main overflow-y-auto">
          <SettingsSidebar
            activeSection={activeSection}
            onNavClick={handleNavClick}
          />
        </div>

        {/* Content */}
        <div className="flex-1 bg-bg-main overflow-hidden">
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
