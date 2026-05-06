import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Nexus có thực sự miễn phí không?",
    a: "Có. Gói Free là miễn phí vĩnh viễn, không yêu cầu thẻ tín dụng. Bạn có thể dùng task không giới hạn, ghi chú không giới hạn, và đồng bộ trên mọi thiết bị mà không tốn phí. Chỉ nâng cấp lên Pro/Team khi bạn cần workspace nhiều hơn hoặc AI Assistant không giới hạn.",
  },
  {
    q: "Dữ liệu của tôi có an toàn không?",
    a: "Tất cả dữ liệu được mã hóa cả khi truyền (TLS 1.3) và khi lưu trữ (AES-256). Backup tự động hằng ngày. Chúng tôi không bao giờ bán hay chia sẻ dữ liệu cá nhân của bạn với bên thứ ba. Bạn có thể xuất hoặc xóa toàn bộ dữ liệu bất cứ lúc nào.",
  },
  {
    q: "Có thể import dữ liệu từ Notion / Trello không?",
    a: "Hiện tại bạn có thể import từ file CSV và Markdown. Tích hợp import trực tiếp từ Notion, Trello và Asana đang trong roadmap và sẽ ra mắt trong Q2/2026.",
  },
  {
    q: "Tôi có thể hủy gói trả phí bất cứ lúc nào không?",
    a: "Có. Bạn có thể hủy ngay trong phần Cài đặt > Gói cước. Sau khi hủy, bạn vẫn dùng được Pro đến hết chu kỳ thanh toán hiện tại, sau đó tự động về gói Free mà không mất dữ liệu.",
  },
  {
    q: "Nexus hỗ trợ tiếng Việt không?",
    a: "Có. Toàn bộ giao diện đã được Việt hoá đầy đủ. AI Assistant cũng hiểu và phản hồi tiếng Việt tự nhiên. Ngoài ra còn có English và 日本語.",
  },
  {
    q: "Nexus hoạt động offline được không?",
    a: "Có. Bạn có thể tạo và chỉnh sửa task, ghi chú khi không có mạng. Mọi thay đổi sẽ tự động đồng bộ ngay khi kết nối lại. Tính năng offline đầy đủ chỉ có trên gói Pro trở lên.",
  },
];

function FaqItem({ faq, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="notion-border border-b last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-6 text-left group cursor-pointer bg-transparent border-none px-0"
      >
        <span className="text-lg font-semibold pr-4 group-hover:text-notion-text/80 transition-colors">
          {faq.q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 w-9 h-9 rounded-full bg-notion-secondary flex items-center justify-center"
        >
          <Plus size={18} strokeWidth={2} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-12 text-notion-text/70 leading-relaxed">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold tracking-widest uppercase text-notion-text/50 mb-4">
            FAQ
          </p>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Câu hỏi <span className="italic font-serif text-notion-text/40">thường gặp</span>
          </h2>
          <p className="text-xl text-notion-text/60">
            Mọi điều bạn cần biết trước khi bắt đầu.
          </p>
        </motion.div>

        <div className="border-t border-notion-border">
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.q} faq={faq} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-14 p-8 notion-card bg-notion-secondary/40"
        >
          <p className="font-semibold mb-2">Vẫn còn thắc mắc?</p>
          <p className="text-sm text-notion-text/60 mb-4">
            Đội hỗ trợ của chúng tôi luôn sẵn sàng giúp bạn.
          </p>
          <a
            href="mailto:hello@nexus.app"
            className="inline-block bg-notion-text text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-notion-text/90 transition-colors"
          >
            Liên hệ hỗ trợ
          </a>
        </motion.div>
      </div>
    </section>
  );
}
