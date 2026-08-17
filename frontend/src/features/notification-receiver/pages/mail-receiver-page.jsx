import React, { useEffect, useState } from "react";
import { useIntegrations } from "../hooks/useIntegrations";
import useInboxSocket from "../hooks/useInboxSocket";
import useAuth from "../../auth/hooks/useAuth";
import {
  getGoogleLinkUrl,
  getGithubLinkUrl,
  getSlackLinkUrl,
} from "../../auth/api/auth.api";
import { toast } from "sonner";
import {
  InboxHeader,
  ConnectionAlert,
  RecentItemsSection,
  InboxTabsContainer,
  ItemDetailModal,
} from "../components";
import SettingsPanel from "@/features/workspace/panels/settings";

const buildInboxToastId = (payload) => {
  const taskId = payload?.task?.id || payload?.task?.taskId || null;
  const sourceKey =
    payload?.task?.sourceId ||
    payload?.task?.sourceLink ||
    payload?.task?.title ||
    payload?.message ||
    "unknown";
  return `inbox-new-item:${taskId || sourceKey}`;
};

export function MailReceiverPage() {
  const { user } = useAuth();
  const { data, setData, loading, error, connected, refetch } =
    useIntegrations();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("integrationLinkToast");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      if (payload?.type === "success") {
        toast.success(payload.message || "Lien ket thanh cong.");
      } else if (payload?.type === "error") {
        toast.error(payload.message || "Lien ket that bai.");
      }
    } catch {
      toast.error("Lien ket that bai.");
    } finally {
      sessionStorage.removeItem("integrationLinkToast");
    }
  }, []);

  /**
   * Xử lý khi click "Thêm vào Task" thành công
   * Cập nhật UI ngay lập tức:
   * 1. Update danh sách data ở ngoài (set isConverted = true)
   * 2. Update data trong Modal (nếu modal đang mở) để modal sync
   */
  const handleStatusChange = (taskId, newStatus) => {
    // 1. Cập nhật list data ở main page
    if (setData) {
      setData((prevData) =>
        prevData.map((item) =>
          item.id === taskId
            ? { ...item, status: newStatus, isConverted: true }
            : item,
        ),
      );
    }

    // 2. Cập nhật luôn data trong Modal (nếu modal đang mở)
    if (selectedItem && selectedItem.id === taskId) {
      setSelectedItem({
        ...selectedItem,
        status: newStatus,
        isConverted: true,
      });
    }
  };

  // Setup real-time socket listener: Khi có inbox item mới -> refetch tự động
  useInboxSocket(user?.id, (newItemData) => {
    console.log("Có tin nhắn mới! Đang refetch inbox...", newItemData);

    // Gọi refetch để cập nhật danh sách inbox
    refetch();

    // Hiển thị toast notification (non-intrusive)
    const toastId = buildInboxToastId(newItemData);
    toast.success(newItemData.message || "Bạn có tin nhắn mới! ", {
      id: toastId,
      position: "bottom-right",
      duration: 4000,
      description: newItemData.task?.title || "Inbox updated with new item",
    });
  });

  // Lấy 5 tin nhắn mới nhất để hiển thị trên phần "Truy cập nhanh"
  const recentItems = data.slice(0, 5);

  const handleConnectGoogle = async () => {
    try {
      const res = await getGoogleLinkUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Google Auth URL");
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await getGithubLinkUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Github Auth URL");
    }
  };

  const handleConnectSlack = async () => {
    try {
      const res = await getSlackLinkUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Slack Auth URL");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main text-text-primary overflow-y-auto">
      <div className="flex-1 px-8 py-8 max-w-5xl w-full mx-auto flex flex-col">
        {/* HEADER */}
        <InboxHeader
          user={user}
          onRefresh={refetch}
          isLoading={loading}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* CONNECTION ALERT */}
        <ConnectionAlert
          connected={connected}
          onConnectGoogle={handleConnectGoogle}
          onConnectGithub={handleConnectGithub}
          onConnectSlack={handleConnectSlack}
        />

        {/* RECENT ITEMS SECTION */}
        {!loading && (
          <RecentItemsSection
            items={recentItems}
            onItemClick={setSelectedItem}
          />
        )}

        {/* INBOX CONTAINER */}
        <InboxTabsContainer
          data={data}
          filter={filter}
          onFilterChange={setFilter}
          isLoading={loading}
          error={error}
          onItemClick={setSelectedItem}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* MODAL CHI TIẾT */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onStatusChange={handleStatusChange}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
