# readBackend.md — Tài liệu phân tích Backend

> Dự án: TaskNexus — Full-stack productivity app  
> Stack: Node.js (ESM) + Express 5 + Prisma 7 + BullMQ + Socket.io + PostgreSQL + Redis

---

## Mục lục

1. [Hướng đọc code — từ đâu đến đâu](#1-hướng-đọc-code)
2. [Sơ đồ kiến trúc tổng thể](#2-sơ-đồ-kiến-trúc)
3. [Entry Points: server.js + app.js](#3-entry-points)
4. [Config: database.js + redis.js](#4-config)
5. [Module: Auth](#5-module-auth)
6. [Module: Tasks](#6-module-tasks)
7. [Module: Events](#7-module-events)
8. [Module: Notifications](#8-module-notifications)
9. [Module: Integrations (GitHub / Gmail / Slack)](#9-module-integrations)
10. [Module: User](#10-module-user)
11. [Module: Dashboard (Analytics)](#11-module-dashboard)
12. [Module: Workspaces](#12-module-workspaces)
13. [Module: AI (Gemini)](#13-module-ai)
14. [Common Layer](#14-common-layer)
15. [Database Schema (Prisma)](#15-database-schema)
16. [Lý thuyết & Công nghệ](#16-lý-thuyết--công-nghệ)

---

## 1. Hướng đọc code

### Thứ tự khuyến nghị khi đọc backend

```
1. prisma/schema.prisma          ← Hiểu toàn bộ cấu trúc dữ liệu trước
2. src/server.js                 ← Điểm khởi động, hiểu lifecycle server
3. src/app.js                    ← Hiểu route map và middleware chain
4. src/common/middleware/        ← Hiểu bảo mật (authGuard, rateLimit, validation)
5. src/common/exceptions/        ← Hiểu error handling pattern
6. src/config/                   ← Hiểu cấu hình DB và Redis
7. Module auth/                  ← Hiểu luồng đăng nhập/JWT/OAuth
8. Module tasks/                 ← Core business logic
9. Module events/                ← Lịch + kết nối task
10. Module notifications/        ← BullMQ queue + Socket.io realtime
11. Module integrations/         ← Webhook GitHub/Gmail/Slack
12. Module dashboard/            ← Analytics với raw SQL
13. Module user/ + workspaces/   ← CRUD đơn giản
14. Module ai/                   ← Gemini SSE streaming
```

### Pattern chung mỗi module

```
router.js → controller.js → service.js → repository.js → Prisma → PostgreSQL
```

- **Router**: Đăng ký route, áp middleware (authGuard, validate, rateLimit)
- **Controller**: Nhận req, gọi service, trả HttpResponse — không có logic business
- **Service**: Logic nghiệp vụ, orchestrate nhiều repository + external calls
- **Repository**: Toàn bộ Prisma queries, không có logic

---

## 2. Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Request                                │
│                              ↓                                      │
│         Express App (app.js)                                        │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  cors → cookieParser → express.json(rawBody) →           │      │
│   │  authGuard → validateRequestMiddleware → Router           │      │
│   └──────────────────────────────────────────────────────────┘      │
│                              ↓                                      │
│   Controller → Service → Repository → Prisma → PostgreSQL          │
│                   ↓                                                 │
│            notification.schedule.js → BullMQ Queue (Redis)         │
│                   ↓                                                 │
│            notification.worker.js → Prisma (write) →               │
│            socket.gateway.js → Socket.io → Client                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│  External Webhooks (Push)   │
│  GitHub → POST /webhook/github  │
│  Gmail  → POST /webhook/gmail   │
│  Slack  → POST /webhook/slack   │
│       ↓                         │
│  webhookController → upsert task → Socket.io emit NEW_INBOX_ITEM  │
└─────────────────────────────┘
```

---

## 3. Entry Points

### `src/server.js`

**Vai trò**: Điểm khởi động duy nhất. Tạo HTTP server, khởi tạo Socket.io, chạy recovery khi startup.

| Thành phần                            | Mô tả                                                               |
| ------------------------------------- | ------------------------------------------------------------------- |
| `http.createServer(app)`              | Bọc Express app thành HTTP server để Socket.io cùng dùng chung port |
| `new Server(server, { cors })`        | Khởi tạo Socket.io với CORS cho frontend                            |
| `setIO(io)`                           | Lưu io instance vào gateway singleton để BullMQ Worker có thể dùng  |
| `app.set('socketio', io)`             | Lưu io vào Express app để webhook controller có thể truy cập        |
| `socket.on('join_user_room', userId)` | Client tự join room = userId của họ để nhận push riêng              |
| `recoverPendingNotifications()`       | Startup: Re-queue lại BullMQ jobs cho task chưa hết hạn             |
| `processMissedNotifications()`        | Startup: Tạo notification cho task đã quá hạn trong 24h qua         |
| `recoverPendingEventNotifications()`  | Startup: Re-queue jobs cho event trong tương lai                    |

### `src/app.js`

**Vai trò**: Cấu hình Express instance. Register middleware và route prefix.

| Route prefix                                 | Module                      |
| -------------------------------------------- | --------------------------- |
| `/v1/api/auth`                               | authRouter                  |
| `/v1/api/user`                               | userRouter                  |
| `/v1/api/tasks`                              | taskRouter                  |
| `/v1/api/integrations`                       | integrationRouter           |
| `/v1/api/events` + `/v1/api/calendar/events` | eventRouter (mounted twice) |
| `/v1/api/notifications`                      | notificationRouter          |
| `/v1/api/ai`                                 | aiRouter                    |
| `/v1/api/workspaces`                         | workspaceRouter             |
| `/v1/api/dashboard`                          | dashboardRouter             |
| `GET /health`                                | `{ status: 'OK' }`          |

**Middleware chain** (theo thứ tự):

```
cors → cookieParser → express.json (với rawBody buffer) → router → errorHandlerMiddleware
```

> **Quan trọng**: `rawBody` được capture trong `express.json verify callback` và gắn vào `req.rawBody`. Cần thiết cho HMAC signature verification ở GitHub/Slack webhook.

---

## 4. Config

### `src/config/database.js`

| Export             | Mô tả                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `prisma` (default) | Singleton `PrismaClient` instance dùng `@prisma/adapter-pg` (Driver Adapters mode) trên `pg.Pool`. |
| `connection()`     | Async function gọi `prisma.$connect()`. Dùng trong `server.js` startup.                            |

> **Lý thuyết**: Prisma 7 với Driver Adapters mode cho phép dùng connection pool native của `pg` thay vì Prisma query engine riêng, giảm overhead và tương thích tốt hơn với serverless.

### `src/config/redis.js`

| Export                 | Mô tả                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `connection` (default) | Singleton `IORedis` instance. Dùng `REDIS_URL` env. Là connection pool cho BullMQ. |

---

## 5. Module: Auth

**Mục đích**: Quản lý đăng ký, đăng nhập, refresh token, OAuth (Google/GitHub/Slack).

### `auth.router.js` — Route map

| Method | Path               | Middleware                              | Handler                   |
| ------ | ------------------ | --------------------------------------- | ------------------------- |
| POST   | `/register`        | validateRequestMiddleware               | `authController.register` |
| POST   | `/login`           | loginLimiter, validateRequestMiddleware | `authController.login`    |
| POST   | `/logout`          | authGuard                               | `authController.logout`   |
| POST   | `/refresh`         | validateRequestMiddleware               | `authController.refresh`  |
| GET    | `/google/url`      | —                                       | `getGoogleUrl`            |
| GET    | `/google/link-url` | authGuard                               | `getGoogleLinkUrl`        |
| GET    | `/google/callback` | —                                       | `googleCallback`          |
| GET    | `/github/url`      | —                                       | `getGithubUrl`            |
| GET    | `/github/link-url` | authGuard                               | `getGithubLinkUrl`        |
| GET    | `/github/callback` | —                                       | `githubCallback`          |
| GET    | `/slack/url`       | —                                       | `getSlackUrl`             |
| GET    | `/slack/link-url`  | authGuard                               | `getSlackLinkUrl`         |
| GET    | `/slack/callback`  | —                                       | `slackCallback`           |

### `auth.service.js`

| Hàm                             | Mô tả                                                                                                             | Gọi bởi                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `generateTokens(user)`          | Ký 2 JWT: access (15m, `JWT_SECRET`) và refresh (7d, `JWT_REFRESH_SECRET`). Returns `{accessToken, refreshToken}` | register, login, refresh, OAuth callbacks |
| `authService.register(dto)`     | Normalize email → check duplicate → bcrypt hash password → createUser → generateTokens → lưu refreshTokenHash     | `authController.register`                 |
| `authService.login(dto)`        | findUserByEmail → bcrypt.compare → check isActive → generateTokens → lưu refreshTokenHash                         | `authController.login`                    |
| `authService.logout(userId)`    | Set refreshTokenHash = null để invalidate session                                                                 | `authController.logout`                   |
| `authService.refreshToken(dto)` | Verify JWT refresh → fetch user → bcrypt.compare stored hash → rotate: generate new pair, save new hash           | `authController.refresh`                  |

### `auth.controller.js`

| Hàm              | Mô tả                                                                                              | Gọi                            |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------ |
| `register`       | Gọi `authService.register`, set HTTP-only refresh cookie, trả 201                                  | `authService.register`         |
| `login`          | Gọi `authService.login`, set cookie                                                                | `authService.login`            |
| `logout`         | Gọi `authService.logout`, xóa cookie                                                               | `authService.logout`           |
| `refresh`        | Đọc `req.cookies.refreshToken`, gọi `authService.refreshToken`, rotate cookie                      | `authService.refreshToken`     |
| `googleCallback` | Exchanges code, gọi `googleService.handleCallback`, set cookie, redirect frontend `/auth/callback` | `googleService.handleCallback` |
| `githubCallback` | Tương tự Google                                                                                    | `githubService.handleCallback` |
| `slackCallback`  | Tương tự Google                                                                                    | `slackService.handleCallback`  |

### `auth.repository.js`

| Hàm                                    | SQL tương đương                                                    |
| -------------------------------------- | ------------------------------------------------------------------ |
| `findUserByEmail(email)`               | `SELECT * FROM users WHERE email = ?`                              |
| `findUserById(id)`                     | `SELECT * FROM users WHERE id = ?`                                 |
| `createUser(data)`                     | `INSERT INTO users (email, password_hash, full_name) VALUES (...)` |
| `updateRefreshTokenHash(userId, hash)` | `UPDATE users SET refresh_token_hash = ? WHERE id = ?`             |

### `google.service.js`

| Hàm                                 | Mô tả                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `getAuthUrl(options)`               | Build Google OAuth2 URL với scopes Gmail + Calendar + UserInfo. Embed state (base64 JSON `{action, userId, nonce}`). |
| `getValidGoogleClient(integration)` | Tạo `oauth2Client` từ token đã decrypt. Register `tokens` event → tự động lưu token mới khi refresh.                 |
| `registerGmailWatch(accessToken)`   | Đăng ký Gmail Pub/Sub watch. Google sẽ push notification khi có email mới.                                           |
| `handleCallback(code, state)`       | Exchange code → fetch userInfo → login hoặc link account → registerGmailWatch → saveWatchData.                       |
| `handleLoginAccount` _(private)_    | Prisma transaction: upsert User, Account, Integration với token encrypted.                                           |
| `handleLinkAccount` _(private)_     | Tương tự nhưng validate email match, check conflict 409.                                                             |

### `github.service.js`

| Hàm                                             | Mô tả                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `getAuthUrl(options)`                           | Build GitHub OAuth URL, scope: `user:email read:user repo`.                                     |
| `handleCallback(code, state)`                   | Exchange code → fetch user + primary email → login or link.                                     |
| `getUserRepositories(accessToken)`              | `GET /user/repos?sort=updated&per_page=100&type=owner`.                                         |
| `setupWebhookForRepo(accessToken, owner, repo)` | `POST /repos/{owner}/{repo}/hooks` trỏ tới `CLOUDFLARE_URL/v1/api/integrations/webhook/github`. |

### `slack.service.js`

| Hàm                           | Mô tả                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `getAuthUrl(options)`         | Build Slack OAuth v2 URL với `user_scope` (channels, DMs, IMs, groups).            |
| `handleCallback(code, state)` | Exchange code qua `oauth.v2.access` → fetch user info → login or link → lưu token. |

---

## 6. Module: Tasks

**Mục đích**: CRUD tasks, quản lý Inbox (từ webhook), Trash (soft delete), liên kết Calendar event.

### `task.router.js` — Route map (tất cả cần `authGuard`)

| Method | Path             | Handler                                  |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/`              | `getAll` — phân trang, filter, search    |
| GET    | `/inbox`         | `getInbox` — tasks từ GMAIL/GITHUB/SLACK |
| GET    | `/trash`         | `getTrash` — soft-deleted tasks          |
| GET    | `/:id`           | `getOne`                                 |
| POST   | `/`              | `create`                                 |
| PATCH  | `/:id`           | `update`                                 |
| PATCH  | `/:id/schedule`  | `markScheduled` — drag-drop calendar     |
| PATCH  | `/:id/confirm`   | `confirmInbox` — chuyển INBOX → PENDING  |
| DELETE | `/:id`           | `delete` — soft delete                   |
| PATCH  | `/:id/restore`   | `restore` — phục hồi từ trash            |
| DELETE | `/:id/permanent` | `permanentDelete`                        |

### `task.service.js`

| Hàm                                                   | Mô tả                                                                                      | Calls                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `getTasks(userId, query)`                             | Phân trang tasks. Map DB row qua `mapTask`.                                                | `taskRepository.findMany`, `countTasks`                                   |
| `getTaskById(userId, taskId)`                         | Lấy 1 task, throw 404.                                                                     | `taskRepository.findById`                                                 |
| `createTask(userId, data)`                            | Tạo task → nếu có `scheduledAt` tạo linked Event → schedule notifications v2.              | `taskRepository.create`, `upsertScheduledTaskEvent`, `scheduleTaskV2`     |
| `updateTask(userId, taskId, data)`                    | Merge update → sync linked event nếu timing/title thay đổi → reschedule notifications.     | `taskRepository.update`, `upsertScheduledTaskEvent`, `rescheduleTaskV2`   |
| `markTaskScheduled(userId, taskId, startAt)`          | Gán `scheduledAt` (từ drag-drop trên calendar). Cập nhật linked event.                     | `upsertScheduledTaskEvent`, `taskRepository.update`, `rescheduleTaskV2`   |
| `deleteTask(userId, taskId)`                          | Soft-delete (MANUAL) hoặc ARCHIVE (GMAIL/GITHUB/SLACK). Xóa linked event. Cancel all jobs. | `taskRepository.softDelete`, `eventRepository.delete`, `cancelTaskJobsV2` |
| `confirmInboxTask(userId, taskId, workspaceId)`       | INBOX → PENDING, `isConverted=true`, gán workspace, schedule notifications.                | `taskRepository.update`, `scheduleTaskV2`                                 |
| `getTrashTasks`, `restoreTask`, `permanentDeleteTask` | Quản lý Trash.                                                                             | `taskRepository.*`                                                        |

**Private helpers trong service**:

- `upsertScheduledTaskEvent(userId, task, scheduledAt, existingEventId)` — Tạo/cập nhật Calendar Event liên kết
- `resolveTaskType(task)` — `SCHEDULED` nếu có `scheduledAt`, else `TODO`
- `hasSchedulingChange(before, after)` — Phát hiện thay đổi time fields để quyết định reschedule

### `task.repository.js`

| Hàm                                                                       | Mô tả                                                                                                                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildTasksWhere(userId, query)`                                          | Prisma `where` clause: `deletedAt=null`, chỉ MANUAL hoặc `isConverted=true`, filter status/search/workspaceId                                                  |
| `findMany(userId, query)`                                                 | SELECT với pagination, orderBy: `scheduledAt ASC nulls last, dueDate ASC nulls last, createdAt DESC`                                                           |
| `countTasks(userId, query)`                                               | COUNT cho pagination                                                                                                                                           |
| `findById`, `create`, `update`, `softDelete`                              | CRUD cơ bản                                                                                                                                                    |
| `findDeleted`, `countDeleted`, `restore`, `hardDelete`, `findDeletedById` | Trash management                                                                                                                                               |
| `findInbox(userId, pagination)`                                           | Tasks với `sourceType IN ['GMAIL','GITHUB','SLACK']`, `deletedAt=null`                                                                                         |
| `upsertTaskToInbox(userId, taskData)`                                     | **Logic quan trọng**: Tìm task theo `(userId, sourceId)`. Nếu `isConverted=true` → skip. Nếu tồn tại → update title/desc. Nếu mới → create với status `INBOX`. |

---

## 7. Module: Events

**Mục đích**: CRUD calendar events, sync với linked tasks (SCHEDULED tasks tạo ra events tự động).

### `event.service.js`

| Hàm                                 | Mô tả                                                                                                              | Calls                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `getEvents(userId, query)`          | Fetch events với pagination/date range/search. Gọi `ensureScheduledTaskEvents` để sync. Enrich với task end times. | `ensureScheduledTaskEvents`, `eventRepository.findMany`, `buildTaskEventEndMap` |
| `getEventById(userId, eventId)`     | Single event + task end payload.                                                                                   | `eventRepository.findById`, `getTaskEventEndPayload`                            |
| `createEvent(userId, dto)`          | Tạo event → `scheduleEventV2`.                                                                                     | `eventRepository.create`, `scheduleEventV2`                                     |
| `updateEvent(userId, eventId, dto)` | Update → reschedule → nếu có `linkedTaskId` sync ngược lại task.                                                   | `eventRepository.update`, `rescheduleEventV2`, `taskService.updateTask`         |
| `deleteEvent(userId, eventId)`      | Cancel jobs → unlink tasks (`scheduledAt=null`) → delete event.                                                    | `cancelEventJobsV2`, `unlinkTasksFromEvent`, `eventRepository.delete`           |

**Event Model — 2 lớp fields**:

```
Legacy:  date (Date), time (String), endDate, endTime
V2:      startAt (DateTime), endAt (DateTime), reminderAt (DateTime)
linkedTaskId: nếu set → event này derive từ SCHEDULED task
```

### `event.repository.js`

| Hàm                             | SQL tương đương                             |
| ------------------------------- | ------------------------------------------- |
| `findMany(userId, options)`     | SELECT với where/skip/take/orderBy          |
| `findById(userId, eventId)`     | SELECT WHERE id AND userId                  |
| `create(userId, eventData)`     | INSERT                                      |
| `update(userId, eventId, data)` | UPDATE WHERE id AND userId (security check) |
| `delete(userId, eventId)`       | DELETE WHERE id AND userId                  |

---

## 8. Module: Notifications

**Mục đích**: Quản lý scheduled notifications qua BullMQ + Socket.io realtime delivery.

### Luồng hoạt động

```
task/event CREATE/UPDATE
    ↓
notification.schedule.js → addNotificationJob(delay)
    ↓
BullMQ Queue "notification-reminder" (Redis)
    ↓  (khi đến giờ)
notification.worker.js
    ↓
prisma.notification.create (idempotent via notifKey unique)
    ↓
socket.gateway.js → io.to(userId).emit('NOTIFICATION_CREATED', data)
    ↓
Frontend nhận realtime
```

### `notification.queue.js`

| Export                                        | Mô tả                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `notificationQueue`                           | BullMQ Queue "notification-reminder". Attempts=3, exponential backoff 5s.                 |
| `addNotificationJob({jobId, payload, delay})` | Thêm job có delay. Nếu đã tồn tại (delayed/waiting) thì remove trước. Tránh duplicate.    |
| `removeJobsByPrefix(prefix)`                  | Xóa tất cả jobs có `jobId` bắt đầu bằng prefix. Dùng khi cancel all reminders cho 1 task. |
| `getActiveJobs()`                             | Trả về danh sách delayed+waiting jobs (để debug/recovery).                                |

### `notification.schedule.js`

| Hàm                                    | Mô tả                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `buildJobIdV2(source, sourceId, type)` | `"TASK-<id>-TASK_DUE"`, `"EVENT-<id>-EVENT_START"` — unique job ID                                                       |
| `scheduleTaskV2(task)`                 | Với TODO task: queue `TASK_DUE` (dueDate), `TASK_REMINDER` (reminderAt). Với SCHEDULED: thêm `TASK_START` (scheduledAt). |
| `rescheduleTaskV2(task)`               | `removeJobsV2` → `scheduleTaskV2`                                                                                        |
| `cancelTaskJobsV2(taskId)`             | Remove tất cả jobs prefix `"TASK-<taskId>"`                                                                              |
| `scheduleEventV2(event)`               | Skip nếu `linkedTaskId` set (task scheduler lo). Queue `EVENT_START`, `EVENT_END`, `EVENT_REMINDER`.                     |
| `rescheduleEventV2(event)`             | `removeJobsV2` → `scheduleEventV2`                                                                                       |
| `cancelEventJobsV2(eventId)`           | Remove tất cả jobs prefix `"EVENT-<eventId>"`                                                                            |

### `notification.worker.js`

**BullMQ Worker** xử lý từng job khi đến giờ:

| Bước                                         | Mô tả                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| 1. `normalizePayload(data)`                  | Chuẩn hóa payload v1 (phase/offset) hoặc v2 (source/type) → unified format   |
| 2. `resolveEntity(source, sourceId)`         | Fetch Task/Event từ DB. Skip nếu task DONE/deleted, event có linkedTaskId    |
| 3. Stale check                               | V1: so sánh expected runAt vs actual. V2: không cần                          |
| 4. `buildMessageForType(item, type, source)` | Build message tiếng Việt cho từng loại notification                          |
| 5. Idempotency                               | `prisma.notification.upsert` với unique `notifKey` — không tạo duplicate     |
| 6. Socket emit                               | `io.to(userId).emit('NOTIFICATION_CREATED', {...})`                          |
| 7. Legacy emit                               | `io.to(userId).emit('TASK_EVENT_REMINDER', ...)` trong giai đoạn chuyển tiếp |

### `notification.service.js`

| Hàm                                            | Mô tả                                                                 | Endpoint                         |
| ---------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `getUnreadNotifications(userId, query)`        | Paginated unread, enriched với event data.                            | `GET /notifications/unread`      |
| `getNotifications(userId, query)`              | All notifications, optional `?isRead` filter.                         | `GET /notifications`             |
| `markAsRead(userId, notifId, socketId)`        | Mark isRead=true → emit `NOTIFICATION_READ` except requesting socket. | `PATCH /notifications/:id`       |
| `markAllAsRead(userId, socketId)`              | Bulk mark read → emit `NOTIFICATIONS_ALL_READ`.                       | `PATCH /notifications/bulk/read` |
| `deleteNotification`, `deleteAllNotifications` | Delete operations.                                                    | DELETE endpoints                 |
| `getUnreadCount(userId)`                       | `{ count: N }` — dùng cho badge sidebar.                              | `GET /notifications/count`       |

### `notification.recovery.js`

Chạy **khi server khởi động** để phục hồi state sau restart:

| Hàm                                  | Mô tả                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `recoverPendingNotifications()`      | Scan tasks với future `dueDate/scheduledAt/reminderAt`, status != DONE/ARCHIVED → `scheduleTaskV2` |
| `processMissedNotifications()`       | Scan tasks quá hạn trong 24h mà chưa có notification → tạo `TASK_DUE` notification trực tiếp       |
| `recoverPendingEventNotifications()` | Scan events với `linkedTaskId=null` và future timestamps → `scheduleEventV2`                       |

---

## 9. Module: Integrations

**Mục đích**: Preview Gmail/GitHub/Slack → INBOX tasks, webhook handlers, Slack dashboard.

### `integration.router.js`

```
PUBLIC (không cần JWT — webhook từ external service):
  POST /webhook/github   → webhookController.handleGithub
  POST /webhook/gmail    → webhookController.handleGmail
  POST /webhook/slack    → webhookController.handleSlack

PROTECTED (cần JWT):
  GET  /preview/gmail                → previewGmail
  GET  /preview/github               → previewGithub
  GET  /preview/slack                → previewSlack
  GET  /dashboard/slack              → getSlackDashboard
  GET  /github/repositories          → getGithubRepositories
  POST /github/setup-webhooks        → setupGithubWebhooks
  DELETE /github/webhooks            → disableGithubWebhook
```

### `webhook.controller.js`

#### `handleGithub`

```
1. res.status(200).send()  ← NGAY LẬP TỨC (GitHub timeout 10s)
2. Verify x-hub-signature-256 (HMAC-SHA256, crypto.timingSafeEqual)
3. Chỉ xử lý event = "issues", action = "opened"|"assigned"
4. Xác định targetUsers (assignee hoặc creator)
5. Lookup Integration(provider='GITHUB', providerUserId=github_user_id)
6. taskRepository.upsertTaskToInbox(userId, {title, sourceType:'GITHUB', sourceId})
7. io.to(userId).emit('NEW_INBOX_ITEM', { task })
```

#### `handleGmail`

```
1. res.status(200).send()
2. Decode base64 Pub/Sub payload → emailAddress
3. Lookup Integration bằng email (findIntegrationByEmailAddress)
4. Tạo OAuth2 client → Query Gmail: is:unread + task keywords
5. getFullEmailDetails + filterEmails
6. upsertTaskToInbox mỗi email
7. CHỈ emit Socket nếu task thực sự MỚI (existingTask check trước)
```

#### `handleSlack` + `verifySlackSignature`

```
verifySlackSignature:
  - Slack signature: v0=HMAC-SHA256(signingSecret, "v0:timestamp:rawBody")
  - Header: x-slack-signature, x-slack-request-timestamp
  - Kiểm tra timestamp ≤ 5 phút (chống replay attack)
  - crypto.timingSafeEqual cho timing-safe comparison

handleSlack:
  1. verifySlackSignature → 401 nếu fail
  2. type='url_verification' → res.json({challenge})  ← Setup verification
  3. res.status(200).send()
  4. type='event_callback', event.type='message', !event.subtype
  5. Lookup Integration(provider='SLACK', providerUserId=slackUserId)
  6. sourceId = "channelId:ts"  ← composite unique key
  7. upsertTaskToInbox
  8. Emit Socket nếu task mới
```

### `integration.service.js`

| Hàm                                           | Mô tả                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `getGmailPreview(userId)`                     | Fetch 10 unread task-keywords emails → `saveTasksToInbox` → return với `taskId`                                                           |
| `getGithubPreview(userId)`                    | Fetch 10 open assigned issues → `saveTasksToInbox` → return với `taskId`                                                                  |
| `getSlackPreview(userId)`                     | **Fetch tất cả channels (DM + public/private)** → history parallel → dedup Map → format messages (id=`channelId:ts`) → `saveTasksToInbox` |
| `getSlackDashboard(userId)`                   | Phân loại messages thành 5 categories: `assignedTasks, mentions, deadlines, filesAndLinks, notifications`                                 |
| `saveTasksToInbox(userId, items, sourceType)` | Map items → `upsertTaskToInbox`. Returns `{[sourceId]: savedTask}` map                                                                    |
| `filterEmails(emails, gmail)`                 | Chỉ giữ emails trong INBOX + có task keywords                                                                                             |
| `getFullEmailDetails(gmail, messageId)`       | Fetch format=full: headers (Subject/From/To/Date), body (text/HTML), attachments                                                          |
| `getGithubRepositories(userId)`               | Fetch repos + merge webhook enabled status từ `integration.webhookData`                                                                   |
| `setupGithubWebhooks(userId, repositoryIds)`  | Install hooks → update `integration.webhookData` JSON                                                                                     |

### `integration.repository.js`

| Hàm                                                     | Mô tả                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `getIntegrationByProvider(userId, provider)`            | `findUnique({ where: { userId_provider: {userId, provider} } })` |
| `findIntegrationByEmailAddress(emailAddress, provider)` | Lookup User by email → return integration[provider]              |

---

## 10. Module: User

**Mục đích**: Quản lý profile user, notification preferences.

### `users.service.js` (Class instance)

| Method                                           | Mô tả                                                                    | Endpoint                               |
| ------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------- |
| `getMe(userId)`                                  | Profile + resolved OAuth provider                                        | `GET /user/me`                         |
| `updateMe(userId, payload)`                      | Update `fullName, avatarUrl, bio, theme, language, timeFormat, timezone` | `PATCH /user/me`                       |
| `getNotificationPreferences(userId)`             | Get/create prefs                                                         | `GET /user/notification-preferences`   |
| `updateNotificationPreferences(userId, payload)` | Update booleans: `email, push, sound, digest`                            | `PATCH /user/notification-preferences` |

### `users.repository.js` (Class instance)

| Method                               | SQL                                     |
| ------------------------------------ | --------------------------------------- |
| `getUserProfileById(userId)`         | SELECT (no password) + include accounts |
| `updateUserProfile(userId, data)`    | UPDATE với select fields                |
| `getNotificationPreferences(userId)` | UPSERT với defaults nếu chưa tồn tại    |

---

## 11. Module: Dashboard

**Mục đích**: Analytics/metrics cho user. Dùng raw SQL để tối ưu performance. Cache Redis 5 phút.

### `dashboard.service.js`

| Hàm                                                        | Mô tả                                                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOverview(userId, {startDate, endDate, mode, nocache})` | **Main handler**: validate dates → check Redis cache → compute previous period → 11 queries song song → compute deltas + growth rates → `generateInsights` → cache 5 min → return |

**`generateInsights(p)`** — phân tích pattern:

- Backlog rate ≥ 40% → cảnh báo
- Pending growth ≥ 20% → cảnh báo
- Completion rate trend
- Low-productivity weekday
- Lead time > 72h
- Healthy state nếu mọi chỉ số tốt

### `dashboard.repository.js` (Raw SQL)

| Hàm                                          | Mô tả                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `getSummaryMetrics(userId, from, to)`        | `totalTasks, completedTasks, pendingTasks, overdueTasks, avgLeadTimeHours` |
| `getDailyCreationCount`                      | Tasks created per day (DATE grouping)                                      |
| `getDailyCompletionCount`                    | Tasks completed per day                                                    |
| `getTimelineData`                            | Per-day breakdown total/done/pending/overdue                               |
| `getOverdueCount`                            | PENDING/IN_PROGRESS với `due_date < now`                                   |
| `getWeeklyComparison(userId, weeksBack=8)`   | Per-week stats                                                             |
| `getMonthlyComparison(userId, monthsBack=6)` | Per-month stats + completionRate                                           |
| `getProductivityByDayOfWeek`                 | `EXTRACT(DOW)` grouping → completion rate per weekday                      |
| `getCompletionTrend(userId, daysBack=14)`    | Daily completion rate (sparkline)                                          |
| `getHeatmapData(userId, daysBack=90)`        | Tasks per day (GitHub heatmap)                                             |

---

## 12. Module: Workspaces

**Mục đích**: CRUD workspace (Notion-like workspace/page list trong sidebar).

### `workspace.service.js`

| Hàm                                                | Endpoint                                  |
| -------------------------------------------------- | ----------------------------------------- |
| `createWorkspace(userId, name, desc, color, icon)` | `POST /workspaces`                        |
| `getWorkspaces(userId)`                            | `GET /workspaces` — orderBy createdAt ASC |
| `updateWorkspace(userId, id, data)`                | `PATCH /workspaces/:id`                   |
| `deleteWorkspace(userId, id)`                      | `DELETE /workspaces/:id`                  |

---

## 13. Module: AI

**Mục đích**: Gemini AI chatbot với Function Calling (tạo/lấy tasks trực tiếp từ chat).

### `ai.service.js`

| Hàm                                                              | Mô tả                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aiService.chatStream(userId, apiKey, modelName, messages, res)` | **3 bước**: (1) `generateContent` non-stream để detect function call → (2) nếu có function call: execute `createTask`/`getTasks`, stream JSON action → (3) `generateContentStream` stream final answer. Dùng SSE (`text/event-stream`). Retry logic `withExponentialBackoff` cho 429/5xx. |

**`tools.js`** — Định nghĩa Gemini Function Declarations:

- `createTask`: params `title`(required), `description`, `dueDate`(ISO 8601), `priority` enum
- `getTasks`: params `completed`(boolean), `limit`(number, max 50)

**Đặc điểm BYOK (Bring Your Own Key)**:

- API key đọc từ header `x-gemini-key`
- Model từ header `x-gemini-model`
- Rate limit: 10 req/min per user

---

## 14. Common Layer

### `middleware/auth.middleware.js` — `authGuard`

```
Authorization: Bearer <token>
    ↓
jwt.verify(token, JWT_SECRET)
    ↓
prisma.user.findUnique({ id, isActive })
    ↓
req.user = { id, email, isActive, role }
    ↓
next()
```

Throws: `UnauthorizedException` (401) nếu token invalid/expired; `ForbiddenException` (403) nếu user inactive.

### `middleware/validationRequest.middleware.js` — `validateRequestMiddleware(schema)`

```js
validateRequestMiddleware({
	body: z.object({ title: z.string() }),
	query: z.object({ page: z.number() }),
});
```

Dùng Zod parse cho từng key (body/query/params). Throws `OptionalException(422, message)` nếu invalid.

### `middleware/rateLimit.middleware.js`

| Export               | Config                            |
| -------------------- | --------------------------------- |
| `loginLimiter`       | 5 req / 15 phút, key = IP + email |
| `refreshLimiter`     | 10 req / 1 phút, key = IP         |
| `generalAuthLimiter` | 10 req / 1 phút, key = IP         |

### `exceptions/` — Custom Error Classes

| Class                     | Status       | Dùng khi                          |
| ------------------------- | ------------ | --------------------------------- |
| `UnauthorizedException`   | 401          | Token invalid, không có token     |
| `ForbiddenException`      | 403          | Đã xác thực nhưng không có quyền  |
| `NotFoundException`       | 404          | Resource không tồn tại            |
| `ClientException`         | Configurable | Base class, business logic errors |
| `OptionalException`       | Configurable | Validation errors                 |
| `InternalServerException` | 500          | Unexpected server errors          |

### `realtime/socket.gateway.js`

| Export                                                  | Mô tả                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `setIO(io)`                                             | Lưu io instance từ server.js vào module singleton                          |
| `getIO()`                                               | Trả về instance (BullMQ Worker dùng để emit)                               |
| `emitToUser(userId, event, data)`                       | `io.to(userId).emit(event, data)`                                          |
| `emitToUserExceptSocket(userId, socketId, event, data)` | `io.to(userId).except(socketId).emit(event, data)` — dùng cho mark-as-read |

### `dtos/httpResponse.dto.js`

```js
new HttpResponse(res).success({ data }); // 200
new HttpResponse(res).created({ data }); // 201
new HttpResponse(res).exception(exception); // exception.status
```

### `utils/encryption.js`

AES-256-CBC encryption cho OAuth tokens trong DB:

```
encrypt(text): IV(16 bytes random) + AES → "hex_iv:hex_encrypted"
decrypt(text): Split → decrypt
ENCRYPTION_KEY env = exactly 32 chars
```

### `utils/oauthState.js`

```
buildOauthState({action, userId}): base64url JSON {action, userId, nonce}
parseOauthState(state): decode → {action, userId}  (CSRF protection)
```

---

## 15. Database Schema

### Entity Relationship Overview

```
User ──< Account (OAuth login accounts)
User ──< Integration (data sync credentials)
User ──< Task ──< TaskActivity
                 Task ──< Task (self-referential subtasks)
                 Task ── Event (linkedTaskId)
User ──< Event
User ──< Tag ──< TaskTag >── Task
User ──< Notification ──> Task
User ──< SyncLog ──> Integration
User ──< Workspace ──< Task
User ── NotificationPreference
```

### Key Design Decisions

| Decision                             | Lý do                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Account` vs `Integration` tách biệt | Account = ai có thể login (OAuth credentials). Integration = data sync (tokens + webhook data). |
| `Task.sourceId` + `sourceType`       | Idempotent webhook: upsert bằng sourceId thay vì tạo duplicate                                  |
| `Task.isConverted`                   | Flag để phân biệt INBOX item đã được confirm thành task thực → không sync lại nữa               |
| `Event.linkedTaskId`                 | SCHEDULED task tự động tạo Event, skip notification scheduling từ event side                    |
| `Notification.notifKey` unique       | Format `notif:{source}:{sourceId}:{type}` — idempotency cho BullMQ worker                       |
| `Integration.webhookData (Json)`     | Lưu GitHub hook IDs, Gmail watch expiration — flexible per provider                             |
| UUID thay Integer cho PK             | `uuid()` — phân tán an toàn, không đoán được sequential ID                                      |
| Soft delete (`deletedAt`)            | Tasks có thể khôi phục từ Trash                                                                 |
| `@map("snake_case")`                 | DB columns snake_case, Prisma fields camelCase                                                  |

---

## 16. Lý thuyết & Công nghệ

### Express.js 5

**Express 5** thêm async error propagation — `async` handler lỗi tự động forward tới `errorHandlerMiddleware` mà không cần `try/catch` explicit.

Pattern middleware:

```
request → [cors] → [cookieParser] → [json] → [authGuard] → [validate] → controller → service → repo
                                                                           ↓
                                                                     errorHandler
```

### JWT (JSON Web Token)

**Access Token** (15 phút):

- Stored in-memory only (không localStorage, không cookie)
- Gửi qua `Authorization: Bearer` header
- Payload: `{userId, email, iat, exp}`

**Refresh Token** (7 ngày):

- Stored trong HTTP-only cookie (`Secure`, `SameSite=None` trên production)
- Hash (bcrypt) lưu trong DB — verify bằng `bcrypt.compare`
- Rotation: mỗi lần refresh → token mới, hash mới trong DB

**Luồng Refresh**:

```
apiClient (frontend): 401 response
    → POST /auth/refresh (tự động, cookie đính kèm)
    → verify JWT signature → bcrypt.compare hash
    → rotate: new token pair, new hash in DB
    → retry original request queue
```

### Prisma ORM

- **Schema-first**: `schema.prisma` → `prisma migrate dev` → type-safe client
- **Driver Adapters** (v7): Dùng `pg.Pool` native thay vì Prisma query engine → connection pool tốt hơn
- **Relations**: Prisma tự handle JOINs qua `include`/`select`
- **Soft delete**: `deletedAt` field + Prisma middleware hoặc manual where clause
- `$$queryRaw` tag: Prisma cho phép raw SQL khi cần aggregation phức tạp (dashboard module)

### BullMQ + Redis

**Architecture**:

```
Producer (notification.schedule.js):
  addNotificationJob({ jobId, payload, delay })
  → notificationQueue.add(name, data, { jobId, delay })
  → Redis ZADD (sorted set, score = runAt timestamp)

Consumer (notification.worker.js):
  new Worker('notification-reminder', processor)
  → Redis ZPOPMIN (lấy job đến hạn)
  → processor(job) xử lý
  → Retry logic: 3 attempts, exponential backoff 5s
```

**Idempotency**:

- `jobId` unique trong queue → không thêm duplicate
- `notifKey` unique trong DB → worker không tạo duplicate notification

**Startup Recovery**:

- Server restart → Redis queue mất → `notification.recovery.js` re-scan DB và re-queue

### Socket.io

**Room-based architecture**:

```
Client connect:
  socket.emit('join_user_room', userId)
  → socket.join(userId)  // room name = userId

Server emit:
  io.to(userId).emit('EVENT_NAME', data)
  // Gửi tới tất cả tabs/devices của user đó
```

**Sự kiện**:
| Event | Hướng | Mô tả |
|---|---|---|
| `join_user_room` | Client → Server | Join private room |
| `NEW_INBOX_ITEM` | Server → Client | Webhook nhận task mới |
| `NOTIFICATION_CREATED` | Server → Client | BullMQ job fired |
| `NOTIFICATION_READ` | Server → Client | Sync read state giữa các tab |
| `NOTIFICATIONS_MARKED_ALL_READ` | Server → Client | Bulk read sync |

**Singleton pattern**:

```
server.js → setIO(io) → ioInstance (module variable)
BullMQ Worker → getIO() → ioInstance → emit
Webhook → app.get('socketio') → io → emit
```

### HMAC Signature Verification (GitHub + Slack)

**GitHub**:

```
Header: x-hub-signature-256 = "sha256=<hex>"
Compute: HMAC-SHA256(GITHUB_WEBHOOK_SECRET, rawBody)
Compare: crypto.timingSafeEqual(Buffer(header), Buffer(digest))
```

**Slack**:

```
Header: x-slack-signature = "v0=<hex>"
Header: x-slack-request-timestamp = <unix_timestamp>
Compute: HMAC-SHA256(SLACK_SIGNING_SECRET, "v0:{timestamp}:{rawBody}")
Replay protection: |now - timestamp| ≤ 300 seconds
```

**`timingSafeEqual`**: Quan trọng — so sánh byte-by-byte với thời gian cố định, tránh timing attack.

### AES-256-CBC Encryption

Dùng để encrypt OAuth access tokens trong DB:

```
Key: 32-byte (ENCRYPTION_KEY env)
IV: 16-byte random per encryption
Cipher: AES-256-CBC
Output: hex(iv):hex(ciphertext)
```

Nếu attacker lấy được DB dump, không thể decrypt tokens nếu không có `ENCRYPTION_KEY`.

### Rate Limiting (express-rate-limit)

- Window-based sliding counter
- Key = IP + email (login) hoặc IP (refresh)
- Prevents brute-force và credential stuffing
- Returns 429 Too Many Requests với `Retry-After` header

### Zod Validation

```js
const schema = z.object({
	body: z.object({
		title: z.string().min(1),
		dueDate: z.string().datetime().optional(),
	}),
});
validateRequestMiddleware(schema);
```

Type-safe, tự convert types (ví dụ query string `"10"` → number `10`).

### Google Cloud Pub/Sub + Gmail Watch

```
1. gmail.users.watch({ topicName: 'projects/{id}/topics/{topic}' })
2. Google gửi push notification tới Pub/Sub topic
3. Pub/Sub subscription push tới HTTPS endpoint
4. Backend nhận POST /webhook/gmail với base64 message
5. Decode → emailAddress → query Gmail API trực tiếp
```

Không dùng Gmail History API (quá phức tạp, HistoryId hết hạn) → thay bằng direct query Gmail API.

### Gemini AI SSE Streaming

```
POST /ai/chat
  → aiService.chatStream
  → Set headers: Content-Type: text/event-stream
  → Step 1: generateContent() để detect function call
  → Step 2 (nếu có function call):
      execute tool (createTask / getTasks)
      res.write(`data: ${JSON.stringify({type:'action',...})}\n\n`)
  → Step 3: generateContentStream()
      for await (chunk) { res.write(`data: ${chunk.text}\n\n`) }
  → res.end()
```

---

## NPM Dependencies Tóm tắt

| Package              | Version  | Vai trò                       |
| -------------------- | -------- | ----------------------------- |
| `express`            | ^5.2.1   | HTTP framework                |
| `@prisma/client`     | ^7.2.0   | ORM type-safe                 |
| `@prisma/adapter-pg` | ^7.2.0   | PostgreSQL Driver Adapter     |
| `pg`                 | ^8.17.1  | Native PostgreSQL driver      |
| `bullmq`             | ^5.73.1  | Redis-backed job queue        |
| `ioredis`            | ^5.10.1  | Redis client                  |
| `socket.io`          | ^4.8.3   | WebSocket server              |
| `jsonwebtoken`       | ^9.0.3   | JWT sign/verify               |
| `bcrypt`             | ^6.0.0   | Password & token hashing      |
| `axios`              | ^1.13.3  | HTTP client cho external APIs |
| `googleapis`         | ^170.1.0 | Google APIs (Gmail, OAuth2)   |
| `@google/genai`      | ^1.51.0  | Gemini AI SDK                 |
| `zod`                | ^4.3.5   | Schema validation             |
| `cors`               | ^2.8.5   | CORS middleware               |
| `cookie-parser`      | ^1.4.7   | Cookie parsing                |
| `dotenv`             | ^17.2.3  | Env variables                 |
| `express-rate-limit` | ^8.4.1   | Rate limiting                 |
| `nodemon`            | ^3.1.11  | Dev hot-reload                |
