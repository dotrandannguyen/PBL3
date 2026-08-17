# readFrontend.md — Tài liệu phân tích Frontend

> Dự án: TaskNexus — Full-stack productivity app  
> Stack: React 19 + Vite 7 + Tailwind CSS v4 + Socket.io-client + Axios

---

## Mục lục

1. [Hướng đọc code — từ đâu đến đâu](#1-hướng-đọc-code)
2. [Sơ đồ Provider Tree](#2-sơ-đồ-provider-tree)
3. [Entry Points](#3-entry-points)
4. [Routing (react-router-dom v7)](#4-routing)
5. [Shared API Layer](#5-shared-api-layer)
6. [Contexts](#6-contexts)
7. [Layouts](#7-layouts)
8. [Feature: Auth](#8-feature-auth)
9. [Feature: Tasks](#9-feature-tasks)
10. [Feature: Dashboard](#10-feature-dashboard)
11. [Feature: Google Calendar](#11-feature-google-calendar)
12. [Feature: Integrations (Inbox)](#12-feature-integrations-inbox)
13. [Feature: Workspace + Sidebar](#13-feature-workspace--sidebar)
14. [Feature: Settings](#14-feature-settings)
15. [Feature: AI Chat](#15-feature-ai-chat)
16. [Feature: Trash](#16-feature-trash)
17. [Feature: Landing Page](#17-feature-landing-page)
18. [Shared Components](#18-shared-components)
19. [Lý thuyết & Công nghệ](#19-lý-thuyết--công-nghệ)

---

## 1. Hướng đọc code

### Thứ tự khuyến nghị

```
1. src/main.jsx + src/App.jsx         ← App bootstrap, provider wrapping
2. src/router.jsx                     ← Toàn bộ route tree
3. src/shared/api/apiClient.js        ← HTTP client với token/refresh logic
4. src/shared/api/socket.service.js   ← Singleton Socket.io client
5. src/contexts/                      ← Language, Theme
6. src/features/auth/                 ← AuthContext + guards
7. src/layouts/                       ← RootLayout, DashboardLayout
8. src/features/tasks/                ← TasksContext (state trung tâm)
9. src/features/notification-receiver/← Inbox + webhook realtime
10. src/features/workspace/           ← Sidebar + WorkspaceContext
11. src/features/google-calendar/     ← Calendar + DnD
12. src/features/dashboard/           ← Analytics charts
13. src/features/setting/             ← User settings
14. src/features/ai-chat/             ← FloatingChat SSE streaming
15. src/features/trash/               ← Trash management
16. src/features/landing/             ← Marketing page
```

### Pattern chung mỗi feature

```
features/{name}/
  api/           ← API calls (apiClient)
  context/       ← React Context (state + methods)
  hooks/         ← Custom hooks (consume context / local logic)
  components/    ← UI components (dumb / presentational)
  pages/         ← Route-level components (orchestrate)
  utils/         ← Pure helpers
  index.js       ← Re-export public API
```

---

## 2. Sơ đồ Provider Tree

```
main.jsx → <App />
└── TasksProvider              (tasks state, NO useAuth — above router)
    └── RouterProvider
        └── RootLayout
            ├── AuthProvider             (user, accessToken, login/logout)
            └── AppProviders
                ├── LanguageProvider     (t(), lang, setLang)
                └── ThemeProvider        (theme, setTheme)
                    └── <Outlet>
                        │
                        ├─ /              LandingPage
                        ├─ /auth/*        LoginPage | RegisterPage | GoogleCallbackPage
                        └─ ProtectedRoute
                           └── DashboardLayout
                               ├── WorkspaceProvider   (pages, activePage)
                               ├── UnreadInboxProvider (inbox count badge)
                               ├── AccountModalProvider (account modal state)
                               └── SearchModalProvider  (Ctrl+K modal state)
                                   └── DashboardContent
                                       ├── DeadlineToastBridge  (socket → toasts)
                                       ├── Sidebar
                                       ├── <main> <Outlet>
                                       │      ├─ /app         WorkspacePage
                                       │      ├─ /dashboard   DashboardPage
                                       │      ├─ /calendar    CalendarPage
                                       │      ├─ /mail        MailReceiverPage
                                       │      ├─ /settings    SettingsPage
                                       │      └─ /trash       TrashPage
                                       ├── AccountModal
                                       ├── SearchModal
                                       └── FloatingChat
```

---

## 3. Entry Points

### `src/main.jsx`

Điểm khởi động. Mount `<App />` vào `#root` DOM node.

```jsx
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

### `src/App.jsx`

Root component. Bọc `TasksProvider` xung quanh `AppRouter`.

> **Lý do `TasksProvider` ở đây**: `TasksProvider` không gọi `useAuth` nên có thể ở ngoài router. Điều này cho phép component ở bất kỳ đâu trong app truy cập task state mà không cần đặt context quá sâu.

### `src/index.css`

CSS global:

- CSS custom properties (design tokens): `--bg-main`, `--text-primary`, `--accent-primary`, v.v.
- Tailwind base layers: `@layer base`, `@layer components`, `@layer utilities`
- Keyframe animations: `routeFadeIn`, `tooltipIn`, `badgePop`, `backdropIn`, `skeletonShimmer`
- `.landing-root` — scoped overrides cho trang marketing

---

## 4. Routing

### `src/router.jsx`

Dùng `createBrowserRouter` (React Router v7).

| Path                    | Component            | Layout            |
| ----------------------- | -------------------- | ----------------- |
| `/`                     | `LandingPage`        | None (standalone) |
| `/auth/login`           | `LoginPage`          | `AuthLayout`      |
| `/auth/register`        | `RegisterPage`       | `AuthLayout`      |
| `/auth/google-callback` | `GoogleCallbackPage` | None              |
| `/app`                  | `WorkspacePage`      | `DashboardLayout` |
| `/dashboard`            | `DashboardPage`      | `DashboardLayout` |
| `/calendar`             | `CalendarPage`       | `DashboardLayout` |
| `/mail`                 | `MailReceiverPage`   | `DashboardLayout` |
| `/settings`             | `SettingsPage`       | `DashboardLayout` |
| `/trash`                | `TrashPage`          | `DashboardLayout` |
| `*` (catch-all)         | Redirect to `/`      | —                 |

**`ProtectedRoute`**: Nếu `isLoading` → null (chờ). Nếu không auth → redirect `/auth/login`. Else → `<Outlet>`.

---

## 5. Shared API Layer

### `src/shared/api/apiClient.js`

**Axios instance trung tâm** — tất cả API calls đi qua đây.

| Export                    | Mô tả                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `apiClient` (default)     | Axios instance, baseURL = `VITE_API_BASE_URL`, `withCredentials: true` |
| `setInMemoryToken(token)` | Lưu access token trong memory (không localStorage!)                    |
| `getInMemoryToken()`      | Lấy access token                                                       |

**Request interceptor**:

```
Attach Authorization: Bearer <inMemoryAccessToken>
```

**Response interceptor (quan trọng)**:

```
on 401:
  if đang refresh → queue request
  else:
    isRefreshing = true
    POST /auth/refresh (cookie tự đính kèm)
    on success: setInMemoryToken, retry queue, retry original
    on fail: redirect /auth/login?reason=session_expired

on 403: toast.error "Không có quyền"
on 500: toast.error "Server error"
```

**Luồng token refresh**:

```
Request → 401 → isRefreshing? → if no: POST /auth/refresh
                                          → new accessToken
                                          → setInMemoryToken
                                          → retry all queued requests
                                if yes: queue request
```

### `src/shared/api/socket.service.js`

**Singleton Socket.io client** kết nối tới backend.

```js
const socket = io(VITE_API_BASE_URL, { reconnection: true, ... })
const joinedRooms = new Set()  // track để re-join sau reconnect
```

| Method                                                   | Mô tả                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `socketService.joinUserRoom(userId)`                     | Emit `join_user_room` + thêm vào `joinedRooms`. Dedup (không join lại nếu đã join). Auto re-join sau reconnect. |
| `socketService.onEvent(name, cb)`                        | `socket.on(name, cb)` — generic                                                                                 |
| `socketService.offEvent(name, cb)`                       | `socket.off(name, cb)`                                                                                          |
| `socketService.getSocket()`                              | Trả về raw socket instance                                                                                      |
| `socketService.onNewInboxItem(cb)` / `offNewInboxItem()` | Convenience wrapper cho `NEW_INBOX_ITEM`                                                                        |

**Auto reconnect flow**:

```
socket.on('connect', () => {
  joinedRooms.forEach(roomId => socket.emit('join_user_room', roomId))
  // Re-join tất cả rooms sau reconnect
})
```

### `src/shared/api/hooks/useNotificationCenter.js`

**Composite hook** kết hợp `useNotifications` + `useNotificationListener`.

```js
const { notifications, unreadCount, pagination, ... } = useNotificationCenter({
  feed: 'unread' | 'all',
  pageSize: 20
})
```

Logic: DB là source of truth. Socket event → trigger debounced (250ms) API sync. Tránh redundant calls cho pending reads.

### `src/shared/api/hooks/useNotificationListener.js`

Lắng nghe Socket.io events và forward tới callbacks:

| Event lắng nghe                 | Callback             |
| ------------------------------- | -------------------- |
| `NOTIFICATION_CREATED`          | `onNewNotification`  |
| `TASK_EVENT_REMINDER` (legacy)  | `onNewNotification`  |
| `NOTIFICATION_READ`             | `onNotificationRead` |
| `NOTIFICATIONS_MARKED_ALL_READ` | `onAllRead`          |

**Dedup**: Map TTL 2 phút để không gọi callback trùng.

---

## 6. Contexts

### `LanguageContext.jsx`

**Exports**: `LanguageProvider`, `useLanguage`

```jsx
const { lang, setLang, t } = useLanguage();
t("tasks.title"); // → "Công việc" (vi) | "Tasks" (en) | "タスク" (ja)
```

- Persist language → `updateCurrentUser` API khi có `userId`
- `translations.js` chứa flat-key dictionary cho vi/en/ja
- Covers: nav, tasks, calendar, settings, notifications, inbox, landing page

### `ThemeContext.jsx`

**Exports**: `ThemeProvider`, `useTheme`

```jsx
const { theme, setTheme } = useTheme();
// theme: "light" | "dark"
```

- Đặt `data-theme` attribute trên `<html>` element
- CSS vars phản ứng theo `data-theme`
- Persist → `updateCurrentUser` API

### `translations.js`

Flat-key object:

```js
{
  vi: { 'tasks.title': 'Công việc', 'inbox.tab.all': 'Tất cả', ... },
  en: { 'tasks.title': 'Tasks', 'inbox.tab.all': 'All', ... },
  ja: { 'tasks.title': 'タスク', ... }
}
```

---

## 7. Layouts

### `RootLayout.jsx`

Chain: `AuthProvider → LanguageProvider (với userId, onUserUpdate) → ThemeProvider → Outlet → ThemedToaster`

- Gọi `healthCheck()` khi mount để verify backend đang live
- `AppProviders` (internal) render sau khi auth init để Language/Theme có `userId`

### `DashboardLayout.jsx`

Bọc `WorkspaceProvider → UnreadInboxProvider → AccountModalProvider → SearchModalProvider`.

`DashboardContent` (internal component):

- Mount `<DeadlineToastBridge>` (invisible, kết nối socket → toasts)
- Render `<Sidebar>` (sidebar navigation)
- Render `<main>` chứa `<Outlet>` (route content)
- Render `<AccountModal>`, `<SearchModal>`, `<FloatingChat>` (global overlays)

### `AuthLayout.jsx`

Glassmorphism card (frosted glass + blur backdrop) trên `AuthBackground` (animated canvas).

### `AuthBackground.jsx`

Canvas 3D animation: particle ring precessing + sphere wireframe + cursor-follow. Sử dụng `requestAnimationFrame` loop. Respects `prefers-reduced-motion`.

---

## 8. Feature: Auth

### `AuthContext.jsx`

**State trung tâm**:

```js
{
  (user, accessToken, isAuthenticated, isLoading);
}
```

**Methods**:

| Method                        | Mô tả                                                | Side effects                        |
| ----------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `login(credentials)`          | POST `/auth/login` → `persistAuth` → navigate `/app` | setInMemoryToken, localStorage user |
| `loginWithOAuth(data)`        | Từ OAuth callback → `persistAuth` → navigate `/app`  | setInMemoryToken, localStorage user |
| `register(formData)`          | POST `/auth/register` → navigate `/auth/login`       | —                                   |
| `logout()`                    | POST `/auth/logout` → clear state                    | clear token, clear localStorage     |
| `refreshSession()`            | POST `/auth/refresh` → update in-memory token        | setInMemoryToken                    |
| `updateUserInStorage(fields)` | Merge vào user state + localStorage                  | —                                   |

**Silent refresh on mount**:

```js
useEffect(() => {
  POST /auth/refresh  // cookie đính kèm tự động
  → nếu thành công: set user + token (session restored)
  → nếu fail: user = null (cần login)
}, [])
```

**Token storage strategy**:

```
Access token → in-memory (inMemoryAccessToken) — mất khi refresh page
Refresh token → HTTP-only cookie — persist qua page reload
User data → localStorage (non-sensitive display data)
```

### `components/LoginForm.jsx`

Form email/password với:

- Show/hide password toggle
- Error banner
- `SocialButtons` (Google/GitHub/Slack OAuth)
- Calls `useAuth().login`

### `components/RegisterForm.jsx`

Form name/email/password với:

- Live password strength indicator (4 levels: weak → very strong)
- Error banner
- `SocialButtons`

### `pages/google-callback-page.jsx`

Handles OAuth callback — hai mode:

1. **Normal OAuth login**: đọc `?accessToken=&user=`, gọi `loginWithOAuth()` → navigate `/app`
2. **Account linking** (`?mode=link`): gọi `refreshSession()` → show sessionStorage toast → navigate `/settings`

Dùng `handled` ref để tránh StrictMode double-invoke.

---

## 9. Feature: Tasks

### `TasksContext.jsx`

**Provider**: Ở `App.jsx` — trên router, không dùng `useAuth`.

**State**:

```js
{ tasks[], loading, error, activeFilter, pagination: {page, limit, totalItems, totalPages} }
```

**Methods**:

| Method                          | Mô tả                                      | API                         |
| ------------------------------- | ------------------------------------------ | --------------------------- |
| `fetchTasks(query)`             | GET tasks với pagination/filter            | `GET /tasks`                |
| `addTask(title, data)`          | POST + optimistic prepend                  | `POST /tasks`               |
| `addTaskFromAi(taskData)`       | Như `addTask` nhưng gọi được từ AI context | `POST /tasks`               |
| `removeTask(id)`                | Optimistic remove + 5s undo window (toast) | `DELETE /tasks/:id`         |
| `toggleTask(id, completed)`     | Optimistic status flip DONE/PENDING        | `PATCH /tasks/:id`          |
| `updateTaskData(id, data)`      | Optimistic update                          | `PATCH /tasks/:id`          |
| `scheduleTaskData(id, startAt)` | Drag-drop schedule                         | `PATCH /tasks/:id/schedule` |
| `setFilter(filter)`             | Set activeFilter                           | local                       |
| `getFilteredTasks()`            | Filter by activeFilter                     | computed                    |

### `hooks/useTasks.js`

Thin wrapper: `return useTasksContext()`. Centralization point for future logic.

### `hooks/useTaskFilters.js`

Local UI filter/search/sort state (không gọi API):

- `filteredTasks` (memoized)
- `searchQuery`, `sortBy`, `priorityFilter` state
- Whitelist validation cho sort/priority values

### `pages/TaskList.jsx`

**Main task list page** — orchestration heavy:

| Phần          | Mô tả                                                           |
| ------------- | --------------------------------------------------------------- |
| Toolbar       | `TaskToolbar` với filter tabs, search, sort, priority filter    |
| Groups        | 4 nhóm: Overdue (đỏ), Today (xanh), Upcoming (tím), No-deadline |
| Task rows     | `TaskRow` cho mỗi task + inline create row                      |
| Inline create | Priority/date/reminder pickers                                  |
| SlideOver     | `TaskSlideOver` chi tiết task                                   |
| DnD           | `@dnd-kit/core` sensors cho reorder                             |

### `components/TaskRow.jsx`

**Dense row component**:

- Inline title/description editing
- Date picker popover
- Priority flag dropdown
- Reminder dropdown
- Delete với loading state
- DnD drag handle (`useDraggable`) + drop target (`useDroppable`)
- Subtask expand/collapse (level, hasChildren)
- Hover `TaskTooltip`

### `components/TaskSlideOver.jsx`

Slide-in panel chi tiết:

- Edit title/description (auto-save draft tới `sessionStorage`)
- Priority picker
- Start/end date fields
- Validation: past dates, mismatched start-end
- "Mark Done" button

### `api/task.api.js`

| Export                              | Endpoint                               |
| ----------------------------------- | -------------------------------------- |
| `getTasks(query)`                   | `GET /v1/api/tasks`                    |
| `createTask(data)`                  | `POST /v1/api/tasks`                   |
| `updateTask(id, data)`              | `PATCH /v1/api/tasks/:id`              |
| `deleteTask(id)`                    | `DELETE /v1/api/tasks/:id`             |
| `scheduleTask(id, startAt)`         | `PATCH /v1/api/tasks/:id/schedule`     |
| `getInboxTasks(query)`              | `GET /v1/api/tasks/inbox`              |
| `confirmInboxTask(id, workspaceId)` | `POST /v1/api/tasks/:id/confirm-inbox` |
| `getTrashTasks(query)`              | `GET /v1/api/tasks/trash`              |
| `restoreTask(id)`                   | `POST /v1/api/tasks/:id/restore`       |
| `permanentDeleteTask(id)`           | `DELETE /v1/api/tasks/:id/permanent`   |

---

## 10. Feature: Dashboard

### `pages/dashboard-page.jsx`

Analytics page với week/month navigation. Renders:

- `ProgressRing` — completion % ring
- 4 `MetricCard` — KPIs với delta so với kỳ trước
- `BarChart` — daily/weekly tasks bar chart
- `ActivityHeatmap` — GitHub-style heatmap (90 ngày)
- `ProductivityChart` — horizontal bar theo day-of-week
- `SparkLine` — completion trend 14 ngày
- `InsightPanel` — AI-generated text insights
- `WeeklyChart` — weekly comparison

### `hooks/useDashboardOverview.js`

```js
const { data, loading, error, refetch } = useDashboardOverview({
  startDate,
  endDate,
  mode,
});
```

Fetch khi date params thay đổi. `data` shape từ `GET /dashboard/overview`.

### `components/MetricCard.jsx`

KPI card: icon + glow orb, large value, delta badge (+X% vs prev period). Green/red color.

### `components/AnalyticsCharts.jsx`

- `SparkLine`: SVG mini line chart với fill area
- `ProductivityChart`: Horizontal bar per weekday với tooltip

### `components/ActivityHeatmap.jsx`

GitHub-style heatmap. N×7 grid cells, color intensity = `count/maxCount`.

### `components/BarChart.jsx`

Stacked vertical: gray total + accent completed. X-axis auto-format từ ISO date.

### `components/ProgressRing.jsx`

SVG circular ring, blue→green gradient. Animated `stroke-dashoffset`.

### `components/InsightPanel.jsx`

Text insights với severity (critical/warning/positive/info) màu sắc và Lucide icons.

---

## 11. Feature: Google Calendar

### `pages/calendar-page.jsx`

**Complex page** — toàn bộ state local:

- Events list, current date, view mode (month/week)
- DnD event drag-to-reschedule (DnD kit)
- Create/edit/delete event modal
- `?openCreate=` query param để mở tạo event từ notification click
- Nhiều private helpers: `mapApiEventToUiEvent`, `toApiPayload`, `normalizeReminder`, `parseTimeToMins`

### `components/CalendarGrid.jsx`

7×6 month grid. Compute calendar days → render `CalendarDayCell`.

### `components/CalendarDayCell.jsx`

Một ô trong month grid:

- DnD drop target (`useDroppable`)
- `ResizeObserver` đo số rows hiển thị được → "+N more" overflow
- Render `CalendarEvent` per event

### `components/CalendarEvent.jsx`

- `CalendarEventUI` (forwardRef): Pure display button. Multi-day spanning styles (rounded corners on start/end)
- `CalendarEvent`: Wraps với `useDraggable`

### `components/CalendarWeekGrid.jsx`

Hour-by-hour week view (24×7):

- Event column clustering cho overlapping events
- Drag-to-create (mousedown → selection box → create)
- Current time indicator
- Each cell là drop target

### `components/EventModal.jsx`

Create/edit modal — draggable (mousedown header):

- Title, all-day toggle, date, start/end time (15min slots)
- Location, description, 8 color picker, reminder selector
- Validate start < end time

---

## 12. Feature: Integrations (Inbox)

**Mục đích**: Unified inbox hiển thị Gmail + GitHub + Slack items theo thời gian thực.

### Luồng dữ liệu

```
Backend webhook (GitHub/Gmail/Slack)
    ↓ upsert Task to INBOX
    ↓ Socket emit NEW_INBOX_ITEM

Frontend:
  useInboxSocket(userId, callback)
      ↓ nhận NEW_INBOX_ITEM
      ↓ callback → refetch()
      ↓ useIntegrations.fetchIntegrations()
          ↓ Promise.allSettled([getGmailPreview, getGithubPreview, getSlackPreview])
          ↓ getInboxTasks (để lấy isConverted flag)
          ↓ merge → data[] sorted by time
          ↓ setData → render
```

### `hooks/useIntegrations.js`

**State**: `data[], loading, error, connected{gmail, github, slack}`

Fetch flow:

```js
Promise.allSettled([
  integrationAPI.getGmailPreview(), // emails với taskId
  integrationAPI.getGithubPreview(), // issues với taskId
  integrationAPI.getSlackPreview(), // messages với taskId
]);
// + getInboxTasks (để lookup isConverted by taskId)
// Merge → sort by time desc → serialize dates
```

Mỗi item được normalize về shape chung:

```js
{
  id: taskId || `source-${sourceId}`,
  source: 'gmail' | 'github' | 'slack',
  sender, subject, preview, time, link, icon, color,
  status, isConverted,
  itemData  // original raw data
}
```

### `hooks/useInboxSocket.js`

```js
useInboxSocket(userId, onNewItem);
// Effect: joinUserRoom + onEvent('NEW_INBOX_ITEM', handler)
// Cleanup: offEvent (specific handler, không xóa tất cả)
```

Dùng `ref` để giữ callback stable (không re-subscribe khi callback thay đổi).

### `context/UnreadInboxContext.jsx`

Badge count trên sidebar Inbox button:

- Fetch initial count từ `GET /tasks/inbox`
- Increment khi nhận `NEW_INBOX_ITEM` socket
- Reset về 0 khi navigate tới `/mail`

### `pages/mail-receiver-page.jsx`

Orchestration page:

- `useIntegrations()` → unified data
- `useInboxSocket(userId, refetch)` → realtime update
- Filter: all/gmail/github/slack
- Toast khi có item mới
- Đọc `sessionStorage.integrationLinkToast` → toast sau OAuth link

### `components/InboxTabsContainer.jsx`

Tabs: All / Gmail / GitHub / Slack. Filter `data` theo `source`. Skeleton loading.

### `components/MailListItem.jsx`

Gmail-style row:

- Source icon (Mail/Github/Slack)
- Sender, subject, preview, time
- Hover: ExternalLink + "Thêm" button
- "Thêm" → `WorkspacePickerModal` → `confirmInboxTask` → `onStatusChange(taskId, 'PENDING')`
- `isConverted=true` → green "Đã thêm vào task"

### `components/WorkspacePickerModal.jsx`

Chọn workspace trước khi confirm inbox → task. Auto-select nếu chỉ có 1 workspace.

### `api/integration.api.js`

```js
integrationAPI.getGmailPreview(); // GET /integrations/preview/gmail
integrationAPI.getGithubPreview(); // GET /integrations/preview/github
integrationAPI.getSlackPreview(); // GET /integrations/preview/slack
integrationAPI.getGithubRepositories(); // GET /integrations/github/repositories
integrationAPI.setupGithubWebhooks(ids); // POST /integrations/github/setup-webhooks
integrationAPI.disableGithubWebhook(id); // DELETE /integrations/github/webhooks
```

---

## 13. Feature: Workspace + Sidebar

### `context/WorkspaceContext.jsx`

**State**: `pages[], activePage, pendingRenameId, loading, isCreatingWorkspace, expandedIds`

**Methods**:

| Method              | Mô tả                                                        |
| ------------------- | ------------------------------------------------------------ |
| Fetch on auth       | `getWorkspaces()` khi accessToken available                  |
| Auto-create default | Nếu 0 workspaces → tạo "My Workspace" (với StrictMode guard) |
| CRUD operations     | `createWorkspace`, `updateWorkspace`, `deleteWorkspace`      |
| Tree state          | `expandedIds` (Set) persist tới `localStorage`               |

### `components/Sidebar.jsx`

**Collapsible** (state in localStorage) left nav:

| Section    | Content                                                             |
| ---------- | ------------------------------------------------------------------- |
| User menu  | Avatar, tên, dropdown (Profile, Settings, Logout)                   |
| Main nav   | Search (Ctrl+K), Dashboard, Inbox (với badge count), Mail, Calendar |
| Workspaces | `PageItem` list, inline create input                                |
| Bottom     | Settings, Trash                                                     |

Hooks: `useNavigate`, `useLocation`, `useLanguage`, `useUnreadInbox`, `useSearchModal`, `useWorkspace`.

### `panels/inbox/InboxPanel.jsx`

Floating notification panel (slide-in từ sidebar):

- `useNotificationCenter()` — realtime updates
- Mark-as-read, mark-all-read, delete
- Navigate `/calendar?event=` cho event notifications
- Pagination "Load more"

### `panels/settings/SettingsPanel.jsx`

GitHub integration panel:

- List repositories
- Toggle webhook on/off per repo
- Connect/disconnect GitHub

### `search/contexts/SearchModalContext.jsx` + `SearchModal.jsx`

Global search (Ctrl+K/Cmd+K):

- Search workspace pages (local)
- Search tasks (API, debounced)
- Click page → navigate `/app`
- Click task → navigate `/app?task=<id>`

### `components/DeadlineToastBridge.jsx`

**Invisible** bridge component trong DashboardLayout:

- Gọi `socketService.joinUserRoom(userId)` khi mount
- `useNotificationCenter()` để listen
- Map socket events → `sonner` toast notifications
- Dedup cache 10 phút
- Click toast → navigate `/calendar` (events) hoặc `/app` (tasks)

---

## 14. Feature: Settings

### `pages/SettingsPage.jsx`

Settings page với `?section=` URL param. Scroll-spy để sync active section trong sidebar.

### `components/SettingsSidebar.jsx`

Left nav: General, Integrations, Language + Account button.

### `components/sections/GeneralSection.jsx`

- Theme picker (3 visual cards: Default/Dark/Light + ThemePreview)
- Time format selector (12h/24h)
- Timezone selector

### `components/sections/IntegrationsSection.jsx`

Cards cho Gmail, GitHub, Slack:

- Connected status (animated pulse dot + account email)
- Connect → redirect OAuth
- Disconnect → delete integration

### `components/sections/LanguageSection.jsx`

3 flag cards (vi/ja/en). `setLang()` update ngay lập tức.

### `components/sections/NotificationsSection.jsx`

Toggles: email, push, sound, digest. Optimistic update + rollback on error.

### `components/AccountModal.jsx`

Full-screen account modal:

- Avatar upload (base64 encode → PATCH `/user/me`)
- Edit fullName, bio
- Copy user ID
- Keyboard: Escape to close

### `contexts/AccountModalContext.jsx`

Controls `AccountModal` open/close globally.

---

## 15. Feature: AI Chat

### `components/FloatingChat.jsx`

**BYOK AI chatbot** floating widget:

| Feature          | Mô tả                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| API Key          | Stored in `localStorage` (`gemini_api_key`)                                         |
| Model            | `gemini-2.5-flash` / `2.0-flash` / `2.0-flash-lite` (localStorage)                  |
| History          | `sessionStorage` (trong session hiện tại)                                           |
| Streaming        | SSE via native `fetch`                                                              |
| Function Calling | `createTask` → gọi `addTaskFromAi` từ `TasksContext`. `getTasks` → gọi `fetchTasks` |
| Markdown         | `react-markdown` + `remark-gfm`                                                     |
| UI               | Minimize/expand, typing effect, message bubbles                                     |

**SSE Streaming flow**:

```
User sends message
    ↓
streamAiChat(messages, apiKey, model, onChunk, onAction, onDone, onError)
    ↓ POST /ai/chat
    ↓ ReadableStream
    ↓ for each SSE event:
       type='text'   → onChunk(text) → append to streamingMessage
       type='action' → onAction({tool, args, result}) → show action card
       type='done'   → onDone() → finalize message
```

### `api/ai.api.js`

```js
streamAiChat(messages, apiKey, model, callbacks, options);
// Native fetch (không dùng axios — axios không handle ReadableStream tốt)
// Reads in-memory access token via getInMemoryToken()
// SSE parsing: split by \n\n, JSON.parse data field
```

---

## 16. Feature: Trash

### `context/TrashContext.jsx`

**State**: `trashTasks[], loading, error, removingIds` (Set cho exit animations)

**Methods**: `fetchTrashTasks`, `restoreTask`, `permanentDeleteTask`, `bulkRestore`, `bulkPermanentDelete`, `emptyTrash`

### `pages/TrashPage.jsx`

- Multi-select với bulk actions
- "Empty Trash" với confirm modal
- Sort: deleted-at / name / priority
- Filter: Today / 7d / 30d / Older
- Inline search
- Keyboard: `⌘A` select all, `Esc` clear, `Del` delete selected
- Row exit animations (240ms slide-out)

---

## 17. Feature: Landing Page

### `pages/LandingPage.jsx`

Public marketing page với `motion/react` scroll parallax.

**Sections**:

```
Navbar → Hero → SocialProof → Stats → ProductDemo → BentoFeatures
→ UseCases → Integrations → Testimonials → Pricing → FAQ → Footer
```

- `ScrollReveal` wrapper: `motion.div` với `whileInView` + `viewport: {once: true}`
- Các section dùng `motion` staggered animations

---

## 18. Shared Components

### `components/shared/Select.jsx`

Custom dropdown: keyboard nav (↑↓ Enter Esc Tab), outside-click close.

### `components/shared/NavItem.jsx`

Sidebar nav button: icon + label khi expanded, icon only khi collapsed. Badge: số hoặc dot.

### `components/shared/PageItem.jsx`

Workspace tree item: inline rename (double-click hoặc autoStartRename), hover actions (rename/delete), depth indentation, expand/collapse chevron.

### `components/shared/Toggle.jsx`

`role="switch"` animated toggle với spring thumb animation.

### `components/shared/Skeleton.jsx`

Loading placeholders: `Skeleton`, `SkeletonText`, `SkeletonRow`, `SkeletonList`.

### `components/shared/ThemedToaster.jsx`

Wraps Sonner `<Toaster>` với `useTheme()` để sync dark/light mode.

### `components/ui/SocialButtons.jsx`

SVG icons + OAuth buttons cho Google/GitHub/Slack. Redirect tới OAuth URL.

---

## 19. Lý thuyết & Công nghệ

### React 19

**Concurrent Features**: React 19 ổn định `useTransition`, `useDeferredValue` — project chủ yếu dùng các patterns cổ điển nhưng sẵn sàng upgrade.

**StrictMode**: Development mode mount/unmount components hai lần để detect side effects. Project xử lý bằng guards (`handled` ref, `creatingDefaultRef`).

**Custom Hooks Pattern**:

```
Context (state + dispatch)
    ↓
Custom hook (business logic + memoization)
    ↓
Component (UI + events)
```

### React Context + useReducer/useState

**Khi nào dùng Context**: State cần share giữa nhiều component không cùng parent trực tiếp.

**Vấn đề re-render**: Mỗi khi value của Context thay đổi → tất cả consumers re-render. Solution: tách context nhỏ (mỗi concern một context), dùng `useMemo` cho value object, dùng `useCallback` cho functions.

**Pattern trong project**:

```js
const MyContext = createContext(null)
export function MyProvider({ children }) {
  const [state, setState] = useState(...)
  const value = useMemo(() => ({ state, setState }), [state])
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>
}
export function useMyContext() {
  const ctx = useContext(MyContext)
  if (!ctx) throw new Error('Must be inside MyProvider')
  return ctx
}
```

### React Router v7 (createBrowserRouter)

**Data Router API**: `createBrowserRouter` cho phép route-level data loading (loaders/actions) nhưng project dùng theo pattern components tự fetch.

**Outlet pattern**:

```
DashboardLayout (renders Outlet)
    ↑ registered as element
/app → element: <WorkspacePage>  // renders inside Outlet
```

**useSearchParams**: Sync state với URL query params — dùng cho `?section=`, `?task=`, `?openCreate=`.

### Vite 7

**HMR (Hot Module Replacement)**: Update module trong trình duyệt mà không reload full page. Giữ React state.

**Build optimization**:

- Code splitting theo route (dynamic import)
- CSS extraction
- Asset hashing
- `import.meta.env.VITE_*` cho env vars (chỉ prefix VITE\_ mới expose ra client)

**`@vitejs/plugin-react`**: Babel transform cho JSX + Fast Refresh.

### Tailwind CSS v4

**Utility-first CSS**: Không viết CSS class riêng, compose từ utilities.

**v4 features**:

- Oxide engine (Rust-based, nhanh hơn 10×)
- CSS-first config (thay vì `tailwind.config.js`)
- CSS custom properties native

**Design tokens trong project**:

```css
:root {
  --bg-main: #ffffff;
  --text-primary: #1a1a1a;
  --accent-primary: #3b82f6;
  /* ... */
}
[data-theme="dark"] {
  --bg-main: #0f0f10;
  --text-primary: #f2f2f3;
  /* ... */
}
```

**Responsive + dark mode qua data-theme**:

```jsx
<div className="bg-bg-main text-text-primary border border-border-subtle" />
```

### Socket.io Client

**Transport negotiation**: Socket.io tự negotiate WebSocket (preferred) → polling (fallback).

**Room subscription**:

```js
// Client
socket.emit("join_user_room", userId);

// Server
socket.join(userId);
io.to(userId).emit("EVENT", data);
```

**Reconnection**: Auto-reconnect với `reconnectionDelay = 1000ms`, `reconnectionAttempts = 5`. Project re-joins rooms sau reconnect.

**Event deduplication**: `useNotificationListener` dùng Map với TTL để không fire callback trùng khi Slack retry hay network hiccups.

### Axios + Interceptors (apiClient)

**Interceptor pattern**:

```
Request interceptor → attach token
Response interceptor → handle 401 (refresh), 403, 500
```

**Token refresh queue**:

```js
let isRefreshing = false;
let failedQueue = [];

// on 401:
if (isRefreshing) {
  return new Promise((resolve, reject) =>
    failedQueue.push({ resolve, reject }),
  );
}
isRefreshing = true;
// ... POST /auth/refresh ...
// on success: processQueue(null, newToken), isRefreshing = false
// retry original request
```

### DnD Kit (`@dnd-kit`)

**Architecture**:

```
DndContext (top-level)
├── Sensor (mouse/touch/keyboard)
├── useDraggable(id)  → drag source
├── useDroppable(id)  → drop target
└── DragOverlay       → clone theo cursor
```

**Calendar drag-drop**:

```
Drag CalendarEvent → onDragEnd → update event date → PATCH /events/:id
```

**Task reorder**:

```
Drag TaskRow → DnD sortable → update task order
```

### SSE (Server-Sent Events) — AI Chat

**SSE protocol**:

```
HTTP Response headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache

Body format:
  data: {"type":"text","text":"Hello"}\n\n
  data: {"type":"action","tool":"createTask","result":{...}}\n\n
  data: [DONE]\n\n
```

**Client parse**:

```js
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = new TextDecoder().decode(value);
  // parse SSE lines
}
```

**Tại sao không dùng WebSocket cho AI**: SSE đủ cho stream one-way (server → client). WebSocket cần two-way.

### motion/react (Framer Motion)

**Declarative animations**:

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
```

**whileInView** (scroll-triggered):

```jsx
<motion.section
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
>
```

**Staggered children**:

```jsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0 }, show: { opacity: 1 } }
<motion.ul variants={container} animate="show">
  <motion.li variants={item} />
```

### Sonner (Toast Notifications)

```js
toast.success("Message", { position: "bottom-right", duration: 4000 });
toast.error("Error message");
toast.success("Task created", { description: "Additional detail" });
```

**Stacking**: Sonner tự stack và expire toasts. Project dùng `<ThemedToaster>` để đồng bộ dark/light.

### BYOK (Bring Your Own Key) Pattern — AI

User tự cung cấp Gemini API key. Lợi ích:

- Backend không chịu chi phí API calls
- User control rate limit của riêng họ
- Privacy: key không lưu server

Implementation:

```
Frontend: apiKey lưu localStorage
API call: gửi qua header x-gemini-key
Backend: đọc từ header, khởi tạo GoogleGenAI(apiKey)
```

---

## NPM Dependencies Tóm tắt

| Package                | Version  | Vai trò                       |
| ---------------------- | -------- | ----------------------------- |
| `react`                | ^19.2.0  | UI library                    |
| `react-dom`            | ^19.2.0  | DOM rendering                 |
| `react-router-dom`     | ^7.12.0  | Client-side routing           |
| `axios`                | ^1.13.6  | HTTP client với interceptors  |
| `socket.io-client`     | ^4.8.3   | WebSocket realtime            |
| `@dnd-kit/core`        | ^6.3.1   | Drag-and-drop primitives      |
| `@dnd-kit/sortable`    | ^10.0.0  | Sortable DnD                  |
| `@dnd-kit/utilities`   | ^3.2.2   | DnD helpers                   |
| `tailwindcss`          | ^4.1.18  | Utility-first CSS             |
| `@tailwindcss/vite`    | ^4.1.18  | Vite plugin cho Tailwind v4   |
| `lucide-react`         | ^0.563.0 | Icon library                  |
| `motion`               | ^12.38.0 | Animation (Framer Motion)     |
| `react-markdown`       | ^10.1.0  | Markdown render trong AI chat |
| `remark-gfm`           | ^4.0.1   | GitHub Flavored Markdown      |
| `sonner`               | ^2.0.7   | Toast notifications           |
| `vite`                 | ^7.2.4   | Build tool + dev server       |
| `@vitejs/plugin-react` | ^5.1.1   | React JSX transform           |
| `eslint`               | ^9.39.1  | Code linting                  |
