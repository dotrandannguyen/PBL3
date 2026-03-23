import { RefreshCw } from "lucide-react";

/**
 * @component InboxHeader
 * Header với tên user và nút refresh
 * @param {Object} user - Thông tin user { name, fullName }
 * @param {Function} onRefresh - Callback khi click nút refresh
 * @param {boolean} isLoading - Trạng thái loading
 */
export function InboxHeader({ user, onRefresh, isLoading }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1">
          Chào buổi tối, {user?.name || user?.fullName || "bạn"}
        </h1>
        <p className="text-sm text-text-tertiary">
          Nơi tập trung các thông báo và công việc từ bên ngoài.
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="p-2.5 rounded-full hover:bg-bg-hover text-text-tertiary transition-colors flex items-center justify-center disabled:opacity-50"
        title="Làm mới hộp thư"
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
