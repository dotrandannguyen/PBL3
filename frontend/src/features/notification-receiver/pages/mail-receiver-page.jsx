import React, { useState } from "react";
import { useIntegrations } from "../hooks/useIntegrations";
import useInboxSocket from "../hooks/useInboxSocket";
import useAuth from "../../auth/hooks/useAuth";
import { getGoogleAuthUrl, getGithubAuthUrl } from "../../auth/api/auth.api";
import { toast } from "sonner";
import {
  InboxHeader,
  ConnectionAlert,
  RecentItemsSection,
  InboxTabsContainer,
  ItemDetailModal,
} from "../components";

export function MailReceiverPage() {
  const { user } = useAuth();
  const { data, setData, loading, error, connected, refetch } =
    useIntegrations();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  /**
   * 👉 Xử lý khi click "Thêm vào Task" thành công
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

  // ✅ Setup real-time socket listener: Khi có inbox item mới -> refetch tự động
  useInboxSocket(user?.id, (newItemData) => {
    console.log("📥 Có tin nhắn mới! Đang refetch inbox...", newItemData);

    // Gọi refetch để cập nhật danh sách inbox
    refetch();

    // Hiển thị toast notification (non-intrusive)
    toast.success(newItemData.message || "Bạn có tin nhắn mới! 📬", {
      position: "bottom-right",
      duration: 4000,
      description: newItemData.task?.title || "Inbox updated with new item",
    });
  });

  // Lấy 5 tin nhắn mới nhất để hiển thị trên phần "Truy cập nhanh"
  const recentItems = data.slice(0, 5);

  const handleConnectGoogle = async () => {
    try {
      const res = await getGoogleAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Google Auth URL");
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await getGithubAuthUrl();
      if (res.data?.data?.url) window.location.href = res.data.data.url;
      else if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error("Failed to get Github Auth URL");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main text-text-primary overflow-y-auto">
      <div className="flex-1 px-8 py-8 max-w-5xl w-full mx-auto flex flex-col">
        {/* HEADER */}
        <InboxHeader user={user} onRefresh={refetch} isLoading={loading} />

        {/* CONNECTION ALERT */}
        <ConnectionAlert
          connected={connected}
          onConnectGoogle={handleConnectGoogle}
          onConnectGithub={handleConnectGithub}
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
    </div>
  );
}
