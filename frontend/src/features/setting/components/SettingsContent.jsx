import React, { useRef, useEffect } from 'react';
import ProfileSection from './sections/ProfileSection';
import GeneralSection from './sections/GeneralSection';
import IntegrationsSection from './sections/IntegrationsSection';

const SECTION_IDS = ['profile', 'general', 'integrations', 'notifications'];

const SettingsContent = ({ onSectionChange }) => {
    const containerRef = useRef(null);
    const sectionsRef = useRef([]);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            
            const containerTop = containerRef.current.scrollTop;
            let currentActive = SECTION_IDS[0];
            
            for (let i = 0; i < sectionsRef.current.length; i++) {
                const section = sectionsRef.current[i];
                // Offset of 150px to trigger earlier when scrolling down
                if (section && section.offsetTop <= containerTop + 150) {
                    currentActive = SECTION_IDS[i];
                }
            }
            onSectionChange(currentActive);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            // Trigger once on mount
            handleScroll();
        }
        return () => {
            if (container) container.removeEventListener('scroll', handleScroll);
        };
    }, [onSectionChange]);

    return (
        <div ref={containerRef} className="h-full overflow-y-auto px-12 py-10 relative scroll-smooth">
            <div className="max-w-[720px] mx-auto space-y-16 pb-64">
                
                <div id="section-profile" ref={el => sectionsRef.current[0] = el}>
                    <ProfileSection />
                </div>
                
                <div id="section-general" ref={el => sectionsRef.current[1] = el} className="pt-10 border-t border-border-subtle">
                    <GeneralSection />
                </div>
                
                <div id="section-integrations" ref={el => sectionsRef.current[2] = el} className="pt-10 border-t border-border-subtle">
                    <IntegrationsSection />
                </div>
                
                <div id="section-notifications" ref={el => sectionsRef.current[3] = el} className="pt-10 border-t border-border-subtle">
                    <h2 className="text-xl font-medium text-text-primary mb-6">Notifications</h2>
                    <p className="text-sm text-text-secondary">Notification preferences coming soon.</p>
                </div>

            </div>
        </div>
    );
};

export default SettingsContent;
