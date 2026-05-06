import React from "react";
import { motion } from "motion/react";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Tôi đã thử Notion, Trello, Asana — Nexus là công cụ đầu tiên tôi dùng quá 2 tuần. Giao diện gọn, tốc độ là điểm cộng lớn nhất.",
    name: "Nguyễn Minh Tuấn",
    role: "Product Designer · Tiki",
    initial: "MT",
    accent: "bg-blue-100 text-blue-700",
  },
  {
    quote:
      "Nexus đã thay thế hoàn toàn Google Tasks và Apple Reminders trong workflow của tôi. AI Assistant tự tạo task từ email — siêu tiện.",
    name: "Trần Lan Anh",
    role: "Founder · Lava Studio",
    initial: "LA",
    accent: "bg-rose-100 text-rose-700",
  },
  {
    quote:
      "Cuối cùng cũng có một app task management hoạt động tốt với Gmail và GitHub cùng lúc. Đội tôi tiết kiệm gần 5h/tuần nhờ Nexus.",
    name: "Phạm Đức Anh",
    role: "Tech Lead · Momo",
    initial: "ĐA",
    accent: "bg-amber-100 text-amber-700",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-notion-secondary/40">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-notion-text/50 mb-4">
            Khách hàng nói gì
          </p>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Được tin dùng bởi <span className="italic font-serif text-notion-text/40">những người làm thực tế</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="notion-card p-8 bg-white flex flex-col transition-shadow hover:shadow-lg"
            >
              <Quote size={28} className="text-notion-text/15 mb-4" strokeWidth={1.8} />
              <p className="text-notion-text/80 leading-relaxed mb-8 flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-notion-border">
                <div
                  className={`w-10 h-10 rounded-full ${t.accent} flex items-center justify-center font-bold text-sm`}
                >
                  {t.initial}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-notion-text/50">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
