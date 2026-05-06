import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Layers, Zap, Share2, Database, Shield, Globe } from "lucide-react";

export default function BentoFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Everything you need to build anything.</h2>
          <p className="text-notion-text/60 text-lg">Nexus is modular by design. Combine blocks to create the perfect workflow for your team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
          <FeatureCard 
            className="md:col-span-2 md:row-span-2"
            icon={<Layers className="text-notion-text" size={32} />}
            title="Modular Building Blocks"
            description="Text, images, databases, kanban boards, and more. Everything is a block that you can drag, drop, and nest infinitely."
            bg="bg-notion-secondary/30"
          />
          <FeatureCard 
            icon={<Zap className="text-orange-500" size={24} />}
            title="Real-time Sync"
            description="Collaborate with your team in real-time with zero latency."
          />
          <FeatureCard 
            icon={<Share2 className="text-blue-500" size={24} />}
            title="Public Sharing"
            description="Turn any page into a beautiful public website with one click."
          />
          <FeatureCard 
            icon={<Database className="text-purple-500" size={24} />}
            title="Relational Databases"
            description="Powerful databases with custom views, filters, and relations."
          />
          <FeatureCard 
            className="md:col-span-2"
            icon={<Shield className="text-green-500" size={24} />}
            title="Enterprise Security"
            description="SSO, audit logs, and advanced permissions to keep your data safe and compliant."
            bg="bg-notion-secondary/30"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description, className = "", bg = "bg-white" }) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), springConfig);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);

    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative notion-card p-8 flex flex-col justify-between overflow-hidden group transition-shadow hover:shadow-xl ${bg} ${className}`}
    >
      {/* Radial Gradient Tracker */}
      <motion.div 
        className="pointer-events-none absolute -inset-px rounded-notion opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([mx, my]) => `radial-gradient(600px circle at ${mx}px ${my}px, rgba(25, 25, 25, 0.03), transparent 40%)`
          )
        }}
      />

      <div className="relative z-10">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-notion-text/60 text-sm leading-relaxed">{description}</p>
      </div>

      <div className="relative z-10 mt-4">
        <motion.div 
          animate={{ x: isHovered ? 5 : 0 }}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-notion-text/40 group-hover:text-notion-text transition-colors"
        >
          Learn more
          <Globe size={12} />
        </motion.div>
      </div>
    </motion.div>
  );
}
