import React from 'react';

const AuthLayout = ({ children }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-main text-text-primary py-4">
            <div className="w-[420px] mx-4 p-12 bg-bg-sidebar border border-border-subtle rounded-2xl text-center animate-[fadeIn_0.6s_ease-out]">
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
