import React from "react";
import { motion } from "motion/react";
import { GraduationCap, User, Users, CheckCircle2 } from "lucide-react";

const USE_CASES = [
  {
    icon: GraduationCap,
    title: "Sinh viên",
    desc: "Quản lý bài tập, deadline, lịch học một cách dễ dàng.",
    points: [
      "Theo dõi deadline môn học",
      "Lịch ôn tập và nhắc nhở thông minh",
      "Tổng hợp ghi chú trong một nơi",
    ],
  },
  {
    icon: User,
    title: "Cá nhân",
    desc: "Tổ chức cuộc sống cá nhân, mục tiêu, thói quen hàng ngày.",
    points: [
      "Danh sách công việc theo ưu tiên",
      "Lịch trình tích hợp với Google Calendar",
      "Trợ lý AI hỗ trợ lập kế hoạch",
    ],
  },
  {
    icon: Users,
    title: "Nhóm nhỏ",
    desc: "Cộng tác hiệu quả với đồng đội, không cần thêm công cụ ngoài.",
    points: [
      "Phân chia task và theo dõi tiến độ",
      "Đồng bộ Gmail và GitHub trong inbox",
      "Báo cáo tiến độ tự động",
    ],
  },
];

export default function UseCases() {
  return (
    <section id="use-cases" className="py-24 bg-notion-secondary/40">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Phù hợp với <span className="italic font-serif text-notion-text/40">mọi cách bạn làm việc</span>
          </h2>
          <p className="text-xl text-notion-text/60">
            Cho dù bạn là sinh viên, freelancer, hay đang dẫn dắt một nhóm —
            Nexus thích nghi với cách bạn vận hành.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USE_CASES.map((u, i) => {
            const Icon = u.icon;
            return (
              <motion.div
                key={u.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="notion-card p-8 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-lg bg-notion-secondary flex items-center justify-center mb-6">
                  <Icon size={22} className="text-notion-text" strokeWidth={1.8} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{u.title}</h3>
                <p className="text-notion-text/60 mb-6 leading-relaxed">{u.desc}</p>
                <ul className="space-y-3">
                  {u.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-notion-text/80">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-notion-text/40" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
