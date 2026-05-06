import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-notion-border"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-notion-text rounded flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <span className="font-bold text-xl tracking-tighter">Nexus</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-notion-text/70">
          <a href="#features" className="hover:text-notion-text transition-colors">Tính năng</a>
          <a href="#use-cases" className="hover:text-notion-text transition-colors">Giải pháp</a>
          <a href="#pricing" className="hover:text-notion-text transition-colors">Bảng giá</a>
          <a href="#faq" className="hover:text-notion-text transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/auth/login"
            className="text-sm font-medium hover:bg-notion-secondary px-3 py-1.5 rounded transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            to="/auth/register"
            className="bg-notion-text text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-notion-text/90 transition-all active:scale-95"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
