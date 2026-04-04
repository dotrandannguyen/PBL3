import React from 'react';

const ProfileSection = () => {
    return (
        <section>
            <h2 className="text-xl font-medium text-text-primary mb-8">Account & Profile</h2>
            
            <div className="flex flex-col md:flex-row gap-10">
                {/* Avatar Column */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-28 h-28 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-4xl font-semibold border border-accent-primary/30 shadow-sm relative group overflow-hidden cursor-pointer">
                        M
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-medium">Upload</span>
                        </div>
                    </div>
                </div>
                
                {/* Form Column */}
                <div className="flex-1 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Full Name</label>
                        <input 
                            type="text" 
                            defaultValue="Mock User" 
                            className="w-full max-w-md h-10 bg-bg-sidebar border border-border-subtle rounded-md px-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Email Address</label>
                        <input 
                            type="email" 
                            defaultValue="mock@example.com" 
                            disabled
                            className="w-full max-w-md h-10 bg-bg-hover border border-border-subtle rounded-md px-3 text-sm text-text-secondary cursor-not-allowed opacity-70 shadow-sm"
                        />
                        <p className="text-xs text-text-tertiary mt-1.5">Your email address cannot be changed.</p>
                    </div>

                    <div className="pt-2">
                        <button className="px-5 py-2 bg-accent-primary hover:bg-accent-hover active:scale-[0.98] text-white text-sm font-medium rounded-md transition-all shadow-sm">
                            Save changes
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfileSection;
