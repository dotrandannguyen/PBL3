import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Trash2,
  Filter,
  ArrowUpDown,
  Maximize2,
  MoreHorizontal,
  ListFilter,
} from "lucide-react";

// ============================================
// CONSTANTS
// ============================================

const TOOLBAR_ACTIONS = [
  { icon: Filter, name: "filter" },
  { icon: ArrowUpDown, name: "sort" },
  { icon: Search, name: "search" },
  { icon: Maximize2, name: "expand" },
  { icon: MoreHorizontal, name: "more" },
];

const INITIAL_TASKS = [
  {
    id: 1,
    text: "Check the box to mark items as done",
    done: true,
    date: "2026-01-10",
  },
  {
    id: 2,
    text: "Click the due date to change it",
    done: true,
    date: "2026-01-10",
  },
  {
    id: 3,
    text: "Click me to see even more detail",
    done: true,
    date: "2026-01-10",
  },
  {
    id: 4,
    text: "Click the blue New button to add a task",
    done: true,
    date: "2026-01-10",
  },
  {
    id: 5,
    text: "Click me to learn how to hide checked items",
    done: false,
    date: "2026-01-10",
  },
  {
    id: 6,
    text: 'See finished items in the "Done" view',
    done: false,
    date: "2026-01-10",
  },
  {
    id: 7,
    text: "Click me to learn how to see your content your way",
    done: false,
    date: "2026-01-11",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date) => {
  const options = { month: "long", day: "numeric", year: "numeric" };
  return new Date(date).toLocaleDateString("en-US", options);
};

const createNewTask = (text = "New task") => ({
  id: Date.now(),
  text,
  done: false,
  date: new Date().toISOString().split("T")[0],
});

// ============================================
// SMALL COMPONENTS
// ============================================

/** Logo Component - Hiển thị logo checkmark */
const CheckmarkLogo = () => (
  <svg className="mb-3" width="78" height="78" viewBox="0 0 78 78" fill="none">
    <path
      d="M15 42L30 57L63 24"
      stroke="#00C853"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 30L30 45L50 25"
      stroke="#00C853"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.5"
    />
  </svg>
);

/** Tab Button Component */
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    type="button"
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-transparent transition-all cursor-pointer ${
      isActive
        ? "bg-white/5 border-border-focused text-text-primary"
        : "text-text-secondary hover:bg-white/3"
    }`}
    onClick={onClick}
  >
    {Icon ? <Icon size={14} /> : <span>✓</span>}
    <span>{label}</span>
  </button>
);

/** Toolbar Button Component */
const ToolbarButton = ({ icon: Icon, name }) => (
  <button
    type="button"
    className="p-1.5 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
  >
    <Icon size={14} />
  </button>
);

/** Task Checkbox Component */
const TaskCheckbox = ({ checked, onChange }) => (
  <button
    type="button"
    className={`w-4.5 h-4.5 border-2 rounded flex items-center justify-center flex-shrink-0 transition-all cursor-pointer text-xs ${
      checked
        ? "bg-accent-primary border-accent-primary text-white"
        : "border-neutral-600 hover:border-accent-primary"
    }`}
    onClick={onChange}
    aria-label={checked ? "Mark as incomplete" : "Mark as complete"}
  >
    {checked && <span>✓</span>}
  </button>
);

/** Task Row Component */
const TaskRow = ({
  task,
  isEditing,
  editText,
  onToggle,
  onEdit,
  onEditChange,
  onEditSave,
  onEditKeyDown,
  onDelete,
}) => (
  <div className="flex items-center gap-3 py-2 px-0 border-b border-border-subtle hover:bg-white/2 transition-colors">
    <TaskCheckbox checked={task.done} onChange={onToggle} />

    {isEditing ? (
      <input
        className="flex-1 bg-transparent border-none px-0 py-1 text-text-primary text-sm outline-none"
        value={editText}
        onChange={(e) => onEditChange(e.target.value)}
        onKeyDown={onEditKeyDown}
        onBlur={onEditSave}
        autoFocus
      />
    ) : (
      <button
        type="button"
        className={`flex-1 bg-transparent border-none px-0 py-1 text-sm text-left cursor-text transition-colors ${
          task.done ? "text-text-tertiary" : "text-text-primary"
        }`}
        onClick={onEdit}
      >
        {task.text}
      </button>
    )}

    <span className="text-xs text-text-tertiary whitespace-nowrap">
      {formatDate(task.date)}
    </span>

    <button
      type="button"
      className="p-1 rounded-md bg-transparent text-text-tertiary cursor-pointer opacity-0 hover:bg-red-500/10 hover:text-red-500 transition-all hover:opacity-100"
      onClick={onDelete}
    >
      <Trash2 size={14} />
    </button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const TaskList = ({ title = "To Do List" }) => {
  // State
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState("todo");
  const [newTaskText, setNewTaskText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Derived state
  const filteredTasks = tasks.filter((task) => {
    // Filter by tab
    if (activeTab === "todo" && task.done) return false;
    if (activeTab === "done" && !task.done) return false;

    // Filter by search
    if (
      searchQuery &&
      !task.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    return true;
  });

  // Event handlers
  const handleToggleTask = (id) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    setTasks([...tasks, createNewTask(newTaskText)]);
    setNewTaskText("");
  };

  const handleAddBlankTask = () => {
    const newTask = createNewTask();
    setTasks([...tasks, newTask]);
    setTimeout(() => {
      setEditingId(newTask.id);
      setEditText(newTask.text);
    }, 50);
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      setTasks(
        tasks.map((t) => (t.id === editingId ? { ...t, text: editText } : t)),
      );
      setEditingId(null);
      setEditText("");
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") handleSaveEdit();
    else if (e.key === "Escape") {
      setEditingId(null);
      setEditText("");
    }
  };

  const handleNewTaskKeyDown = (e) => {
    if (e.key === "Enter") handleAddTask();
  };

  return (
    <main className="flex-1 overflow-y-auto pt-10 pb-10">
      <div className="max-w-3xl mx-auto px-15 py-0">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary">{title}</h1>
        </header>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
          <div className="flex gap-1">
            <TabButton
              icon={ListFilter}
              label="To Do"
              isActive={activeTab === "todo"}
              onClick={() => setActiveTab("todo")}
            />
            <TabButton
              label="Done"
              isActive={activeTab === "done"}
              onClick={() => setActiveTab("done")}
            />
          </div>

          <div className="flex items-center gap-1">
            {isSearchOpen ? (
              <div className="flex items-center gap-1 bg-neutral-700 rounded px-2 py-1 mr-2">
                <Search size={14} className="text-neutral-500" />
                <input
                  autoFocus
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                  className="bg-transparent border-none text-white px-2 py-1 text-xs w-40 outline-none placeholder-neutral-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="bg-transparent border-none text-neutral-500 cursor-pointer hover:text-white transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <div onClick={() => setIsSearchOpen(true)}>
                <ToolbarButton icon={Search} name="search" />
              </div>
            )}

            <ToolbarButton icon={Filter} name="filter" />
            <ToolbarButton icon={ArrowUpDown} name="sort" />
            <ToolbarButton icon={Maximize2} name="expand" />
            <ToolbarButton icon={MoreHorizontal} name="more" />

            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent-primary text-white text-xs font-medium cursor-pointer hover:bg-accent-hover transition-colors ml-2"
              onClick={handleAddBlankTask}
            >
              New
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-transparent">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isEditing={editingId === task.id}
              editText={editText}
              onToggle={() => handleToggleTask(task.id)}
              onEdit={() => handleStartEdit(task)}
              onEditChange={setEditText}
              onEditSave={handleSaveEdit}
              onEditKeyDown={handleEditKeyDown}
              onDelete={() => handleDeleteTask(task.id)}
            />
          ))}

          {/* Add New Task Input */}
          <div className="flex items-center gap-3 py-3 px-0 text-text-tertiary">
            <Plus size={14} />
            <input
              className="flex-1 bg-transparent border-none text-text-primary text-sm outline-none placeholder-neutral-600"
              placeholder="New task"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleNewTaskKeyDown}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default TaskList;
