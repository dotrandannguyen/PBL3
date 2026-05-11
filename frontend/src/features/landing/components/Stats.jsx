import React from "react";
import { motion } from "motion/react";

const STATS = [
  { value: "50K+", label: "Người dùng đang hoạt động" },
  { value: "1M+", label: "Công việc đã được tạo" },
  { value: "99.9%", label: "Thời gian hoạt động" },
  { value: "4.8★", label: "Đánh giá trung bình" },
];

export default function Stats() {
  return (
    <section className="py-20 bg-notion-bg border-y notion-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-bold tracking-tighter mb-2">
                {stat.value}
              </div>
              <div className="text-sm md:text-base text-notion-text/50 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
