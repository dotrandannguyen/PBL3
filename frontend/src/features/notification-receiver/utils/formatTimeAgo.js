// Format date relative (e.g 1h ago, 2d ago) or localized
export const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ`;

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  });
};
