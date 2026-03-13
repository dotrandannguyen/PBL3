import React from "react";
import { Plus } from "lucide-react";

const SectionHeader = ({ title, onAdd }) => (
  <div className="flex items-center justify-between px-3.5 py-1.5 text-xs font-semibold text-text-tertiary hover:text-text-secondary select-none transition-colors group">
    <span>{title}</span>
    {onAdd && (
      <button
        type="button"
        className="opacity-0 p-0.5 rounded text-inherit cursor-pointer bg-transparent border-0 transition-all flex items-center justify-center group-hover:opacity-100 hover:bg-white/5"
        onClick={onAdd}
        title={`Add new ${title.toLowerCase()}`}
      >
        <Plus size={14} />
      </button>
    )}
  </div>
);

export default SectionHeader;
