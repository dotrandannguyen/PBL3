import React from "react";
import AuthBackground from "./AuthBackground";

const AuthLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen text-text-primary overflow-hidden">
      <AuthBackground />
      <div className="relative flex min-h-screen items-center justify-center py-8 px-4">
        <div className="w-full max-w-[420px] p-12 bg-bg-sidebar/70 backdrop-blur-xl border border-border-subtle rounded-2xl text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] animate-[fadeIn_0.6s_ease-out]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
