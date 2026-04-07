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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  scheduleTask,
} from "../api/task.api";

const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const resolveTaskApiErrorMessage = (err, fallbackMessage) => {
  const serverMessage = err?.response?.data?.message;
  if (serverMessage) {
    return serverMessage;
  }

  if (err?.code === "ERR_NETWORK") {
    return `Không thể kết nối backend (${DEFAULT_BACKEND_URL}).`;
  }

  if (err?.code === "ECONNABORTED") {
    return "Kết nối tới backend quá thời gian chờ.";
  }

  return err?.message || fallbackMessage;
};

/**
 * TasksContext - Context object
 * Được sử dụng bởi useTasksContext hook (hoặc gọi useContext trực tiếp)
 */
const TasksContext = createContext(null);

const normalizeTask = (task) => ({
  ...task,
  completed:
    typeof task?.completed === "boolean"
      ? task.completed
      : task?.status === "DONE",
});

const restoreTaskAtIndex = (list, task, index) => {
  const next = [...list];
  const safeIndex = Math.max(0, Math.min(index, next.length));
  next.splice(safeIndex, 0, task);
  return next;
};

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
  const pendingDeletesRef = useRef(new Map());

  useEffect(() => {
    return () => {
      for (const pendingDelete of pendingDeletesRef.current.values()) {
        clearTimeout(pendingDelete.timeoutId);
      }
      pendingDeletesRef.current.clear();
    };
  }, []);

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

      setTasks(taskList.map(normalizeTask));
      setError(null);
    } catch (err) {
      const message = resolveTaskApiErrorMessage(err, "Lấy tasks thất bại.");
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
  const addTask = useCallback(async (title, otherData = {}) => {
    try {
      const response = await createTask({
        title,
        ...otherData,
      });

      // Extract task data from 3-layer response structure
      const taskData = response.data?.data?.data || response.data?.data || {};
      const newTask = normalizeTask(taskData);

      // Thêm task mới vào state
      setTasks((prev) => [newTask, ...prev]);
      toast.success(`Task "${title}" được tạo thành công!`);

      return newTask;
    } catch (err) {
      const message = resolveTaskApiErrorMessage(err, "Tạo task thất bại.");
      setError(message);
      toast.error(`Lỗi khi tạo task: ${message}`);
      console.error("Create task error:", err);
      return null;
    }
  }, []);

  /**
   * Xóa task
   * DELETE /v1/api/tasks/:id
   *
   * @param {string} id - Task ID
   */
  const removeTask = useCallback(
    (id) => {
      const targetIndex = tasks.findIndex((task) => task.id === id);
      if (targetIndex === -1) {
        return;
      }

      const deletedTask = tasks[targetIndex];

      setTasks((prev) => prev.filter((task) => task.id !== id));

      const timeoutId = setTimeout(async () => {
        try {
          pendingDeletesRef.current.delete(id);
          await deleteTask(id);
        } catch (err) {
          const message = resolveTaskApiErrorMessage(err, "Xóa task thất bại.");
          setError(message);
          setTasks((prev) =>
            restoreTaskAtIndex(prev, deletedTask, targetIndex),
          );
          toast.error(`Lỗi khi xóa task: ${message}`);
          console.error("Delete task error:", err);
        }
      }, 5000);

      pendingDeletesRef.current.set(id, {
        timeoutId,
        task: deletedTask,
        index: targetIndex,
      });

      toast("Đã xóa task", {
        description: "Bạn có 5 giây để hoàn tác.",
        duration: 5000,
        action: {
          label: "Hoàn tác",
          onClick: () => {
            const pendingDelete = pendingDeletesRef.current.get(id);
            if (!pendingDelete) {
              return;
            }

            clearTimeout(pendingDelete.timeoutId);
            pendingDeletesRef.current.delete(id);
            setTasks((prev) =>
              restoreTaskAtIndex(prev, pendingDelete.task, pendingDelete.index),
            );
            toast.success("Đã hoàn tác xóa task");
          },
        },
      });
    },
    [tasks],
  );

  /**
   * Toggle task completed status
   * PATCH /v1/api/tasks/:id với body { status: 'DONE' | 'PENDING' }
   *
   * @param {string} id - Task ID
   * @param {boolean} completed - Trạng thái hoàn thành mới
   */
  const toggleTask = useCallback(async (id, completed) => {
    try {
      const nextStatus = completed ? "DONE" : "PENDING";
      const response = await updateTask(id, { status: nextStatus });

      // Extract task data from 3-layer response structure
      const updatedTaskData =
        response.data?.data?.data || response.data?.data || {};

      // Cập nhật task trong state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? normalizeTask({ ...task, ...updatedTaskData })
            : task,
        ),
      );
      return true;
    } catch (err) {
      const message = resolveTaskApiErrorMessage(
        err,
        "Cập nhật trạng thái task thất bại.",
      );
      setError(message);
      toast.error(`Lỗi khi cập nhật task: ${message}`);
      console.error("Toggle task error:", err);
      return false;
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
      const payload = { ...data };

      // Compatibility bridge: if caller still passes completed, convert to status.
      if (Object.prototype.hasOwnProperty.call(payload, "completed")) {
        payload.status = payload.completed ? "DONE" : "PENDING";
        delete payload.completed;
      }

      delete payload.completedAt;
      delete payload.scheduledAt;

      const response = await updateTask(id, payload);

      // Extract task data from 3-layer response structure
      const updatedTaskData =
        response.data?.data?.data || response.data?.data || {};

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? normalizeTask({ ...task, ...updatedTaskData })
            : task,
        ),
      );
      return true;
    } catch (err) {
      const message = resolveTaskApiErrorMessage(
        err,
        "Cập nhật task thất bại.",
      );
      setError(message);
      toast.error(`Lỗi khi cập nhật task: ${message}`);
      console.error("Update task error:", err);
      return false;
    }
  }, []);

  /**
   * Schedule task start time
   * PATCH /v1/api/tasks/:id/schedule
   *
   * @param {string} id - Task ID
   * @param {string} startAt - ISO datetime string
   */
  const scheduleTaskData = useCallback(async (id, startAt) => {
    try {
      const response = await scheduleTask(id, { startAt });
      const updatedTaskData =
        response.data?.data?.data || response.data?.data || {};

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? normalizeTask({ ...task, ...updatedTaskData })
            : task,
        ),
      );
      return true;
    } catch (err) {
      const message = resolveTaskApiErrorMessage(
        err,
        "Lên lịch task thất bại.",
      );
      setError(message);
      toast.error(`Lỗi khi lên lịch task: ${message}`);
      console.error("Schedule task error:", err);
      return false;
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
    scheduleTaskData,
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
    throw new Error("useTasksContext phải được sử dụng trong <TasksProvider>");
  }
  return context;
}

export default TasksContext;
