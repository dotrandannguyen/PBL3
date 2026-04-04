import React from "react";

const UserAvatar = ({ initial, className = "" }) => (
  <div
    className={`w-5 h-5 rounded-sm bg-bg-active text-text-secondary text-xs font-medium flex items-center justify-center ${className}`}
  >
    {initial}
  </div>
);

export default UserAvatar;
