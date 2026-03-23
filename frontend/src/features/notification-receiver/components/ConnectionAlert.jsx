import { AlertCircle } from "lucide-react";

/**
 * @component ConnectionAlert
 * Alert cảnh báo kết nối Gmail/GitHub
 * @param {Object} connected - { gmail: boolean, github: boolean }
 * @param {Function} onConnectGoogle - Callback khi click "Kết nối Google"
 * @param {Function} onConnectGithub - Callback khi click "Kết nối GitHub"
 */
export function ConnectionAlert({
  connected,
  onConnectGoogle,
  onConnectGithub,
}) {
  // Chỉ hiển thị nếu không kết nối Gmail và GitHub
  if (connected.gmail && connected.github) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-8">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-500" />
        <span className="text-sm font-medium text-text-primary">
          Hãy kết nối Gmail hoặc GitHub để bắt đầu nhận tin nhắn.
        </span>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!connected.gmail && (
          <button
            onClick={onConnectGoogle}
            className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Kết nối Google
          </button>
        )}
        {!connected.github && (
          <button
            onClick={onConnectGithub}
            className="px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Kết nối GitHub
          </button>
        )}
      </div>
    </div>
  );
}
