import React from "react";
import { motion } from "motion/react";
import { Calendar, Mail, Github, Sparkles, MessageSquare, FileText, Slack as SlackIcon } from "lucide-react";

const INTEGRATIONS = [
  { icon: Calendar, name: "Google Calendar", desc: "Đồng bộ 2 chiều", featured: true },
  { icon: Mail, name: "Gmail", desc: "Inbox tích hợp", featured: true },
  { icon: Github, name: "GitHub", desc: "Issues & PRs", featured: true },
  { icon: Sparkles, name: "Gemini AI", desc: "Trợ lý thông minh", featured: true },
  { icon: SlackIcon, name: "Slack", desc: "Sắp ra mắt", coming: true },
  { icon: FileText, name: "Notion", desc: "Sắp ra mắt", coming: true },
  { icon: MessageSquare, name: "Discord", desc: "Sắp ra mắt", coming: true },
];

export default function Integrations() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-notion-text/50 mb-4">
            Tích hợp
          </p>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Một workspace, <span className="italic font-serif text-notion-text/40">mọi công cụ</span>
          </h2>
          <p className="text-xl text-notion-text/60">
            Kết nối những công cụ bạn đang dùng. Mọi thứ tự đồng bộ, không cần copy-paste.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {INTEGRATIONS.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`notion-card p-6 bg-white transition-all relative overflow-hidden ${
                  it.coming ? "opacity-60" : "hover:shadow-lg"
                }`}
              >
                {it.featured && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                )}
                {it.coming && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider text-notion-text/40 bg-notion-secondary px-2 py-0.5 rounded">
                    Soon
                  </span>
                )}
                <div className="w-11 h-11 rounded-lg bg-notion-secondary flex items-center justify-center mb-4">
                  <Icon size={20} strokeWidth={1.8} className="text-notion-text" />
                </div>
                <h4 className="font-bold text-base mb-1">{it.name}</h4>
                <p className="text-sm text-notion-text/50">{it.desc}</p>
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
          Và còn nhiều hơn nữa qua API mở.
        </motion.p>
      </div>
    </section>
  );
}
