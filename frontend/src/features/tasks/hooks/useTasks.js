/**
 * useTasks Hook - Custom Hook Wrapper
 *
 * File: frontend/src/features/tasks/hooks/useTasks.js
 *
 * Mục đích: Wrapper trên useTasksContext để dễ sử dụng trong components
 * Có thể thêm logic phụ vào đây (logging, caching, etc.)
 *
 * Pattern: Custom React Hook composition
 * Docs: "Custom React Hooks", "Hook composition"
 */

import { useTasksContext } from "../context/TasksContext";

/**
 * useTasks - Custom hook wrapper cho TasksContext
 *
 * Usage:
 * const {
 *   tasks,        // Danh sách tasks (đã filter theo activeFilter)
 *   allTasks,     // Tất cả tasks (không filter)
 *   loading,      // Boolean - đang fetch?
 *   error,        // Error message hoặc null
 *   activeFilter, // 'all' | 'done' | 'pending'
 *
 *   // Methods
 *   fetchTasks,   // Fetch tasks từ API
 *   addTask,      // Tạo task mới
 *   removeTask,   // Xóa task
 *   toggleTask,   // Toggle completed status
 *   updateTaskData, // Update task data
 *   setFilter,    // Đổi active filter
 * } = useTasks();
 */
export function useTasks() {
  const context = useTasksContext();

  return {
    // State
    tasks: context.tasks,
    allTasks: context.allTasks,
    loading: context.loading,
    error: context.error,
    activeFilter: context.activeFilter,

    // Methods
    fetchTasks: context.fetchTasks,
    addTask: context.addTask,
    removeTask: context.removeTask,
    toggleTask: context.toggleTask,
    updateTaskData: context.updateTaskData,
    setFilter: context.setFilter,
  };
}

export default useTasks;
