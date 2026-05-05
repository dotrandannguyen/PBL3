import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const AccountModalContext = createContext(null);

export const AccountModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <AccountModalContext.Provider value={value}>
      {children}
    </AccountModalContext.Provider>
  );
};

export const useAccountModal = () => {
  const ctx = useContext(AccountModalContext);
  if (!ctx) {
    throw new Error("useAccountModal must be used within AccountModalProvider");
  }
  return ctx;
};
