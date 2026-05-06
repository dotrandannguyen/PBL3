import { motion } from "motion/react";

const LOGOS = [
  "GitHub", "Slack", "Google", "Figma", "Stripe", "Airbnb", "Uber", "Netflix", "Spotify", "Discord"
];

export default function SocialProof() {
  return (
    <section className="py-20 border-y border-notion-border overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-notion-text/40">
          Trusted by the world's most innovative teams
        </p>
      </div>

      <div className="relative flex overflow-hidden group">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="flex items-center gap-20 whitespace-nowrap px-10 group-hover:[animation-play-state:paused]"
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div key={i} className="text-3xl font-bold text-notion-text/20 hover:text-notion-text/60 transition-colors cursor-default select-none">
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
