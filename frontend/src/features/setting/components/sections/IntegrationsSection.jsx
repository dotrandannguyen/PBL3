import React from "react";
import {
  Github,
  Mail,
  ArrowUpRight,
  X,
  CloudRain,
} from "lucide-react";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { getSlackAuthUrl } from "../../../auth/api/auth.api";

/* ─── Connection status pill ─────────────────────────────────────── */

const StatusPill = ({ connected, account }) => {
  if (!connected) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {account ? `Đã kết nối · ${account}` : "Đã kết nối"}
    </span>
  );
};

/* ─── Integration card ───────────────────────────────────────────── */

const IntegrationCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  iconBgIsLight = false,
  name,
  description,
  connected,
  account,
  onConnect,
  onDisconnect,
}) => (
  <div className="group relative overflow-hidden rounded-xl border border-border-subtle bg-bg-sidebar/60 p-4 transition-all duration-150 hover:border-border-focused hover:bg-bg-sidebar">
    <div className="flex items-start gap-4">
      {/* Icon */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${
          iconBgIsLight ? "shadow-sm shadow-black/10" : ""
        }`}
      >
        <Icon size={20} className={iconColor} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13.5px] font-semibold text-text-primary">
            {name}
          </h3>
          <StatusPill connected={connected} account={account} />
        </div>
        <p className="mt-1 text-[12.5px] text-text-tertiary leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="flex h-8 items-center gap-1.5 rounded-md border border-transparent bg-transparent px-3 text-[12px] font-medium text-text-tertiary transition-all duration-150 hover:border-red-500/25 hover:bg-red-500/8 hover:text-red-400 active:scale-[0.97]"
          >
            <X size={12} />
            Ngắt kết nối
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-main/60 px-3 text-[12px] font-semibold text-text-primary transition-all duration-150 hover:border-accent-primary/40 hover:bg-accent-primary/8 hover:text-accent-primary active:scale-[0.97]"
          >
            Kết nối
            <ArrowUpRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>
        )}
      </div>
    </div>
  </div>
);

/* ─── Section ─────────────────────────────────────────────────────── */

const IntegrationsSection = () => {
  const { t } = useLanguage();

  const handleConnectSlack = async () => {
    try {
      const res = await getSlackAuthUrl();
      console.log('[Slack Auth] Response:', res);

      const url = res.data?.data?.url || res.data?.url;
      if (!url) {
        console.error('[Slack Auth] No URL in response:', res);
        alert('Lỗi: Không thể lấy URL đăng nhập Slack. Vui lòng thử lại.');
        return;
      }

      window.location.href = url;
    } catch (error) {
      console.error("[Slack Auth] Error:", error);
      alert('Lỗi: ' + (error?.message || 'Không thể mở đăng nhập Slack'));
    }
  };

  return (
    <section>
      {/* Section header */}
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          {t("integrations.title") || "Tích hợp"}
        </h2>
        <p className="mt-1 text-[13px] text-text-tertiary">
          {t("integrations.subtitle") ||
            "Kết nối các dịch vụ ngoài để đồng bộ dữ liệu vào workspace."}
        </p>
      </header>

      <div className="space-y-3">
        <IntegrationCard
          icon={Github}
          iconBg="bg-[#181717]"
          iconColor="text-white"
          name="GitHub"
          description="Theo dõi issues và pull request được giao cho bạn."
          onConnect={() => {}}
        />

        <IntegrationCard
          icon={Mail}
          iconBg="bg-white"
          iconColor="text-[#EA4335]"
          iconBgIsLight
          name="Gmail"
          description="Biến email thành task có thể hành động."
          onConnect={() => {}}
        />

        <IntegrationCard
          icon={CloudRain}
          iconBg="bg-[#4A154B]"
          iconColor="text-white"
          name="Slack"
          description="Đưa tin nhắn mới nhất vào inbox để xử lý."
          onConnect={handleConnectSlack}
        />
      </div>
    </section>
  );
};

export default IntegrationsSection;
