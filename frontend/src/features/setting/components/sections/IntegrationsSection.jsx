import React from 'react';
import { Github, Calendar as CalendarIcon, Mail } from 'lucide-react';

const IntegrationsSection = () => {
    return (
        <section>
            <h2 className="text-xl font-medium text-text-primary mb-8">Integrations</h2>
            <p className="text-[13px] text-text-secondary mb-8">Connect external services to seamlessly sync data across your workspace.</p>

            <div className="space-y-4 max-w-2xl">
                {/* Google Calendar Card */}
                <div className="p-5 rounded-lg border border-border-subtle bg-bg-sidebar flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-border-focused transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-[10px] bg-white flex items-center justify-center shadow-sm shrink-0">
                            <CalendarIcon size={24} className="text-[#4285F4]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">Google Calendar</h3>
                            <p className="text-[13px] text-text-secondary mt-0.5">Two-way sync for your events.</p>
                            <span className="inline-block mt-2.5 px-2 py-0.5 text-[11px] font-medium bg-green-500/10 text-green-500 rounded border border-green-500/20">
                                Connected as mock@example.com
                            </span>
                        </div>
                    </div>
                    <button className="px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-all border border-transparent hover:border-red-400/20 active:scale-[0.98]">
                        Disconnect
                    </button>
                </div>

                {/* GitHub Card */}
                <div className="p-5 rounded-lg border border-border-subtle bg-bg-sidebar flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-border-focused transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-[10px] bg-[#24292e] flex items-center justify-center shadow-sm shrink-0">
                            <Github size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">GitHub</h3>
                            <p className="text-[13px] text-text-secondary mt-0.5">Manage issues and pull requests.</p>
                        </div>
                    </div>
                    <button className="px-4 py-1.5 text-xs font-semibold text-text-primary bg-bg-main hover:bg-bg-hover rounded-md transition-all border border-border-subtle shadow-sm active:scale-[0.98]">
                        Connect
                    </button>
                </div>
                
                {/* Gmail Card */}
                <div className="p-5 rounded-lg border border-border-subtle bg-bg-sidebar flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-border-focused transition-colors">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-[10px] bg-white flex items-center justify-center shadow-sm shrink-0">
                            <Mail size={24} className="text-[#EA4335]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-text-primary">Gmail</h3>
                            <p className="text-[13px] text-text-secondary mt-0.5">Turn emails into actionable tasks.</p>
                        </div>
                    </div>
                    <button className="px-4 py-1.5 text-xs font-semibold text-text-primary bg-bg-main hover:bg-bg-hover rounded-md transition-all border border-border-subtle shadow-sm active:scale-[0.98]">
                        Connect
                    </button>
                </div>

            </div>
        </section>
    );
};

export default IntegrationsSection;
