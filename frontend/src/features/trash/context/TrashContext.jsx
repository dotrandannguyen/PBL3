/**
 * Trash Context - State Management cho Thùng rác
 *
 * File: frontend/src/features/trash/context/TrashContext.jsx
 *
 * Mục đích: Quản lý state của tasks đã xoá (trash)
 * Tách biệt khỏi TasksContext chính để không ảnh hưởng TaskList
 *
 * Pattern: Context API + Provider (giống TasksContext)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { toast } from "sonner";
import {
  getTrashTasks,
  restoreTask as restoreTaskApi,
  permanentDeleteTask as permanentDeleteTaskApi,
} from "../../tasks/api/task.api";

const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const resolveErrorMessage = (err, fallbackMessage) => {
  const serverMessage = err?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (err?.code === "ERR_NETWORK")
    return `Không thể kết nối backend (${DEFAULT_BACKEND_URL}).`;
  if (err?.code === "ECONNABORTED")
    return "Kết nối tới backend quá thời gian chờ.";
  return err?.message || fallbackMessage;
};

const TrashContext = createContext(null);

/**
 * TrashProvider - Wrapper component cung cấp trash state
 */
export function TrashProvider({ children }) {
  // ========================================
  // STATE
  // ========================================
  const [trashTasks, setTrashTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // API ACTIONS
  // ========================================

  /**
   * Fetch danh sách tasks đã xoá
   */
  const fetchTrashTasks = useCallback(async (query = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTrashTasks(query);
      const taskList = response.data?.data?.data || [];

      if (!Array.isArray(taskList)) {
        console.error("Trash tasks is not array:", taskList);
        setTrashTasks([]);
        return;
      }

      setTrashTasks(taskList);
    } catch (err) {
      const message = resolveErrorMessage(
        err,
        "Lấy danh sách thùng rác thất bại."
      );
      setError(message);
      toast.error(`Lỗi: ${message}`);
      console.error("Fetch trash tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Khôi phục task đã xoá
   */
  const restoreTask = useCallback(async (taskId) => {
    try {
      await restoreTaskApi(taskId);

      // Remove task khỏi trash list
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));

      toast.success("Đã khôi phục task thành công!");
      return true;
    } catch (err) {
      const message = resolveErrorMessage(err, "Khôi phục task thất bại.");
      toast.error(`Lỗi: ${message}`);
      console.error("Restore task error:", err);
      return false;
    }
  }, []);

  /**
   * Xoá vĩnh viễn task
   */
  const permanentDeleteTask = useCallback(async (taskId) => {
    try {
      await permanentDeleteTaskApi(taskId);

      // Remove task khỏi trash list
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));

      toast.success("Đã xoá vĩnh viễn task.");
      return true;
    } catch (err) {
      const message = resolveErrorMessage(err, "Xoá vĩnh viễn thất bại.");
      toast.error(`Lỗi: ${message}`);
      console.error("Permanent delete error:", err);
      return false;
    }
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = {
    trashTasks,
    loading,
    error,
    fetchTrashTasks,
    restoreTask,
    permanentDeleteTask,
  };

  return (
    <TrashContext.Provider value={value}>{children}</TrashContext.Provider>
  );
}

/**
 * useTrashContext - Hook để sử dụng TrashContext
 */
export function useTrashContext() {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error("useTrashContext phải được sử dụng trong <TrashProvider>");
  }
  return context;
}

export default TrashContext;
