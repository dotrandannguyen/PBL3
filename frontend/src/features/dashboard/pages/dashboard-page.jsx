import React from "react";
import { LayoutDashboard, CheckCircle2, Circle, Flame, Calendar } from "lucide-react";
import { getTasks } from "../../tasks/api/task.api";
import ProgressRing from "../components/ProgressRing";
import WeeklyChart from "../components/WeeklyChart";

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatRange = (start) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(start)} – ${fmt(end)}`;
};

export function DashboardPage() {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    getTasks({ page: 1, limit: 500 })
      .then((res) => {
        if (!alive) return;
        const list = res?.data?.data?.data || res?.data?.data || [];
        setTasks(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Không tải được dữ liệu");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const isDone = (t) =>
      typeof t?.completed === "boolean" ? t.completed : t?.status === "DONE";
    const done = tasks.filter(isDone).length;
    const pending = total - done;
    const overdue = tasks.filter((t) => {
      if (isDone(t)) return false;
      if (!t?.dueDate) return false;
      return new Date(t.dueDate).getTime() < Date.now();
    }).length;
    return { total, done, pending, overdue };
  }, [tasks]);

  const weekStart = React.useMemo(() => startOfWeek(new Date()), []);

  const weekData = React.useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        date: d,
        label: d.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" }),
        total: 0,
        done: 0,
      };
    });
    const isDone = (t) =>
      typeof t?.completed === "boolean" ? t.completed : t?.status === "DONE";
    tasks.forEach((task) => {
      const ref = task?.dueDate || task?.updatedAt || task?.createdAt;
      if (!ref) return;
      const d = new Date(ref);
      const idx = Math.floor((d.setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
      if (idx < 0 || idx > 6) return;
      buckets[idx].total += 1;
      if (isDone(task)) buckets[idx].done += 1;
    });
    return buckets;
  }, [tasks, weekStart]);

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-text-tertiary">
        <LayoutDashboard size={12} className="text-accent-primary" />
        <span>Bảng điều khiển</span>
      </div>
      <h1 className="text-3xl font-semibold text-text-primary tracking-tight">
        Tiến độ công việc
      </h1>
      <p className="text-sm text-text-tertiary mt-1">
        Tuần này · {formatRange(weekStart)}
      </p>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6 flex flex-col items-center justify-center">
          <h2 className="text-sm font-medium text-text-secondary self-start mb-4">Tổng tiến độ</h2>
          <ProgressRing value={stats.done} total={stats.total} />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Đã hoàn thành"
            value={stats.done}
            tone="emerald"
          />
          <StatCard
            icon={<Circle size={18} />}
            label="Đang chờ"
            value={stats.pending}
            tone="blue"
          />
          <StatCard
            icon={<Flame size={18} />}
            label="Quá hạn"
            value={stats.overdue}
            tone="red"
          />
          <StatCard
            icon={<Calendar size={18} />}
            label="Tổng task"
            value={stats.total}
            tone="purple"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-medium text-text-secondary">Phân phối tuần này</h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              Số task theo từng ngày · T2 đến CN
            </p>
          </div>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-text-tertiary">
            Đang tải dữ liệu...
          </div>
        ) : (
          <WeeklyChart data={weekData} />
        )}
      </div>
    </div>
  );
}

const TONE_STYLES = {
  emerald: { ring: "ring-emerald-500/20", icon: "text-emerald-400", glow: "from-emerald-500/15" },
  blue: { ring: "ring-blue-500/20", icon: "text-blue-400", glow: "from-blue-500/15" },
  red: { ring: "ring-red-500/20", icon: "text-red-400", glow: "from-red-500/15" },
  purple: { ring: "ring-purple-500/20", icon: "text-purple-400", glow: "from-purple-500/15" },
};

const StatCard = ({ icon, label, value, tone = "blue" }) => {
  const t = TONE_STYLES[tone] || TONE_STYLES.blue;
  return (
    <div className="relative rounded-2xl border border-border-subtle bg-bg-sidebar/40 p-5 overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl opacity-60`} />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-bg-hover ring-1 ${t.ring} ${t.icon} mb-3`}>
          {icon}
        </div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-tertiary mt-0.5">{label}</div>
      </div>
    </div>
  );
};
