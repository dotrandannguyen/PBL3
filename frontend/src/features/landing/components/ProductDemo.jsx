import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, MoreHorizontal, Layout, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function ProductDemo() {
  const [text, setText] = useState("");
  const [showKanban, setShowKanban] = useState(false);
  const fullText = "/kanban-board";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowKanban(true), 500);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 bg-notion-secondary/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Powerful blocks, infinite possibilities.</h2>
          <p className="text-notion-text/60 text-lg">Type '/' to summon any tool you need. Instant, reactive, and beautiful.</p>
        </div>

        <div className="max-w-5xl mx-auto notion-card bg-white min-h-[600px] flex flex-col">
          <div className="p-8 border-b border-notion-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-notion-secondary rounded flex items-center justify-center">
                <Layout size={20} className="text-notion-text/60" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Product Roadmap</h3>
                <p className="text-xs text-notion-text/40">Updated 2 mins ago</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 font-mono text-lg">
            <div className="flex items-center gap-1">
              <span className="text-notion-text">{text}</span>
              <motion.div 
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-0.5 h-6 bg-notion-text"
              />
            </div>

            <AnimatePresence>
              {showKanban && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <KanbanColumn 
                    title="To Do" 
                    count={2} 
                    icon={<Clock size={14} className="text-blue-500" />}
                    tasks={[
                      { id: 1, title: "Design System Audit", priority: "High" },
                      { id: 2, title: "User Interview Scripts", priority: "Medium" }
                    ]}
                  />
                  <KanbanColumn 
                    title="In Progress" 
                    count={1} 
                    icon={<AlertCircle size={14} className="text-orange-500" />}
                    tasks={[
                      { id: 3, title: "Nexus Landing Page", priority: "High" }
                    ]}
                  />
                  <KanbanColumn 
                    title="Done" 
                    count={3} 
                    icon={<CheckCircle2 size={14} className="text-green-500" />}
                    tasks={[
                      { id: 4, title: "Database Schema", priority: "Low" },
                      { id: 5, title: "Auth Integration", priority: "High" }
                    ]}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function KanbanColumn({ title, count, tasks, icon }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium text-notion-text/60 px-1">
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          <span className="bg-notion-secondary px-1.5 py-0.5 rounded text-[10px]">{count}</span>
        </div>
        <div className="flex items-center gap-1">
          <Plus size={14} className="cursor-pointer hover:text-notion-text" />
          <MoreHorizontal size={14} className="cursor-pointer hover:text-notion-text" />
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: idx * 0.1,
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            className="notion-card p-4 hover:border-notion-text/20 transition-colors cursor-grab active:cursor-grabbing"
          >
            <p className="text-sm font-medium mb-3">{task.title}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                task.priority === 'High' ? 'bg-red-50 text-red-600' : 
                task.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 
                'bg-gray-50 text-gray-600'
              }`}>
                {task.priority}
              </span>
            </div>
          </motion.div>
        ))}
        <button className="w-full py-2 flex items-center justify-center gap-2 text-sm text-notion-text/40 hover:bg-notion-secondary rounded transition-colors">
          <Plus size={14} />
          New
        </button>
      </div>
    </div>
  );
}
