# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack productivity app: task manager + Google Calendar + GitHub/Gmail integrations + real-time notifications.

- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 (`frontend/`)
- **Backend**: Node.js (ESM) + Express 5 + Prisma 7 + BullMQ + Socket.io (`backend/`)
- **Database**: PostgreSQL (via Docker) + Redis (for BullMQ queues)

---

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (`cd backend`)
```bash
npm run dev        # nodemon src/server.js → http://localhost:3000
npm start          # node src/server.js (production)
npm run seed       # Run prisma/seed.js
```

### Database
```bash
# Start infrastructure (postgres + redis)
docker-compose up -d postgres redis   # from backend/

# Schema changes
npx prisma generate                    # Regenerate client after schema.prisma changes
npx prisma migrate dev --name <name>   # New migration (dev only)
npx prisma db push                     # Sync schema without migration history (use with caution)
npx prisma studio                      # Visual DB browser
```

### Verify backend is running
```bash
curl http://localhost:3000/health
# Response: { "status": "OK" }
```

### Backend `.env` setup
Copy `backend/.env.example` → `backend/.env`. Required keys:
- `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- `FRONTEND_URL` (CORS origin, default `http://localhost:5173`)

---

## Architecture

### Backend: Clean Architecture

```
server.js → app.js → modules/{module}/{module}.router.js
                                     → {module}.controller.js
                                     → {module}.service.js
                                     → {module}.repository.js (Prisma)
```

Every module follows: **Router → Controller → Service → Repository**. Controllers only call service methods. Services contain business logic and call repositories. Repositories contain all Prisma queries.

Modules: `auth`, `tasks`, `user`, `events`, `integrations`, `notifications`

**Common layer** (`src/common/`):
- `middleware/auth.middleware.js` — `authGuard`: verifies JWT, attaches `req.user`
- `middleware/validationRequest.middleware.js` — Zod schema validation for body/params/query
- `exceptions/` — Custom typed exceptions (`UnauthorizedException`, `NotFoundException`, `ClientException`, etc.) caught by `errorHandler.Middleware.js`
- `realtime/socket.gateway.js` — `emitToUser(userId, eventName, data)` to send Socket.io events to a specific user's room

**API base prefix**: `/v1/api/`

**API response format**:
```json
{ "status": "success", "data": { "data": [...], "pagination": { "page", "limit", "totalItems", "totalPages" } } }
```
Frontend must unwrap `response.data?.data?.data` to get the array.

### Frontend: Provider Tree

```
App.jsx
└── LanguageProvider → ThemeProvider → TasksProvider
    └── AppRouter (createBrowserRouter)
        └── RootLayout         ← AuthProvider lives here
            ├── /auth/*        ← Public routes
            └── ProtectedRoute
                └── DashboardLayout  ← WorkspaceProvider + UnreadInboxProvider
                    ├── /app
                    ├── /calendar
                    ├── /mail
                    ├── /settings
                    └── /trash
```

`TasksProvider` is above the router — it does NOT use `useAuth`. Any hook that calls `useAuth` must render inside `RootLayout` (which is where `AuthProvider` is). Components outside `RootLayout` cannot call `useAuth`.

### Auth Flow (JWT + Refresh Token)

- **Access token**: stored in memory only (inside `AuthContext`)
- **Refresh token**: HTTP-only cookie
- `apiClient.js` has a response interceptor: on 401, queues pending requests, POSTs to `/auth/refresh` (with `credentials: true`), retries queue with new token. On refresh failure → redirect to `/auth/login?reason=session_expired`
- `AuthProvider` silently refreshes on mount (POST `/auth/refresh`)
- OAuth callbacks land at `/auth/google-callback?accessToken=...` (frontend) — `GoogleCallbackPage` calls `loginWithOAuth()` in AuthContext

### Tasks State

`TasksContext` (`features/tasks/context/TasksContext.jsx`) is the single source of truth for tasks. Key exports via `useTasks()` hook:
- `fetchTasks({ page, limit, completed, search })` — pagination is required
- `addTask(title, data)`, `removeTask(id)`, `toggleTask(id, completed)`, `updateTaskData(id, data)`
- `scheduleTaskData(id, startAt)` — PATCH `/tasks/:id/schedule`
- `pagination` — `{ page, limit, totalItems, totalPages }`

Task `status` enum: `INBOX | PENDING | IN_PROGRESS | DONE | ARCHIVED`. Frontend derives `completed` boolean from `status === 'DONE'`.

Task `type` enum: `TODO` (has `dueDate`) vs `SCHEDULED` (has `scheduledAt` + `dueDate` as endAt).

### Notifications (BullMQ + Socket.io)

- Jobs queued to BullMQ queue `notification-reminder` (Redis-backed)
- `notification.worker.js` processes jobs, writes to `Notification` table, emits `NOTIFICATION_CREATED` via Socket.io
- `notification.schedule.js` creates jobs when tasks/events are created/updated
- `notification.recovery.js` re-queues missed jobs on server startup
- Idempotency: `notifKey` unique constraint (`notif:{source}:{sourceId}:{type}`)
- Socket.io rooms: each user joins room named by their `userId` on connect (`socket.on('join_user_room', userId)`)

### Event Model: Two Layers

`Event` has legacy fields (`date: Date`, `time: String`, `endDate`, `endTime`) **and** v2 timestamp fields (`startAt`, `endAt`, `reminderAt`). Both coexist. `linkedTaskId` — if set, the event was derived from a `SCHEDULED` task; the notification scheduler skips the event (task scheduler handles it instead).

### Integration vs Account

- `Account` — OAuth login credential (who can sign in and as whom)
- `Integration` — data sync credential (Gmail watch, GitHub webhooks); tokens stored encrypted via `ENCRYPTION_KEY`

### Naming Conventions

- **Files**: `camelCase` (`auth.service.js`, `taskRow.jsx`)
- **Models/Classes**: `PascalCase` (`TaskActivity`, `UnreadInboxProvider`)
- **Constants**: `UPPER_SNAKE_CASE` (`REMINDER_OFFSETS`, `JWT_SECRET`)
- **DB columns**: `snake_case` via Prisma `@map` (e.g., `dueDate → due_date`)

### i18n

`LanguageContext` provides `t(key)` for translations. All UI strings live in `frontend/src/contexts/translations.js`. Default language from `localStorage`, supports `vi`, `en`, `ja`.
