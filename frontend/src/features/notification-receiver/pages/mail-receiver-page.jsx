import React, { useState } from "react";
import { useIntegrations } from "../hooks/useIntegrations";
import useAuth from "../../auth/hooks/useAuth";
import { getGoogleAuthUrl, getGithubAuthUrl } from "../../auth/api/auth.api";
import {
  InboxHeader,
  ConnectionAlert,
  RecentItemsSection,
  InboxTabsContainer,
  ItemDetailModal,
} from "../components";

export function MailReceiverPage() {
  const { user } = useAuth();
  const { data, loading, error, connected, refetch } = useIntegrations();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

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
        />
      </div>

      {/* MODAL CHI TIẾT */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
