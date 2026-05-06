import React from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ProductDemo from "../components/ProductDemo";
import BentoFeatures from "../components/BentoFeatures";
import SocialProof from "../components/SocialProof";
import Footer from "../components/Footer";
import Stats from "../components/Stats";
import UseCases from "../components/UseCases";
import Integrations from "../components/Integrations";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import FAQ from "../components/FAQ";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="landing-root min-h-screen bg-notion-bg text-notion-text selection:bg-notion-text selection:text-white"
    >
      <Navbar />

      <main>
        <Hero />

        <SocialProof />

        <Stats />

        <ProductDemo />

        <section className="py-24 bg-white relative overflow-hidden">
          {/* Subtle background parallax grid */}
          <motion.div
            style={{ y }}
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(#191919 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </motion.div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
              <ScrollReveal>
                <h2 className="text-5xl font-bold tracking-tight mb-8 leading-tight">
                  The speed of thought, <br />
                  <span className="text-notion-text/40">the power of a database.</span>
                </h2>
                <p className="text-xl text-notion-text/60 leading-relaxed mb-10">
                  Nexus is designed to be invisible. It stays out of your way
                  so you can focus on what matters most: your work.
                  No clutter, no distractions, just pure productivity.
                </p>
                <div className="space-y-6">
                  <FeatureItem
                    title="Instant Search"
                    desc="Find anything in milliseconds with our global command palette."
                  />
                  <FeatureItem
                    title="Offline Mode"
                    desc="Work from anywhere. Your changes sync automatically when you're back online."
                  />
                  <FeatureItem
                    title="API First"
                    desc="Connect Nexus to your favorite tools with our robust developer API."
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="notion-card p-2 bg-notion-secondary/50">
                  <div className="bg-white rounded-notion p-8 shadow-inner min-h-[400px] flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-notion-secondary rounded-full flex items-center justify-center mb-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <div className="w-10 h-10 border-2 border-notion-text border-t-transparent rounded-full" />
                      </motion.div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4 italic font-serif">Deep Work Mode</h3>
                    <p className="text-notion-text/60 max-w-sm">
                      Activate a distraction-free environment that hides everything
                      except the document you're working on.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <div id="features">
          <BentoFeatures />
        </div>

        <UseCases />

        <Integrations />

        <Testimonials />

        <Pricing />

        <FAQ />

        <section className="py-32 bg-notion-text text-white text-center">
          <div className="max-w-3xl mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-8">
                Sẵn sàng nâng tầm <br /> cách bạn làm việc?
              </h2>
              <p className="text-white/60 text-xl mb-12">
                Tham gia cùng các nhóm đang dùng Nexus để tổ chức công việc tốt hơn mỗi ngày.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <Link
                  to="/auth/register"
                  className="inline-block bg-white text-notion-text px-10 py-5 rounded-lg font-bold text-xl shadow-2xl shadow-white/10"
                >
                  Bắt đầu miễn phí
                </Link>
              </motion.div>
              <p className="mt-8 text-sm text-white/40 italic font-serif">
                Không cần thẻ tín dụng. Hủy bất cứ lúc nào.
              </p>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ScrollReveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function FeatureItem({ title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-notion-text shrink-0" />
      <div>
        <h4 className="font-bold text-lg mb-1">{title}</h4>
        <p className="text-notion-text/60">{desc}</p>
      </div>
    </div>
  );
}
