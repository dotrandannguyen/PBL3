import React from 'react';

const GeneralSection = () => {
    return (
        <section>
            <h2 className="text-xl font-medium text-text-primary mb-8">General</h2>
            <div className="max-w-2xl space-y-8">
                
                {/* Theme Setting */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">Theme</h3>
                        <p className="text-[13px] text-text-secondary mt-1">Choose your preferred visual mode.</p>
                    </div>
                    <select className="h-9 w-40 bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer">
                        <option>App Default</option>
                        <option>Dark Mode</option>
                        <option>Light Mode</option>
                    </select>
                </div>

                {/* Date/Time Format */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">Date & Time format</h3>
                        <p className="text-[13px] text-text-secondary mt-1">How dates and times are displayed.</p>
                    </div>
                    <select className="h-9 w-40 bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer">
                        <option>24-hour (14:30)</option>
                        <option>12-hour (2:30 PM)</option>
                    </select>
                </div>

                {/* Timezone */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-text-primary">Time zone</h3>
                        <p className="text-[13px] text-text-secondary mt-1">Used for notifications and events.</p>
                    </div>
                    <select className="h-9 w-[260px] bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary shadow-sm hover:border-border-focused transition-colors cursor-pointer">
                        <option defaultValue>(GMT+07:00) Indochina Time - Ho Chi Minh</option>
                        <option>(GMT+00:00) Universal Coordinated Time</option>
                        <option>(GMT-08:00) Pacific Time - Los Angeles</option>
                    </select>
                </div>

            </div>
        </section>
    );
};

export default GeneralSection;
