import { AlertCircle } from "lucide-react";

/**
 * @component ConnectionAlert
 * Alert cảnh báo kết nối Gmail/GitHub/Slack
 * @param {Object} connected - { gmail: boolean, github: boolean, slack: boolean }
 * @param {Function} onConnectGoogle - Callback khi click "Kết nối Google"
 * @param {Function} onConnectGithub - Callback khi click "Kết nối GitHub"
 * @param {Function} onConnectSlack - Callback khi click "Kết nối Slack"
 */
export function ConnectionAlert({
  connected,
  onConnectGoogle,
  onConnectGithub,
  onConnectSlack,
}) {
  // Chỉ hiển thị nếu thiếu kết nối Gmail/GitHub/Slack
  if (connected.gmail && connected.github && connected.slack) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-8">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-500" />
        <span className="text-sm font-medium text-text-primary">
          Hãy kết nối Gmail, GitHub hoặc Slack để bắt đầu nhận tin nhắn.
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
        {!connected.slack && (
          <button
            onClick={onConnectSlack}
            className="px-4 py-2 text-sm font-semibold bg-[#4A154B] hover:bg-[#3b103b] text-white rounded-md transition-colors"
          >
            Kết nối Slack
          </button>
        )}
      </div>
    </div>
  );
}
