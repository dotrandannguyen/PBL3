import React from "react";

const AppLayout = ({ sidebar, children }) => {
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-bg-main text-text-primary font-sans">
      {sidebar}
      <main className="flex-1 flex flex-col bg-bg-main overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
