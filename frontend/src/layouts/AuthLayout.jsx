import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary overflow-y-auto">
      {/* Subtle gradient orb for depth — startup style */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(79,70,229,0.06), transparent)",
        }}
      />
      <div className="relative z-10 flex justify-center items-center min-h-screen py-12 px-4">
        <div
          className="w-full max-w-[420px] p-10 bg-bg-sidebar border border-border-subtle rounded-2xl text-center animate-[fadeIn_0.5s_ease-out]"
          style={{
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.04)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
