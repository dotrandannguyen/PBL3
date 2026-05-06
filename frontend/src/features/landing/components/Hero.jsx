import { motion } from "motion/react";
import {
  ArrowRight,
  Search,
  CheckSquare,
  Square,
  Calendar,
  Mail,
  FileText,
  Hash,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-6">
              Your entire workspace. <br />
              <span className="text-notion-text/40 italic font-serif">Unified.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-2xl text-notion-text/60 max-w-2xl mb-10 leading-relaxed"
          >
            Nexus brings your notes, docs, and projects together in one beautiful, 
            minimalist interface. Built for teams that demand speed and flexibility.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.2, 
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="flex flex-col sm:flex-row gap-4 mb-20"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/auth/register"
                className="inline-flex bg-notion-text text-white px-8 py-4 rounded-lg font-semibold text-lg items-center gap-2 shadow-xl shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-all"
              >
                Dùng thử miễn phí
                <ArrowRight size={20} />
              </Link>
            </motion.div>
            <Link
              to="/auth/login"
              className="px-8 py-4 rounded-lg font-semibold text-lg border border-notion-border hover:bg-notion-secondary transition-colors"
            >
              Đăng nhập
            </Link>
          </motion.div>
        </div>

        {/* Floating Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="relative z-10 notion-card overflow-hidden shadow-2xl"
          >
            {/* Browser chrome */}
            <div className="h-9 bg-notion-secondary border-b border-notion-border flex items-center px-4 gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-300/70" />
              <div className="w-3 h-3 rounded-full bg-green-300/70" />
              <div className="ml-4 hidden md:flex items-center gap-1.5 text-[11px] text-notion-text/40 bg-white/60 rounded px-2.5 py-0.5 border border-notion-border/60">
                <span className="text-emerald-500">●</span> nexus.app/workspace
              </div>
            </div>

            {/* Inner app body */}
            <div className="bg-white min-h-[400px] flex">
              {/* Sidebar */}
              <aside className="w-56 hidden md:flex flex-col border-r border-notion-border bg-notion-secondary/40 p-3 text-[12px]">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
                  <div className="w-6 h-6 rounded bg-notion-text text-white flex items-center justify-center text-[10px] font-bold">
                    N
                  </div>
                  <span className="font-semibold text-notion-text">Nexus</span>
                </div>

                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-notion-text/60 hover:bg-white/60">
                  <Search size={12} />
                  <span>Tìm kiếm</span>
                  <kbd className="ml-auto text-[9px] bg-white px-1 rounded border border-notion-border">⌘K</kbd>
                </div>

                <p className="mt-4 mb-1.5 px-2 text-[9.5px] font-semibold uppercase tracking-wider text-notion-text/40">
                  Workspace
                </p>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white text-notion-text font-medium">
                  <CheckSquare size={12} className="text-blue-500" />
                  <span>To Do List</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-notion-text/60 hover:bg-white/60">
                  <FileText size={12} />
                  <span>Ghi chú</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-notion-text/60 hover:bg-white/60">
                  <Calendar size={12} />
                  <span>Lịch</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-notion-text/60 hover:bg-white/60">
                  <Mail size={12} />
                  <span>Inbox</span>
                  <span className="ml-auto bg-blue-500 text-white text-[9px] px-1.5 rounded-full font-semibold">3</span>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 p-7 overflow-hidden">
                <div className="flex items-center gap-1 text-[11px] text-notion-text/40 mb-4">
                  <span>Workspace</span>
                  <ChevronRight size={11} />
                  <span className="text-notion-text/70">To Do List</span>
                </div>

                <h3 className="text-[28px] font-bold tracking-tight mb-1">
                  Hôm nay
                </h3>
                <p className="text-sm text-notion-text/50 mb-6">
                  Bạn còn 5 việc cần hoàn thành.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-notion-secondary/60 group">
                    <CheckSquare size={16} className="text-emerald-500" />
                    <span className="flex-1 text-sm text-notion-text/40 line-through">
                      Review thiết kế landing page
                    </span>
                    <span className="text-[10px] text-notion-text/30">9:00</span>
                  </div>

                  <div className="flex items-center gap-3 py-1.5 px-2 rounded bg-blue-50 border border-blue-100">
                    <Square size={16} className="text-notion-text/30" />
                    <span className="flex-1 text-sm font-medium">
                      Họp với team Product
                    </span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      Khẩn
                    </span>
                    <span className="text-[10px] text-notion-text/40">14:30</span>
                  </div>

                  <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-notion-secondary/60">
                    <Square size={16} className="text-notion-text/30" />
                    <span className="flex-1 text-sm">Soạn email cho khách hàng</span>
                    <Hash size={11} className="text-notion-text/30" />
                    <span className="text-[10px] text-notion-text/40">16:00</span>
                  </div>

                  <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-notion-secondary/60">
                    <Square size={16} className="text-notion-text/30" />
                    <span className="flex-1 text-sm">Cập nhật roadmap Q2</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      TB
                    </span>
                  </div>

                  <div className="flex items-center gap-3 py-1.5 px-2 rounded text-notion-text/40 hover:bg-notion-secondary/60">
                    <Plus size={16} />
                    <span className="text-sm">Thêm công việc...</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Decorative background elements */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-notion-secondary rounded-full blur-3xl opacity-50 -z-10" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-notion-secondary rounded-full blur-3xl opacity-50 -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
