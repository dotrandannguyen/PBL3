/**
 * Task API Client
 *
 * File: frontend/src/features/tasks/api/task.api.js
 * Mục đích: Tập trung tất cả API calls liên quan đến tasks
 *
 * Pattern: Giống auth.api.js - sử dụng axios instance (apiClient)
 * để gọi backend endpoints
 *
 * Docs: "Axios API abstraction pattern", "REST API wrapper"
 */

import apiClient from "../../../utils/apiClient";

/**
 * GET /v1/api/tasks
 *
 * Lấy danh sách tasks với pagination, filter, search
 *
 * @param {Object} query - Tuỳ chọn query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 10)
 *   - completed: 'true' | 'false' (filter by status)
 *   - search: string (search by title)
 *
 * @returns {Promise} Response object:
 *   {
 *     data: {
 *       data: [...tasks],
 *       pagination: { page, limit, totalItems, totalPages }
 *     }
 *   }
 */
export const getTasks = (query = {}) =>
  apiClient.get("/v1/api/tasks", { params: query });

/**
 * GET /v1/api/tasks/:id
 *
 * Lấy chi tiết 1 task cụ thể
 *
 * @param {string} id - Task ID
 * @returns {Promise} Task object
 */
export const getTask = (id) => apiClient.get(`/v1/api/tasks/${id}`);

/**
 * POST /v1/api/tasks
 *
 * Tạo task mới
 *
 * @param {Object} data - Task data:
 *   {
 *     title: string (required),
 *     description?: string,
 *     priority?: 'LOW' | 'MEDIUM' | 'HIGH',
 *     dueDate?: date string
 *   }
 *
 * @returns {Promise} Newly created task object
 */
export const createTask = (data) => apiClient.post("/v1/api/tasks", data);

/**
 * PATCH /v1/api/tasks/:id
 *
 * Update task (title, status, priority, etc.)
 *
 * @param {string} id - Task ID
 * @param {Object} data - Fields to update:
 *   {
 *     title?: string,
 *     completed?: boolean (maps to status: DONE/PENDING),
 *     description?: string,
 *     priority?: 'LOW' | 'MEDIUM' | 'HIGH',
 *     dueDate?: date string
 *   }
 *
 * @returns {Promise} Updated task object
 */
export const updateTask = (id, data) =>
  apiClient.patch(`/v1/api/tasks/${id}`, data);

/**
 * DELETE /v1/api/tasks/:id
 *
 * Xóa task (soft delete - marked as deletedAt)
 *
 * @param {string} id - Task ID
 * @returns {Promise} Confirmation response
 */
export const deleteTask = (id) => apiClient.delete(`/v1/api/tasks/${id}`);
