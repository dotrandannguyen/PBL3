import React from "react";
import { Users, X } from "lucide-react";

const InvitePanel = ({ onClose }) => (
  <div className="fixed bottom-4 left-4 w-80 bg-bg-sidebar border border-border-subtle rounded-lg shadow-lg p-4 z-50">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Users size={16} />
        <span>Invite members</span>
      </div>
      <button
        type="button"
        className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors"
        onClick={onClose}
      >
        <X size={14} />
      </button>
    </div>
    <p className="text-xs text-text-tertiary">Collaborate with your team.</p>
  </div>
);

export default InvitePanel;
