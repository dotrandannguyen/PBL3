import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Settings,
  Github,
  RefreshCw,
  ExternalLink,
  CloudRain,
} from "lucide-react";
import { toast } from "sonner";
import { integrationAPI } from "@/features/notification-receiver/api/integration.api";
import {
  getGithubAuthUrl,
  getSlackAuthUrl,
} from "@/features/auth/api/auth.api";

const SettingsPanel = ({ isOpen, onClose }) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [githubConnected, setGithubConnected] = useState(true);
  const [updatingRepoIds, setUpdatingRepoIds] = useState(new Set());

  const totalEnabled = useMemo(
    () => repos.filter((repo) => repo.webhookEnabled).length,
    [repos],
  );

  const fetchRepositories = useCallback(async () => {
    if (!isOpen) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await integrationAPI.getGithubRepositories();
      const repoList = response?.data?.data || [];
      setRepos(Array.isArray(repoList) ? repoList : []);
      setGithubConnected(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setGithubConnected(false);
        setRepos([]);
        setError("Bạn chưa kết nối GitHub.");
      } else {
        setError("Không thể tải danh sách repositories.");
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleConnectGithub = async () => {
    try {
      const res = await getGithubAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      toast.error("Không thể mở đăng nhập GitHub.");
    }
  };

  const handleConnectSlack = async () => {
    try {
      const res = await getSlackAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      toast.error("Không thể mở đăng nhập Slack.");
    }
  };

  const updateRepoState = (repoId, nextEnabled) => {
    setRepos((prev) =>
      prev.map((repo) =>
        repo.id === repoId ? { ...repo, webhookEnabled: nextEnabled } : repo,
      ),
    );
  };

  const handleToggleWebhook = async (repo) => {
    const repoId = repo.id;
    setUpdatingRepoIds((prev) => new Set(prev).add(repoId));

    try {
      if (repo.webhookEnabled) {
        await integrationAPI.disableGithubWebhook(repoId);
        updateRepoState(repoId, false);
        toast.success("Đã tắt webhook cho repo.");
      } else {
        const result = await integrationAPI.setupGithubWebhooks([repoId]);
        const failureCount = result?.data?.failureCount || 0;
        if (failureCount > 0) {
          toast.error("Bật webhook thất bại cho repo.");
        } else {
          updateRepoState(repoId, true);
          toast.success("Đã bật webhook cho repo.");
        }
      }
    } catch (err) {
      toast.error("Không thể cập nhật webhook.");
    } finally {
      setUpdatingRepoIds((prev) => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-screen w-[26rem] bg-bg-sidebar border-l border-border-subtle flex flex-col z-40 transition-transform duration-300 overflow-hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-4 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Settings size={16} />
            Cài đặt Notion Mail
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchRepositories}
              disabled={loading}
              className="p-1 rounded hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <section className="space-y-3 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CloudRain size={16} />
                Slack
              </div>
            </div>

            <div className="rounded-md border border-border-subtle bg-white/5 p-3 text-xs text-text-tertiary">
              <p className="mb-2">Kết nối Slack để lấy tin nhắn mới nhất.</p>
              <button
                type="button"
                onClick={handleConnectSlack}
                className="rounded-md bg-[#4A154B] px-3 py-1.5 text-xs font-medium text-white"
              >
                Kết nối Slack
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Github size={16} />
                GitHub Webhooks
              </div>
              <span className="text-xs text-text-tertiary">
                {totalEnabled} repo đang bật
              </span>
            </div>

            {!githubConnected && (
              <div className="rounded-md border border-border-subtle bg-white/5 p-3 text-xs text-text-tertiary">
                <p className="mb-2">Chưa kết nối GitHub.</p>
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white"
                >
                  Kết nối GitHub
                </button>
              </div>
            )}

            {githubConnected && error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {githubConnected && loading && repos.length === 0 && (
              <div className="flex items-center justify-center py-10 text-text-tertiary">
                <RefreshCw size={20} className="animate-spin" />
              </div>
            )}

            {githubConnected && !loading && repos.length === 0 && !error && (
              <div className="rounded-md border border-border-subtle bg-white/5 p-3 text-xs text-text-tertiary">
                Không tìm thấy repository.
              </div>
            )}

            {githubConnected && repos.length > 0 && (
              <div className="space-y-2">
                {repos.map((repo) => {
                  const isUpdating = updatingRepoIds.has(repo.id);
                  return (
                    <div
                      key={repo.id}
                      className="rounded-md border border-border-subtle bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {repo.fullName}
                            </span>
                            {repo.private && (
                              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-text-tertiary">
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="mt-1 text-xs text-text-tertiary line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          {repo.url && (
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary"
                            >
                              Mở repo <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleWebhook(repo)}
                          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            repo.webhookEnabled
                              ? "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                              : "bg-white/10 text-text-secondary hover:bg-white/20"
                          } ${isUpdating ? "opacity-60" : ""}`}
                        >
                          {repo.webhookEnabled ? "Đang bật" : "Bật webhook"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
