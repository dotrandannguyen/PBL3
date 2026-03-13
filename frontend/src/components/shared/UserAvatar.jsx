import React from "react";

const UserAvatar = ({ initial, className = "" }) => (
  <div
    className={`w-5 h-5 rounded-sm bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center justify-center ${className}`}
  >
    {initial}
  </div>
);

export default UserAvatar;
