# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TaskNexus** — full-stack productivity app: task manager + Google Calendar + Gmail/GitHub/Slack integrations + real-time notifications + AI chat assistant + analytics dashboard.

- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 (`frontend/`)
- **Backend**: Node.js (ESM) + Express 5 + Prisma 7 + BullMQ + Socket.io (`backend/`)
- **Database**: PostgreSQL (via Docker) + Redis (BullMQ queues + dashboard caching)

For an exhaustive, file-by-file walkthrough of each layer, see `backend/readBackend.md` and `frontend/readFrontend.md` — this file stays intentionally concise and only covers what changes how you should work in the codebase.

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
- `DATABASE_URL`, `PORT`, `NODE_ENV`
- `JWT_SECRET`, `JWT_EXPIRES`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES`, `ENCRYPTION_KEY` (exactly 32 chars — AES-256-CBC for encrypting OAuth tokens at rest)
- Google OAuth + Gmail watch: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_PROJECT_ID`
- GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- Slack OAuth: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`, `SLACK_SIGNING_SECRET`
- `FRONTEND_URL` (CORS origin, default `http://localhost:5173`), `CLOUDFLARE_URL` (public HTTPS URL webhooks are registered against)
- `REDIS_URL` (BullMQ + dashboard cache)

---

## Architecture

### Backend: Clean Architecture

```
server.js → app.js → modules/{module}/{module}.router.js
                                     → {module}.controller.js
                                     → {module}.service.js
                                     → {module}.repository.js (Prisma)
```

Every module follows: **Router → Controller → Service → Repository**. Controllers only call service methods and never contain business logic. Services orchestrate business logic and call repositories (and external APIs). Repositories contain all Prisma queries — no logic.

Modules: `auth`, `tasks`, `user`, `events`, `integrations`, `notifications`, `dashboard`, `workspaces`, `ai`

**Common layer** (`src/common/`):
- `middleware/auth.middleware.js` — `authGuard`: verifies JWT, attaches `req.user`
- `middleware/validationRequest.middleware.js` — Zod schema validation for body/params/query
- `middleware/rateLimit.middleware.js` — `loginLimiter` (5/15min, key=IP+email), `refreshLimiter` (10/min), `generalAuthLimiter` (10/min)
- `exceptions/` — Custom typed exceptions (`UnauthorizedException`, `NotFoundException`, `ForbiddenException`, `ClientException`, `OptionalException`, `InternalServerException`) caught by `errorHandler.Middleware.js`
- `realtime/socket.gateway.js` — singleton around the Socket.io instance: `setIO(io)`/`getIO()`, `emitToUser(userId, event, data)`, `emitToUserExceptSocket(userId, socketId, event, data)` (used so the tab that triggered a change doesn't also get the echo)
- `utils/encryption.js` — AES-256-CBC encrypt/decrypt for OAuth tokens stored in `Integration`
- `utils/oauthState.js` — `buildOauthState`/`parseOauthState`: base64url JSON `{action, userId, nonce}` embedded in the OAuth `state` param (CSRF protection + login-vs-link disambiguation)

`app.js` captures the raw request body (`req.rawBody`) inside the `express.json()` verify callback — required for HMAC signature verification on the GitHub/Slack webhook routes. Don't remove it when touching body-parsing middleware.

**API base prefix**: `/v1/api/`

**API response format**:
```json
{ "status": "success", "data": { "data": [...], "pagination": { "page", "limit", "totalItems", "totalPages" } } }
```
Frontend must unwrap `response.data?.data?.data` to get the array.

### Frontend: Provider Tree

```
main.jsx → <App />
└── TasksProvider              ← tasks state, does NOT use useAuth — sits above the router
    └── RouterProvider
        └── RootLayout          ← AuthProvider lives here
            ├── /               LandingPage (public)
            ├── /auth/*         LoginPage | RegisterPage | GoogleCallbackPage (public)
            └── ProtectedRoute
                └── DashboardLayout
                    ├── WorkspaceProvider, UnreadInboxProvider
                    ├── AccountModalProvider, SearchModalProvider
                    ├── /app         WorkspacePage (task list)
                    ├── /dashboard   DashboardPage (analytics)
                    ├── /calendar    CalendarPage
                    ├── /mail        MailReceiverPage (unified inbox)
                    ├── /settings    SettingsPage
                    ├── /trash       TrashPage
                    └── FloatingChat (global AI chat overlay)
```

`TasksProvider` is above the router — it does NOT use `useAuth`. Any hook that calls `useAuth` must render inside `RootLayout` (where `AuthProvider` lives). Components outside `RootLayout` cannot call `useAuth`.

Each feature under `frontend/src/features/{name}/` follows: `api/` (apiClient calls) → `context/` (state) → `hooks/` (business logic on top of context) → `components/` (presentational) → `pages/` (route-level orchestration).

### Auth Flow (JWT + Refresh Token)

- **Access token**: stored in memory only (inside `AuthContext`)
- **Refresh token**: HTTP-only cookie, rotated on every refresh (new token + new bcrypt hash in DB)
- `apiClient.js` has a response interceptor: on 401, queues pending requests, POSTs to `/auth/refresh` (with `credentials: true`), retries the queue with the new token. On refresh failure → redirect to `/auth/login?reason=session_expired`
- `AuthProvider` silently refreshes on mount (POST `/auth/refresh`)
- Three OAuth providers, all with the same shape: `GET /auth/{google,github,slack}/url` (login) and `/link-url` (authGuard-protected, links to an existing account). Callbacks land at `/auth/google-callback?accessToken=...` (frontend) — `GoogleCallbackPage` calls `loginWithOAuth()` (login) or `refreshSession()` (link mode, `?mode=link`)
- OAuth `state` param carries `{action, userId, nonce}` via `utils/oauthState.js` to disambiguate login vs. account-linking and prevent CSRF

### Tasks State

`TasksContext` (`features/tasks/context/TasksContext.jsx`) is the single source of truth for tasks. Key exports via `useTasks()` hook:
- `fetchTasks({ page, limit, completed, search })` — pagination is required
- `addTask(title, data)`, `addTaskFromAi(taskData)`, `removeTask(id)` (optimistic + 5s undo toast), `toggleTask(id, completed)`, `updateTaskData(id, data)`
- `scheduleTaskData(id, startAt)` — PATCH `/tasks/:id/schedule` (drag-drop onto calendar)
- `pagination` — `{ page, limit, totalItems, totalPages }`

Task `status` enum: `INBOX | PENDING | IN_PROGRESS | DONE | ARCHIVED`. Frontend derives `completed` boolean from `status === 'DONE'`.

Task `type` enum: `TODO` (has `dueDate`) vs `SCHEDULED` (has `scheduledAt` + `dueDate` as endAt).

`Task.sourceType` (`MANUAL | GMAIL | GITHUB | SLACK`) + `sourceId` make webhook ingestion idempotent — see Integrations below. `Task.isConverted` flags an inbox item that has already been confirmed into a real task, so the webhook path won't re-sync over it.

### Notifications (BullMQ + Socket.io)

- Jobs queued to BullMQ queue `notification-reminder` (Redis-backed), producer/consumer split across `notification.schedule.js` and `notification.worker.js`
- Job IDs are deterministic (`buildJobIdV2`: `"TASK-<id>-TASK_DUE"`, `"EVENT-<id>-EVENT_START"`), so rescheduling is remove-then-readd, never duplicate-add
- `notification.worker.js` resolves the source entity, skips if it's done/deleted, writes to `Notification` (idempotent via unique `notifKey = notif:{source}:{sourceId}:{type}`), and emits `NOTIFICATION_CREATED` via Socket.io
- `notification.recovery.js` runs on server startup to re-queue jobs lost when Redis/the process restarted, and to backfill notifications for anything missed while down
- Socket.io rooms: each user joins a room named by their `userId` on connect (`socket.on('join_user_room', userId)`); the frontend re-joins after reconnects (`socket.service.js` tracks `joinedRooms`)

### Event Model: Two Layers

`Event` has legacy fields (`date: Date`, `time: String`, `endDate`, `endTime`) **and** v2 timestamp fields (`startAt`, `endAt`, `reminderAt`). Both coexist. `linkedTaskId` — if set, the event was derived from a `SCHEDULED` task; the notification scheduler skips the event side (the task scheduler handles it instead) to avoid double-firing.

### Integration vs Account

- `Account` — OAuth login credential (who can sign in and as whom)
- `Integration` — data sync credential (Gmail watch, GitHub webhooks, Slack tokens); tokens stored encrypted via `ENCRYPTION_KEY` (`utils/encryption.js`)

### Webhooks & Unified Inbox

`integration.router.js` exposes public (no `authGuard`) webhook endpoints alongside protected preview/dashboard endpoints:
```
POST /v1/api/integrations/webhook/github   ← GitHub issue events
POST /v1/api/integrations/webhook/gmail    ← Google Pub/Sub push notification
POST /v1/api/integrations/webhook/slack    ← Slack Events API
```
All three respond `200` immediately (before processing) to satisfy the external service's timeout, then verify a signature (`x-hub-signature-256` HMAC-SHA256 for GitHub; `v0=` HMAC-SHA256 over `v0:{timestamp}:{rawBody}` + a 5-minute replay window for Slack, both compared with `crypto.timingSafeEqual`), and funnel into `taskRepository.upsertTaskToInbox(userId, {sourceType, sourceId, ...})` — an upsert keyed on `(userId, sourceId)` that skips already-converted tasks. A genuinely new item also emits `NEW_INBOX_ITEM` over Socket.io, which the frontend's `useInboxSocket` hook uses to live-refresh `/mail`.

### Dashboard (Analytics)

`dashboard.service.js` → `getOverview(userId, {startDate, endDate, mode})` runs ~11 parallel raw-SQL queries (`dashboard.repository.js`, chosen over Prisma for aggregation performance), computes deltas against the previous period, derives text insights (backlog rate, completion trend, low-productivity weekday, lead time), and caches the result in Redis for 5 minutes (`nocache` query param bypasses it).

### AI Chat (Gemini, BYOK)

`ai.service.js` streams over SSE (`Content-Type: text/event-stream`) via `POST /ai/chat`. Bring-your-own-key: the frontend reads a Gemini API key from `localStorage` and sends it as the `x-gemini-key` header (model via `x-gemini-model`) — the backend never stores it. Flow: non-streaming `generateContent()` first to detect a function call (`createTask`/`getTasks` defined in `tools.js`), execute it and stream an `action` SSE event, then `generateContentStream()` for the final answer. The frontend (`FloatingChat.jsx`) parses SSE with native `fetch` (not axios — axios doesn't handle `ReadableStream` well) and wires `createTask`/`getTasks` back into `TasksContext` via `addTaskFromAi`/`fetchTasks`.

### Naming Conventions

- **Files**: `camelCase` (`auth.service.js`, `taskRow.jsx`)
- **Models/Classes**: `PascalCase` (`TaskActivity`, `UnreadInboxProvider`)
- **Constants**: `UPPER_SNAKE_CASE` (`REMINDER_OFFSETS`, `JWT_SECRET`)
- **DB columns**: `snake_case` via Prisma `@map` (e.g., `dueDate → due_date`)

### i18n

`LanguageContext` provides `t(key)` for translations. All UI strings live in `frontend/src/contexts/translations.js`. Default language from `localStorage`, supports `vi`, `en`, `ja`.
