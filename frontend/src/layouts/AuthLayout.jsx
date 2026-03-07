import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary overflow-y-auto">
      <div className="flex justify-center py-8 px-4">
        <div className="w-full max-w-[420px] p-12 bg-bg-sidebar border border-border-subtle rounded-2xl text-center animate-[fadeIn_0.6s_ease-out]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
