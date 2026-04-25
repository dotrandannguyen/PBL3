import React from "react";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";
import { UserAvatar } from "../../../../components/shared";
import useUserMenu from "./useUserMenu";
import useAuth from "../../../auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const UserMenu = () => {
  const { user, logout } = useAuth();
  const { open, setOpen, menuRef } = useUserMenu();
  const navigate = useNavigate();

  const initial =
    user?.fullName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";
  const displayName = user?.fullName || user?.email || "User";

  const handleProfileClick = () => {
    setOpen(false);
    navigate("/settings?section=profile");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="w-full flex items-center px-3.5 py-3 cursor-pointer border-0 bg-transparent hover:bg-white/3 transition-colors text-left mb-1 gap-2"
        onClick={() => setOpen(!open)}
      >
        <UserAvatar initial={initial} />
        <span className="flex-1 overflow-hidden text-ellipsis font-medium text-text-primary">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-bg-sidebar border border-border-subtle rounded-md shadow-lg z-50">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border-subtle">
            <UserAvatar initial={initial} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary truncate">
                {displayName}
              </div>
              <div className="text-xs text-text-tertiary truncate">
                {user?.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-white/3 text-sm transition-colors border-0 bg-transparent cursor-pointer"
            onClick={handleProfileClick}
          >
            <User size={14} />
            <span>Hồ sơ & Tài khoản</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:bg-white/3 text-sm transition-colors border-0 bg-transparent cursor-pointer"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <Settings size={14} />
            <span>Cài đặt</span>
          </button>

          <div className="border-t border-border-subtle mt-1">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 text-sm transition-colors border-0 bg-transparent cursor-pointer"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;


