# TaskNexus

**TaskNexus** là ứng dụng quản lý công việc (task manager) full-stack, tích hợp Google Calendar, Gmail/GitHub/Slack, thông báo real-time, dashboard phân tích năng suất và trợ lý AI — xây dựng theo Clean Architecture ở cả backend lẫn frontend.

---

## 📋 Nội dung

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
- [Cấu hình môi trường](#-cấu-hình-môi-trường-env)
- [API Overview](#-api-overview)
- [Database Schema](#-database-schema-tóm-tắt)
- [Scripts](#-scripts)
- [Tài liệu chi tiết](#-tài-liệu-chi-tiết)

---

## ✨ Tính năng chính

- ✅ **Task management** — Inbox / Todo / Scheduled, subtasks, tags, soft-delete + Trash (restore/xóa vĩnh viễn)
- 📅 **Calendar** — view tháng/tuần kiểu Google Calendar, kéo-thả để tạo/dời lịch, đồng bộ hai chiều với task đã lên lịch (`SCHEDULED`)
- 📥 **Unified Inbox** — nhận task tự động từ **Gmail**, **GitHub** (issues), **Slack** (tin nhắn/mention) qua webhook, xác thực chữ ký HMAC, cập nhật real-time
- 🔔 **Thông báo real-time** — hàng đợi BullMQ (Redis) lên lịch nhắc việc/sự kiện, đẩy qua Socket.io, tự phục hồi job sau khi server restart
- 📊 **Dashboard phân tích** — tỷ lệ hoàn thành, backlog, thời gian xử lý trung bình, heatmap hoạt động, insight tự động, cache Redis 5 phút
- 🤖 **AI Chat trợ lý** — chatbot Gemini (BYOK — người dùng tự nhập API key), có thể tạo/truy vấn task trực tiếp qua function calling, stream trả lời qua SSE
- 🗂️ **Workspace** — tổ chức task theo workspace kiểu Notion
- 🔐 **Xác thực** — email/password (JWT + refresh token rotation) hoặc OAuth Google/GitHub/Slack, hỗ trợ liên kết nhiều tài khoản
- 🌐 **Đa ngôn ngữ & theme** — Tiếng Việt / English / 日本語, dark/light mode

---

## 🛠 Công nghệ sử dụng

### Backend (`backend/`)

| Nhóm | Công nghệ |
|---|---|
| Runtime | Node.js (ESM) |
| Web framework | Express 5 |
| Database / ORM | PostgreSQL 16 + Prisma 7 (Driver Adapters, `@prisma/adapter-pg`) |
| Queue | BullMQ + Redis (`ioredis`) — nhắc việc/sự kiện |
| Realtime | Socket.io |
| Auth | JWT (`jsonwebtoken`) + `bcrypt`, OAuth2 (Google/GitHub/Slack qua `googleapis` + REST) |
| AI | `@google/genai` (Gemini, streaming + function calling) |
| Validation | Zod |
| Bảo mật khác | `express-rate-limit`, AES-256-CBC token encryption, HMAC webhook signature verification |

### Frontend (`frontend/`)

| Nhóm | Công nghệ |
|---|---|
| UI | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 (Oxide engine, CSS-first config) |
| Routing | React Router v7 (`createBrowserRouter`) |
| HTTP | Axios (interceptor tự refresh token) |
| Realtime | `socket.io-client` |
| Drag & drop | `@dnd-kit` (task reorder, calendar drag) |
| Animation | `motion` (Framer Motion) |
| Khác | `lucide-react`, `sonner` (toast), `react-markdown` + `remark-gfm` (AI chat) |

---

## 📁 Cấu trúc dự án

```
PBL3/
├── CLAUDE.md               # Hướng dẫn kiến trúc cho Claude Code (đọc trước khi sửa code)
├── README.md
├── backend/
│   ├── docker-compose.yml  # PostgreSQL + Redis + backend container
│   ├── prisma/schema.prisma
│   ├── readBackend.md      # Tài liệu phân tích backend chi tiết (từng file, từng hàm)
│   └── src/
│       ├── server.js       # Entry point: HTTP server + Socket.io + recovery jobs
│       ├── app.js          # Express app: middleware chain + route registration
│       ├── config/         # database.js (Prisma singleton), redis.js
│       ├── common/         # middleware, exceptions, dtos, realtime gateway, utils
│       └── modules/        # auth, tasks, user, events, integrations, notifications,
│                            # dashboard, workspaces, ai — mỗi module theo
│                            # router → controller → service → repository
└── frontend/
    ├── src/
    │   ├── router.jsx      # Toàn bộ route tree
    │   ├── layouts/        # RootLayout, DashboardLayout, AuthLayout
    │   ├── contexts/       # LanguageContext, ThemeContext, translations
    │   ├── shared/api/     # apiClient (axios), socket.service, notification hooks
    │   └── features/       # auth, tasks, dashboard, google-calendar,
    │                       # notification-receiver, workspace, setting,
    │                       # ai-chat, trash, landing
    └── readFrontend.md     # Tài liệu phân tích frontend chi tiết
```

Mỗi module backend và mỗi feature frontend đều theo một pattern lặp lại nhất quán — xem [`CLAUDE.md`](CLAUDE.md) để hiểu quy ước chung, hoặc `readBackend.md`/`readFrontend.md` để đọc chi tiết từng file.

---

## 🚀 Bắt đầu nhanh

### Yêu cầu

- Node.js ≥ 20
- Docker + Docker Compose (PostgreSQL 16, Redis 7)
- npm

### 1. Clone & cài dependencies

```bash
git clone <repo-url>
cd PBL3
cd backend && npm install
cd ../frontend && npm install
```

### 2. Cấu hình environment

```bash
cd backend
cp .env.example .env
# Điền các key theo phần "Cấu hình môi trường" bên dưới
```

### 3. Khởi động hạ tầng (PostgreSQL + Redis)

```bash
cd backend
docker-compose up -d postgres redis
```

### 4. Migrate database

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed   # (tùy chọn) seed dữ liệu mẫu
```

### 5. Chạy backend

```bash
npm run dev
# → http://localhost:3000
curl http://localhost:3000/health   # { "status": "OK" }
```

### 6. Chạy frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## ⚙️ Cấu hình môi trường (`.env`)

File `backend/.env` (copy từ `backend/.env.example`):

| Nhóm | Biến |
|---|---|
| Server | `DATABASE_URL`, `PORT`, `NODE_ENV` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES` |
| Bảo mật | `ENCRYPTION_KEY` (đúng 32 ký tự — mã hoá AES-256-CBC token OAuth lưu trong DB) |
| Google OAuth + Gmail | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_PROJECT_ID` |
| GitHub OAuth | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` |
| Slack OAuth | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`, `SLACK_SIGNING_SECRET` |
| Frontend / Webhook | `FRONTEND_URL` (CORS origin, mặc định `http://localhost:5173`), `CLOUDFLARE_URL` (URL public dùng để đăng ký webhook GitHub/Gmail/Slack) |
| Cache & Queue | `REDIS_URL` |

> Google/GitHub/Slack OAuth apps cần được tạo trên console tương ứng với redirect URI trỏ về `{backend}/v1/api/auth/{provider}/callback`.

---

## 🔌 API Overview

Base prefix: **`/v1/api/`**. Tất cả response thành công có dạng:

```json
{ "status": "success", "data": { "data": [...], "pagination": { "page": 1, "limit": 10, "totalItems": 0, "totalPages": 0 } } }
```

| Prefix | Module | Mô tả |
|---|---|---|
| `/auth` | auth | Đăng ký/đăng nhập, refresh token, OAuth Google/GitHub/Slack (login + link account) |
| `/user` | user | Profile, notification preferences |
| `/tasks` | tasks | CRUD task, inbox, trash, schedule, confirm-inbox |
| `/events` + `/calendar/events` | events | CRUD sự kiện lịch |
| `/integrations` | integrations | Webhook Gmail/GitHub/Slack (public), preview, GitHub repo/webhook management |
| `/notifications` | notifications | Danh sách, mark-read, xoá thông báo |
| `/dashboard` | dashboard | Số liệu phân tích năng suất |
| `/workspaces` | workspaces | CRUD workspace |
| `/ai` | ai | Chat AI streaming (SSE) với function calling |
| `/health` | — | Health check (`{ "status": "OK" }`) |

Chi tiết từng endpoint, request/response shape: xem `backend/readBackend.md`.

---

## 🗄️ Database Schema (tóm tắt)

Prisma models chính (`backend/prisma/schema.prisma`), PK là UUID:

| Model | Vai trò |
|---|---|
| `User` | Người dùng, hồ sơ, cấu hình theme/ngôn ngữ |
| `Account` | Credential đăng nhập OAuth (ai có thể login) |
| `Integration` | Credential đồng bộ dữ liệu (Gmail watch, GitHub/Slack token — mã hoá) |
| `Task` | Công việc — hỗ trợ subtask (self-referential), soft delete, liên kết nguồn (`sourceType`/`sourceId`) |
| `Event` | Sự kiện lịch — có thể tự sinh từ `Task` loại `SCHEDULED` qua `linkedTaskId` |
| `Tag` / `TaskTag` | Gắn nhãn task (many-to-many) |
| `TaskActivity` | Lịch sử thay đổi task |
| `Notification` | Thông báo đã tạo (idempotent qua `notifKey`) |
| `NotificationPreference` | Bật/tắt kênh thông báo theo user |
| `SyncLog` | Log đồng bộ từ Integration |
| `AuditLog` | Nhật ký hành động hệ thống |
| `Workspace` | Không gian làm việc chứa task, kiểu Notion |

Lý do thiết kế (Account vs Integration, soft delete, idempotency key...) được giải thích trong `CLAUDE.md` và `backend/readBackend.md`.

---

## 🧪 Scripts

### Backend (`cd backend`)

```bash
npm run dev        # nodemon src/server.js → http://localhost:3000
npm start           # production
npm run seed        # chạy prisma/seed.js
```

### Frontend (`cd frontend`)

```bash
npm run dev         # Vite dev server → http://localhost:5173
npm run build        # production build
npm run lint          # ESLint
npm run preview        # preview production build
```

### Database (`cd backend`)

```bash
docker-compose up -d postgres redis   # hạ tầng
npx prisma generate                    # sync Prisma client
npx prisma migrate dev --name <name>   # migration (dev only)
npx prisma studio                      # DB browser
```

---

## 📚 Tài liệu chi tiết

| Tài liệu | Nội dung |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Kiến trúc, quy ước, các flow quan trọng — đọc trước khi thay đổi code |
| [`backend/readBackend.md`](backend/readBackend.md) | Phân tích backend chi tiết theo từng module/file/hàm |
| [`frontend/readFrontend.md`](frontend/readFrontend.md) | Phân tích frontend chi tiết theo từng feature/component/hook |
