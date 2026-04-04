import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SettingsSidebar from '../components/SettingsSidebar';
import SettingsContent from '../components/SettingsContent';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="flex flex-col h-full bg-bg-main text-text-primary">
      {/* Header */}
      <div className="flex items-center h-[var(--spacing-topbar, 45px)] px-4 border-b border-border-subtle bg-bg-sidebar shadow-sm z-10">
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
        <div className="w-[280px] flex-shrink-0 border-r border-border-subtle bg-bg-main overflow-y-auto">
          <SettingsSidebar activeSection={activeSection} onNavClick={setActiveSection} />
        </div>

        {/* Content Box */}
        <div className="flex-1 bg-bg-main overflow-hidden">
          <SettingsContent onSectionChange={setActiveSection} activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
