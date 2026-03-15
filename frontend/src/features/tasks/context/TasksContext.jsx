/**
 * Tasks Context - State Management
 * 
 * File: frontend/src/features/tasks/context/TasksContext.jsx
 * 
 * Mục đích: Quản lý state toàn bộ tasks (tasks list, loading, error, filter)
 * tương tự pattern WorkspaceContext
 * 
 * Pattern: Context API + Provider
 * Docs: React createContext, useContext, Context Provider
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../api/task.api";

/**
 * TasksContext - Context object
 * Được sử dụng bởi useTasksContext hook (hoặc gọi useContext trực tiếp)
 */
const TasksContext = createContext(null);

/**
 * TasksProvider - Wrapper component cung cấp tasks state cho toàn app
 * 
 * Usage:
 * <TasksProvider>
 *   <App />
 * </TasksProvider>
 */
export function TasksProvider({ children }) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'done' | 'pending'

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Filter tasks dựa vào activeFilter
   * - 'all': tất cả tasks (completed = false hoặc true)
   * - 'done': chỉ tasks hoàn thành (completed = true)
   * - 'pending': chỉ tasks chưa hoàn thành (completed = false)
   */
  const getFilteredTasks = useCallback(() => {
    if (activeFilter === "done") {
      return tasks.filter((task) => task.completed === true);
    } else if (activeFilter === "pending") {
      return tasks.filter((task) => task.completed === false);
    }
    return tasks; // 'all'
  }, [tasks, activeFilter]);

  // ========================================
  // API ACTIONS (CRUD)
  // ========================================

  /**
   * Fetch tasks từ backend
   * Gọi: GET /v1/api/tasks
   * 
   * @param {Object} query - Tuỳ chọn: { page, limit, search, completed }
   */
  const fetchTasks = useCallback(async (query = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTasks(query);
      
      // DEBUG: Log response structure
      console.log("API Response:", response);

      /**
       * Response structure: 
       * response.data = { success: true, data: { data: [...], pagination: {...} } }
       * So we need response.data?.data?.data to get tasks array (3 layers)
       */
      const taskList = response.data?.data?.data || [];

      // Safety check: ensure taskList is array
      if (!Array.isArray(taskList)) {
        console.error("Tasks is not array:", taskList);
        setTasks([]);
        return;
      }

      // Map backend format → frontend format
      // Backend: { status: 'DONE' | 'PENDING' | 'IN_PROGRESS', ... }
      // Frontend: { completed: true | false, ... }
      const mappedTasks = taskList.map((task) => ({
        ...task,
        completed: task.status === "DONE",
      }));

      setTasks(mappedTasks);
      setError(null);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      toast.error(`Lỗi khi lấy tasks: ${message}`);
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Tạo task mới
   * POST /v1/api/tasks
   * 
   * @param {string} title - Tiêu đề task
   * @param {Object} otherData - Dữ liệu tuỳ chọn khác
   */
  const addTask = useCallback(
    async (title, otherData = {}) => {
      try {
        const response = await createTask({
          title,
          ...otherData,
        });

        // Extract task data from 3-layer response structure
        const taskData = response.data?.data?.data || response.data?.data || {};
        const newTask = {
          ...taskData,
          completed: taskData.status === "DONE",
        };

        // Thêm task mới vào state
        setTasks((prev) => [newTask, ...prev]);
        toast.success(`Task "${title}" được tạo thành công!`);

        return newTask;
      } catch (err) {
        const message = err.response?.data?.message || err.message;
        setError(message);
        toast.error(`Lỗi khi tạo task: ${message}`);
        console.error("Create task error:", err);
      }
    },
    []
  );

  /**
   * Xóa task
   * DELETE /v1/api/tasks/:id
   * 
   * @param {string} id - Task ID
   */
  const removeTask = useCallback(async (id) => {
    try {
      await deleteTask(id);

      // Xóa task từ state
      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast.success("Task đã xóa!");
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      toast.error(`Lỗi khi xóa task: ${message}`);
      console.error("Delete task error:", err);
    }
  }, []);

  /**
   * Toggle task completed status
   * PATCH /v1/api/tasks/:id với body { completed: true/false }
   * 
   * @param {string} id - Task ID
   * @param {boolean} completed - Trạng thái hoàn thành mới
   */
  const toggleTask = useCallback(async (id, completed) => {
    try {
      const response = await updateTask(id, { completed });

      // Extract task data from 3-layer response structure
      const updatedTaskData = response.data?.data?.data || response.data?.data || {};

      // Cập nhật task trong state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                ...updatedTaskData,
                completed: updatedTaskData.status === "DONE",
              }
            : task
        )
      );

      const statusText = completed ? "hoàn thành" : "chưa hoàn thành";
      toast.success(`Task đã đánh dấu: ${statusText}`);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      toast.error(`Lỗi khi cập nhật task: ${message}`);
      console.error("Toggle task error:", err);
    }
  }, []);

  /**
   * Update task (title, description, etc.)
   * PATCH /v1/api/tasks/:id
   * 
   * @param {string} id - Task ID
   * @param {Object} data - Fields to update
   */
  const updateTaskData = useCallback(async (id, data) => {
    try {
      const response = await updateTask(id, data);

      // Extract task data from 3-layer response structure
      const updatedTaskData = response.data?.data?.data || response.data?.data || {};

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...updatedTaskData,
                completed: updatedTaskData.status === "DONE",
              }
            : task
        )
      );

      toast.success("Task đã cập nhật!");
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      toast.error(`Lỗi khi cập nhật task: ${message}`);
      console.error("Update task error:", err);
    }
  }, []);

  /**
   * Thay đổi bộ lọc hiển thị tasks
   * @param {string} filter - 'all' | 'done' | 'pending'
   */
  const setFilter = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = {
    // State
    tasks: getFilteredTasks(), // Trả về tasks đã filter
    allTasks: tasks, // Tất cả tasks (không filter)
    loading,
    error,
    activeFilter,

    // Methods
    fetchTasks,
    addTask,
    removeTask,
    toggleTask,
    updateTaskData,
    setFilter,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

/**
 * useTasksContext - Hook để sử dụng TasksContext
 * 
 * Usage:
 * const { tasks, addTask, fetchTasks, ... } = useTasksContext();
 * 
 * @returns {Object} Context value với tasks state + methods
 */
export function useTasksContext() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error(
      "useTasksContext phải được sử dụng trong <TasksProvider>"
    );
  }
  return context;
}

export default TasksContext;
