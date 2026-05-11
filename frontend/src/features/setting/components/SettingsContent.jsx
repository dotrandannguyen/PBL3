import React, { useRef, useEffect, useCallback } from 'react';
import GeneralSection from './sections/GeneralSection';
import IntegrationsSection from './sections/IntegrationsSection';
import LanguageSection from './sections/LanguageSection';

const SECTION_IDS = ['general', 'integrations', 'language'];

/**
 * SettingsContent — scrollable container with scroll-spy + programmatic scroll.
 */
const SettingsContent = ({ onSectionChange, scrollRef }) => {
    const containerRef = useRef(null);
    const sectionsRef = useRef([]);
    const isProgrammaticRef = useRef(false);
    const pauseTimerRef = useRef(null);

    // ── Scroll-spy ────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            if (isProgrammaticRef.current) return;
            const container = containerRef.current;
            if (!container) return;

            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;

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
            handleScroll();
        }
        return () => {
            if (container) container.removeEventListener('scroll', handleScroll);
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        };
    }, [onSectionChange]);

    // ── Programmatic scroll ───────────────────────────────────
    const scrollToSection = useCallback((id) => {
        const container = containerRef.current;
        const idx = SECTION_IDS.indexOf(id);
        const el = sectionsRef.current[idx];
        if (!container || !el) return;

        isProgrammaticRef.current = true;
        onSectionChange(id);

        const targetTop = el.offsetTop - 24;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
            isProgrammaticRef.current = false;
        }, 700);
    }, [onSectionChange]);

    useEffect(() => {
        if (scrollRef) scrollRef.current = { scrollToSection };
    }, [scrollRef, scrollToSection]);

    // ── Render ─────────────────────────────────────────────────
    return (
        <div ref={containerRef} className="relative h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-[760px] px-8 pt-12 pb-32 lg:px-12">
                <div
                    id="section-general"
                    ref={(el) => (sectionsRef.current[0] = el)}
                >
                    <GeneralSection />
                </div>

                <SectionDivider />

                <div
                    id="section-integrations"
                    ref={(el) => (sectionsRef.current[1] = el)}
                >
                    <IntegrationsSection />
                </div>

                <SectionDivider />

                <div
                    id="section-language"
                    ref={(el) => (sectionsRef.current[2] = el)}
                >
                    <LanguageSection />
                </div>
            </div>
        </div>
    );
};

const SectionDivider = () => (
    <div className="my-12 h-px w-full bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
);

export default SettingsContent;
