/**
 * Notification Router - API Routes
 *
 * Base path: /api/notifications
 * Protected: Tất cả endpoints require auth
 *
 * Routes:
 * GET    /                       - Tất cả notifications
 * GET    /unread                - Chỉ unread notifications
 * GET    /count                 - Tổng số unread
 * PATCH  /:id                   - Mark 1 as read
 * PATCH  /bulk/read             - Mark tất cả as read
 * DELETE /:id                   - Xóa 1
 * DELETE /all                   - Xóa tất cả
 */

import express from 'express';
import { notificationController } from './notification.controller.js';
import { authGuard } from '../../common/middleware/index.js';

const router = express.Router();

// Protect tất cả routes
router.use(authGuard);

// GET endpoints
router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/count', notificationController.getUnreadCount);

// PATCH endpoints
router.patch('/bulk/read', notificationController.markAllAsRead);
router.patch('/:id', notificationController.markAsRead);

// DELETE endpoints
router.delete('/all', notificationController.deleteAllNotifications);
router.delete('/:id', notificationController.deleteNotification);

export default router;
