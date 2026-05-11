import React, { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const PLANS = [
  {
    id: "free",
    name: "Miễn phí",
    tagline: "Cho cá nhân mới bắt đầu",
    monthly: 0,
    yearly: 0,
    cta: "Dùng ngay",
    ctaTo: "/auth/register",
    features: [
      "Không giới hạn task & ghi chú",
      "1 workspace",
      "Lịch tích hợp Google Calendar",
      "AI Assistant (10 lượt/ngày)",
      "Đồng bộ trên nhiều thiết bị",
      "Hỗ trợ qua email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Cho cá nhân muốn nhiều hơn",
    monthly: 149000,
    yearly: 1490000,
    cta: "Bắt đầu Pro",
    ctaTo: "/auth/register?plan=pro",
    popular: true,
    features: [
      "Tất cả tính năng Free",
      "5 workspace",
      "AI Assistant không giới hạn",
      "Tích hợp Gmail + GitHub đầy đủ",
      "Lưu trữ file lên đến 10GB",
      "Lịch sử 90 ngày",
      "Hỗ trợ ưu tiên",
    ],
  },
  {
    id: "team",
    name: "Team",
    tagline: "Cho nhóm cộng tác",
    monthly: 399000,
    yearly: 3990000,
    cta: "Liên hệ tư vấn",
    ctaTo: "/auth/register?plan=team",
    features: [
      "Tất cả tính năng Pro",
      "Workspace không giới hạn",
      "Cộng tác real-time",
      "Phân quyền chi tiết",
      "Báo cáo tiến độ tự động",
      "SSO & Audit log",
      "Hỗ trợ chuyên trách 24/7",
    ],
  },
];

const formatVND = (n) => {
  if (n === 0) return "0₫";
  return `${n.toLocaleString("vi-VN")}₫`;
};

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");

  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-20 right-0 w-96 h-96 bg-notion-secondary rounded-full blur-3xl opacity-50 -z-10" />
      <div className="absolute -bottom-20 left-0 w-96 h-96 bg-notion-secondary rounded-full blur-3xl opacity-50 -z-10" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-notion-text/50 mb-4">
            Bảng giá
          </p>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Đơn giản, <span className="italic font-serif text-notion-text/40">minh bạch</span>
          </h2>
          <p className="text-xl text-notion-text/60 mb-10">
            Bắt đầu miễn phí. Nâng cấp khi bạn cần thêm sức mạnh.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-notion-secondary rounded-full notion-border">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                billing === "monthly"
                  ? "bg-white text-notion-text shadow-sm"
                  : "text-notion-text/60 hover:text-notion-text"
              }`}
            >
              Hàng tháng
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
                billing === "yearly"
                  ? "bg-white text-notion-text shadow-sm"
                  : "text-notion-text/60 hover:text-notion-text"
              }`}
            >
              Hàng năm
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                -17%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {PLANS.map((plan, i) => {
            const price = billing === "monthly" ? plan.monthly : plan.yearly;
            const perLabel = billing === "monthly" ? "/tháng" : "/năm";
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col p-8 rounded-xl transition-all ${
                  plan.popular
                    ? "bg-notion-text text-white shadow-2xl border-2 border-notion-text scale-[1.03]"
                    : "bg-white notion-border notion-shadow hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-notion-text text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full notion-border notion-shadow">
                    Phổ biến nhất
                  </span>
                )}

                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p
                  className={`text-sm mb-6 ${plan.popular ? "text-white/60" : "text-notion-text/60"}`}
                >
                  {plan.tagline}
                </p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tighter">
                      {formatVND(price)}
                    </span>
                    {price > 0 && (
                      <span
                        className={`text-sm ${plan.popular ? "text-white/50" : "text-notion-text/50"}`}
                      >
                        {perLabel}
                      </span>
                    )}
                  </div>
                  {price === 0 && (
                    <p
                      className={`text-xs mt-1 ${plan.popular ? "text-white/50" : "text-notion-text/50"}`}
                    >
                      Miễn phí mãi mãi
                    </p>
                  )}
                </div>

                <Link
                  to={plan.ctaTo}
                  className={`block w-full text-center px-4 py-3 rounded-lg font-semibold text-sm transition-all active:scale-95 mb-8 ${
                    plan.popular
                      ? "bg-white text-notion-text hover:bg-white/90"
                      : "bg-notion-text text-white hover:bg-notion-text/90"
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2.5 text-sm ${plan.popular ? "text-white/90" : "text-notion-text/80"}`}
                    >
                      <Check
                        size={16}
                        strokeWidth={2.5}
                        className={`mt-0.5 shrink-0 ${plan.popular ? "text-white" : "text-emerald-600"}`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12 text-sm text-notion-text/50"
        >
          Tất cả gói đều có thể hủy bất cứ lúc nào. Không phí ẩn.
        </motion.p>
      </div>
    </section>
  );
}
