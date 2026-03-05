# Notion Clone - Frontend

Dự án clone giao diện Notion sử dụng React + Vite + Tailwind CSS v4.

## 🚀 Công nghệ sử dụng

| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| React | 19.2.0 | UI Library |
| Vite | 7.2.4 | Build tool & Dev server |
| Tailwind CSS | 4.1.18 | Utility-first CSS framework |
| React Router | 7.12.0 | Client-side routing |
| Lucide React | 0.563.0 | Icon library |

## 📁 Cấu trúc thư mục

```
src/
├── components/          # Các component UI tái sử dụng
│   └── ui/
│       └── SocialButtons.jsx    # Nút đăng nhập Google & Apple
│
├── layouts/             # Layout wrappers cho các trang
│   ├── AuthLayout.jsx           # Layout cho trang xác thực (Login/Register)
│   └── AppLayout.jsx            # Layout chính với Sidebar + Main content
│
├── features/            # Các tính năng được nhóm theo domain
│   ├── auth/                    # Tính năng xác thực
│   │   ├── LoginForm.jsx        # Form đăng nhập với email
│   │   └── RegisterForm.jsx     # Form đăng ký với password strength
│   │
│   └── workspace/               # Tính năng workspace chính
│       ├── Sidebar.jsx          # Sidebar navigation
│       ├── TopBar.jsx           # Thanh công cụ trên cùng
│       └── TaskList.jsx         # Danh sách task với CRUD
│
├── pages/               # Các trang (composition layer)
│   ├── LoginPage.jsx            # Trang đăng nhập
│   ├── RegisterPage.jsx         # Trang đăng ký
│   └── WorkspacePage.jsx        # Trang workspace chính
│
├── assets/              # Tài nguyên tĩnh
│   └── react.svg
│
├── App.jsx              # Root component với routing
├── main.jsx             # Entry point
└── index.css            # Tailwind v4 theme configuration
```

## 🎨 Tính năng Notion đã implement

### ✅ Đã hoàn thành

| Tính năng | Mô tả | File liên quan |
|-----------|-------|----------------|
| **Dark Mode** | Giao diện tối như Notion | `index.css` |
| **Auth UI** | Trang Login/Register giống Notion | `AuthLayout.jsx`, `LoginForm.jsx`, `RegisterForm.jsx` |
| **Social Login Buttons** | Nút đăng nhập Google/Apple | `SocialButtons.jsx` |
| **Password Strength** | Hiển thị độ mạnh mật khẩu | `RegisterForm.jsx` |
| **Sidebar Navigation** | Menu bên trái với các section | `Sidebar.jsx` |
| **User Section** | Avatar và tên user trong sidebar | `Sidebar.jsx` |
| **Private Pages** | Danh sách trang riêng tư | `Sidebar.jsx` |
| **Top Bar** | Breadcrumbs, Share button, Actions | `TopBar.jsx` |
| **Task List** | To-do list với checkbox | `TaskList.jsx` |
| **Task CRUD** | Thêm, sửa, xóa task | `TaskList.jsx` |
| **Task Tabs** | Chuyển đổi To Do / Done | `TaskList.jsx` |
| **Invite Panel** | Panel mời thành viên | `Sidebar.jsx` |
| **Glassmorphism Card** | Hiệu ứng kính mờ | `AuthLayout.jsx` |
| **Fade-in Animation** | Hiệu ứng hiện lên mượt | `index.css`, `AuthLayout.jsx` |
| **Hover Effects** | Hiệu ứng hover cho buttons/links | Các component |
| **Responsive Design** | Tương thích nhiều kích thước | Tailwind classes |

### 🔲 Chưa implement (Có thể mở rộng)

| Tính năng | Mô tả |
|-----------|-------|
| **Rich Text Editor** | Soạn thảo văn bản như Notion |
| **Drag & Drop** | Kéo thả blocks |
| **Database Views** | Table, Board, List, Calendar views |
| **Search** | Tìm kiếm nội dung |
| **Comments** | Bình luận trên trang |
| **Real-time Collaboration** | Cộng tác thời gian thực |
| **Page Templates** | Mẫu trang có sẵn |
| **File Upload** | Tải lên hình ảnh, tệp |
| **Notifications** | Thông báo |
| **Settings** | Cài đặt tài khoản |

## 🎯 Routes

| Path | Component | Mô tả |
|------|-----------|-------|
| `/` | Redirect → `/login` | Chuyển hướng về login |
| `/login` | `LoginPage` | Trang đăng nhập |
| `/register` | `RegisterPage` | Trang đăng ký |
| `/app` | `WorkspacePage` | Workspace chính |

## 🛠️ Commands

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📐 Design System

### Colors (Dark Mode)
```css
--color-bg-main: #191919        /* Nền chính */
--color-bg-sidebar: #202020     /* Nền sidebar */
--color-text-primary: #d4d4d4   /* Text chính */
--color-text-secondary: #9b9b9b /* Text phụ */
--color-text-tertiary: #6d6d6d  /* Text mờ */
--color-accent-primary: #2383e2 /* Màu accent (xanh Notion) */
--color-border-subtle: #2f2f2f  /* Viền nhạt */
```

### Typography
- Font: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto...)
- Heading: 28px - 40px, font-weight: 700
- Body: 14px - 15px, line-height: 1.5

### Spacing
- Sidebar width: 240px
- Card padding: 48px (p-12)
- Input padding: 12px vertical, 44px left (with icon)

## 📝 Ghi chú

- Dự án sử dụng **Tailwind CSS v4** với cú pháp `@theme` mới
- Tất cả styling được inline trong JSX bằng Tailwind classes
- Không có file CSS riêng cho từng component (trừ `index.css`)
- Icons sử dụng thư viện **Lucide React**
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
