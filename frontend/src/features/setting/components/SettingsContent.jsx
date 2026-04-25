import React, { useRef, useEffect, useCallback } from 'react';
import ProfileSection from './sections/ProfileSection';
import GeneralSection from './sections/GeneralSection';
import IntegrationsSection from './sections/IntegrationsSection';
import NotificationsSection from './sections/NotificationsSection';
import LanguageSection from './sections/LanguageSection';

const SECTION_IDS = ['profile', 'general', 'integrations', 'notifications', 'language'];

/**
 * SettingsContent
 *
 * Exposes scrollToSection() via ref so SettingsSidebar can trigger
 * programmatic scrolls without fighting the scroll-spy.
 *
 * Props:
 *   onSectionChange(id) – called by scroll-spy to keep sidebar highlight in sync
 *   scrollRef           – receives { scrollToSection } so the parent / sidebar can drive scrolls
 */
const SettingsContent = ({ onSectionChange, scrollRef }) => {
    const containerRef = useRef(null);
    const sectionsRef  = useRef([]);
    // When true the scroll-spy is paused so a click-driven scroll isn't
    // immediately overridden by the in-flight scroll events.
    const isProgrammaticRef = useRef(false);
    const pauseTimerRef     = useRef(null);

    // ── Scroll-spy ──────────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            // Ignore events that are part of a click-triggered smooth-scroll
            if (isProgrammaticRef.current) return;

            const container = containerRef.current;
            if (!container) return;

            const scrollTop    = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;

            // If we're within 10px of the very bottom → always highlight the last section
            const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
            if (atBottom) {
                onSectionChange(SECTION_IDS[SECTION_IDS.length - 1]);
                return;
            }

            let active = SECTION_IDS[0];
            for (let i = 0; i < sectionsRef.current.length; i++) {
                const el = sectionsRef.current[i];
                if (el && el.offsetTop <= scrollTop + 120) {
                    active = SECTION_IDS[i];
                }
            }
            onSectionChange(active);
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll(); // run once on mount
        }
        return () => {
            if (container) container.removeEventListener('scroll', handleScroll);
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        };
    }, [onSectionChange]);

    // ── Programmatic scroll (used by sidebar clicks) ─────────────────────
    const scrollToSection = useCallback((id) => {
        const container = containerRef.current;
        const idx = SECTION_IDS.indexOf(id);
        const el  = sectionsRef.current[idx];
        if (!container || !el) return;

        // Pause the scroll-spy immediately, update the highlight manually
        isProgrammaticRef.current = true;
        onSectionChange(id);

        // Scroll the container (not the window) with smooth behavior
        const targetTop = el.offsetTop - 32; // 32px breathing room at the top
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

        // Re-enable scroll-spy after the smooth-scroll animation finishes (~700ms)
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
            isProgrammaticRef.current = false;
        }, 700);
    }, [onSectionChange]);

    // Expose scrollToSection to the parent via scrollRef
    useEffect(() => {
        if (scrollRef) scrollRef.current = { scrollToSection };
    }, [scrollRef, scrollToSection]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div ref={containerRef} className="h-full overflow-y-auto px-12 py-10 relative">
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
                    <NotificationsSection />
                </div>

                <div id="section-language" ref={el => sectionsRef.current[4] = el} className="pt-10 border-t border-border-subtle">
                    <LanguageSection />
                </div>

            </div>
        </div>
    );
};

export default SettingsContent;
