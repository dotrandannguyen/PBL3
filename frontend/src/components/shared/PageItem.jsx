import React from "react";
import { Pencil, Trash2 } from "lucide-react";

const PageItem = ({ page, onClick, isActive, onDelete, onRename }) => {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameVal, setRenameVal] = React.useState(page.label);

  const handleSaveRename = (e) => {
    e.stopPropagation();
    if (onRename && renameVal.trim() !== page.label) {
      onRename(page.id, renameVal);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveRename(e);
    if (e.key === "Escape") {
      setRenameVal(page.label);
      setIsRenaming(false);
    }
  };

  return (
    <button
      type="button"
      className={`w-full flex items-center gap-2.5 px-3.5 py-1.5 bg-transparent border-0 text-sm font-medium text-left cursor-pointer transition-all ${
        isActive
          ? "bg-white/5 text-text-primary"
          : "text-text-secondary hover:bg-white/3 hover:text-text-primary"
      }`}
      onClick={() => onClick(page.id)}
    >
      <span className="text-sm">{page.icon}</span>

      {isRenaming ? (
        <input
          autoFocus
          className="flex-1 bg-transparent border-none px-1 py-0.5 text-text-primary text-sm outline-none"
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="flex-1">{page.label}</span>
          <div
            className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onRename && (
              <div
                className="p-1 rounded cursor-pointer text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
                title="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <Pencil size={12} />
              </div>
            )}
            {onDelete && (
              <div
                className="p-1 rounded cursor-pointer text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(page.id);
                }}
              >
                <Trash2 size={12} />
              </div>
            )}
          </div>
        </>
      )}
    </button>
  );
};

export default PageItem;
