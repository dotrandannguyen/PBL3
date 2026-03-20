/**
 * TaskList Page Component
 *
 * File: frontend/src/features/tasks/pages/TaskList.jsx
 *
 * Mục đích: Hiển thị danh sách tasks từ API, support CRUD operations
 * Refactored: Tách thành sub-components, hooks, và utilities
 */

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Loader } from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import { useTaskFilters } from "../hooks/useTaskFilters";
import TaskToolbar from "../components/TaskToolbar";
import TaskRow from "../components/TaskRow";
import { getTodayDate } from "../utils/dateUtils";

/**
 * TaskList - Hiển thị danh sách tasks từ API
 */
const TaskList = ({ title = "To Do List" }) => {
  const {
    tasks,
    allTasks,
    loading,
    error,
    activeFilter,
    fetchTasks,
    addTask,
    removeTask,
    toggleTask,
    updateTaskData,
    setFilter,
  } = useTasks();

  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
    priorityFilter,
    setPriorityFilter,
    isPriorityFilterOpen,
    setIsPriorityFilterOpen,
    filteredTasks,
  } = useTaskFilters(tasks);

  const [newTaskText, setNewTaskText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [deletingId, setDeletingId] = useState(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const priorityDropdownRef = useRef(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Click outside detection for priority dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target)
      ) {
        setShowPriorityDropdown(false);
      }
    }

    if (showPriorityDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPriorityDropdown]);

  const handleAddBlankTask = async () => {
    if (!newTaskText.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    try {
      const today = getTodayDate();
      await addTask(newTaskText, { dueDate: today, priority: newTaskPriority });
      setNewTaskText("");
      setNewTaskPriority("MEDIUM");
      toast.success("Task created successfully");
    } catch (err) {
      toast.error("Failed to create task");
      console.error(err);
    }
  };

  const handleToggleTask = async (id, currentCompleted) => {
    await toggleTask(id, !currentCompleted);
  };

  const handleDeleteTask = async (id) => {
    setDeletingId(id);
    try {
      await removeTask(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.title || task.text);
    setEditPriority(task.priority || "MEDIUM");

    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      setEditDate(`${year}-${month}-${day}`);
    } else {
      setEditDate(getTodayDate());
    }
  };

  const handleSaveEdit = async () => {
    if (editingId && editText.trim()) {
      try {
        await updateTaskData(editingId, { title: editText });
        toast.success("Task updated");
        setEditingId(null);
        setEditText("");
        setEditDate("");
      } catch (err) {
        toast.error("Failed to update task");
        console.error(err);
      }
    }
  };

  const handleDateChange = async (newDate) => {
    if (editingId) {
      try {
        await updateTaskData(editingId, { dueDate: newDate });
        toast.success("Date updated");
      } catch (err) {
        toast.error("Failed to update date");
        console.error(err);
      }
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    setEditPriority(newPriority);
    if (taskId) {
      try {
        await updateTaskData(taskId, { priority: newPriority });
        toast.success("Priority updated");
      } catch (err) {
        toast.error("Failed to update priority");
        console.error(err);
      }
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditText("");
      setEditDate("");
    }
  };

  const handleNewTaskKeyDown = (e) => {
    if (e.key === "Enter") {
      handleAddBlankTask();
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pt-10 pb-10">
      <div className="max-w-3xl mx-auto px-15 py-0">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary">{title}</h1>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
            ⚠️ {error}
            <button
              onClick={() => fetchTasks()}
              className="ml-2 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        <TaskToolbar
          allTasks={allTasks}
          activeFilter={activeFilter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onSearchOpenChange={setIsSearchOpen}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          isPriorityFilterOpen={isPriorityFilterOpen}
          onPriorityFilterOpenChange={setIsPriorityFilterOpen}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isSortOpen={isSortOpen}
          onSortOpenChange={setIsSortOpen}
          onAddNewTask={handleAddBlankTask}
          loading={loading}
        />

        {loading && !tasks.length && (
          <div className="flex items-center justify-center py-20">
            <Loader size={32} className="animate-spin text-text-tertiary" />
          </div>
        )}

        <div className="bg-transparent">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isEditing={editingId === task.id}
                editText={editText}
                editDate={editDate}
                editPriority={editPriority}
                onToggle={() => handleToggleTask(task.id, task.completed)}
                onEdit={() => handleStartEdit(task)}
                onEditChange={setEditText}
                onEditSave={handleSaveEdit}
                onEditKeyDown={handleEditKeyDown}
                onDelete={() => handleDeleteTask(task.id)}
                onDateChange={handleDateChange}
                onPriorityChange={(priority) =>
                  handlePriorityChange(task.id, priority)
                }
                isDeleting={deletingId === task.id}
              />
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-text-tertiary text-sm">No tasks yet</p>
            </div>
          )}

          {!loading && (
            <div className="flex items-center gap-3 py-3 px-0 text-text-tertiary">
              <Plus size={14} />
              <input
                className="flex-1 bg-transparent border-none text-text-primary text-sm outline-none placeholder-neutral-600"
                placeholder="New task"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleNewTaskKeyDown}
              />
              <div ref={priorityDropdownRef} className="relative">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs border border-border-subtle bg-white/5 cursor-pointer hover:bg-white/10 focus:outline-none focus:border-accent-primary transition-colors ${
                    newTaskPriority === "HIGH"
                      ? "text-red-400"
                      : newTaskPriority === "MEDIUM"
                        ? "text-yellow-400"
                        : "text-blue-400"
                  }`}
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  title="Task priority"
                >
                  {newTaskPriority}
                </button>
                {showPriorityDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-bg-sidebar border border-border-subtle rounded shadow-lg p-1 text-xs z-20 w-max">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("LOW");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block text-left px-3 py-1.5 hover:bg-white/5 rounded whitespace-nowrap ${
                        newTaskPriority === "LOW"
                          ? "bg-white/10 text-blue-400"
                          : "text-blue-400"
                      }`}
                    >
                      Low
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("MEDIUM");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block text-left px-3 py-1.5 hover:bg-white/5 rounded whitespace-nowrap ${
                        newTaskPriority === "MEDIUM"
                          ? "bg-white/10 text-yellow-400"
                          : "text-yellow-400"
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskPriority("HIGH");
                        setShowPriorityDropdown(false);
                      }}
                      className={`block text-left px-3 py-1.5 hover:bg-white/5 rounded whitespace-nowrap ${
                        newTaskPriority === "HIGH"
                          ? "bg-white/10 text-red-400"
                          : "text-red-400"
                      }`}
                    >
                      High
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default TaskList;
