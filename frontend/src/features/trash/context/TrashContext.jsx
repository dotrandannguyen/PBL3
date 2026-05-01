/**
 * Trash Context — state management cho Thùng rác.
 *
 * File: frontend/src/features/trash/context/TrashContext.jsx
 *
 * Tách biệt khỏi TasksContext chính để không ảnh hưởng TaskList.
 * Hỗ trợ:
 *   - fetch / restore / permanentDelete (single)
 *   - bulkRestore / bulkPermanentDelete / emptyTrash (multi)
 *   - removingIds: track các row đang chạy exit-animation, để UI delay
 *     việc unmount khoảng 240ms cho hiệu ứng slide-out đẹp.
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

const EXIT_ANIM_MS = 240;

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

export function TrashProvider({ children }) {
  const [trashTasks, setTrashTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Set of task IDs currently mid-animation. UI uses this to apply the
  // fade/slide-out class. Removed from `trashTasks` after EXIT_ANIM_MS.
  const [removingIds, setRemovingIds] = useState(() => new Set());

  const markRemoving = useCallback((ids) => {
    setRemovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const finalizeRemove = useCallback((ids) => {
    const idSet = new Set(ids);
    setTrashTasks((prev) => prev.filter((t) => !idSet.has(t.id)));
    setRemovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

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

  const restoreTask = useCallback(
    async (taskId) => {
      try {
        markRemoving([taskId]);
        await restoreTaskApi(taskId);
        // Wait for the exit animation before actually removing the row
        setTimeout(() => finalizeRemove([taskId]), EXIT_ANIM_MS);
        toast.success("Đã khôi phục task.");
        return true;
      } catch (err) {
        // Roll back animation marker on failure
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        const message = resolveErrorMessage(err, "Khôi phục task thất bại.");
        toast.error(`Lỗi: ${message}`);
        console.error("Restore task error:", err);
        return false;
      }
    },
    [markRemoving, finalizeRemove]
  );

  const permanentDeleteTask = useCallback(
    async (taskId) => {
      try {
        markRemoving([taskId]);
        await permanentDeleteTaskApi(taskId);
        setTimeout(() => finalizeRemove([taskId]), EXIT_ANIM_MS);
        toast.success("Đã xoá vĩnh viễn task.");
        return true;
      } catch (err) {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        const message = resolveErrorMessage(err, "Xoá vĩnh viễn thất bại.");
        toast.error(`Lỗi: ${message}`);
        console.error("Permanent delete error:", err);
        return false;
      }
    },
    [markRemoving, finalizeRemove]
  );

  /**
   * Bulk operation runner. Marks all ids as removing, runs the API call for
   * each in parallel via Promise.allSettled, then schedules a single
   * finalize call. Returns the ids that succeeded.
   */
  const runBulk = useCallback(
    async (taskIds, apiFn, onSuccessMsg, onErrorMsg) => {
      if (!taskIds.length) return [];
      markRemoving(taskIds);

      const results = await Promise.allSettled(taskIds.map((id) => apiFn(id)));
      const succeededIds = [];
      const failedIds = [];
      results.forEach((res, idx) => {
        if (res.status === "fulfilled") {
          succeededIds.push(taskIds[idx]);
        } else {
          failedIds.push(taskIds[idx]);
        }
      });

      // Roll back animation marker for failed ids so they stay visible
      if (failedIds.length) {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          failedIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      if (succeededIds.length) {
        setTimeout(() => finalizeRemove(succeededIds), EXIT_ANIM_MS);
        toast.success(`${onSuccessMsg} (${succeededIds.length})`);
      }
      if (failedIds.length) {
        toast.error(`${onErrorMsg} (${failedIds.length})`);
      }

      return succeededIds;
    },
    [markRemoving, finalizeRemove]
  );

  const bulkRestore = useCallback(
    (ids) =>
      runBulk(
        ids,
        restoreTaskApi,
        "Đã khôi phục",
        "Một số task không khôi phục được"
      ),
    [runBulk]
  );

  const bulkPermanentDelete = useCallback(
    (ids) =>
      runBulk(
        ids,
        permanentDeleteTaskApi,
        "Đã xoá vĩnh viễn",
        "Một số task không xoá được"
      ),
    [runBulk]
  );

  const emptyTrash = useCallback(async () => {
    const allIds = trashTasks.map((t) => t.id);
    if (!allIds.length) return [];
    return runBulk(
      allIds,
      permanentDeleteTaskApi,
      "Đã dọn sạch thùng rác",
      "Một số task không xoá được"
    );
  }, [trashTasks, runBulk]);

  const value = {
    trashTasks,
    loading,
    error,
    removingIds,
    fetchTrashTasks,
    restoreTask,
    permanentDeleteTask,
    bulkRestore,
    bulkPermanentDelete,
    emptyTrash,
  };

  return (
    <TrashContext.Provider value={value}>{children}</TrashContext.Provider>
  );
}

export function useTrashContext() {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error("useTrashContext phải được sử dụng trong <TrashProvider>");
  }
  return context;
}

export default TrashContext;
