# Backend - PBL3 Project

Dự án backend cho PBL3, xây dựng với **Node.js**, **Express**, **PostgreSQL**, và **Prisma ORM**.

---

## 📋 Nội dung

- [Giới thiệu](#giới-thiệu)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Chi tiết các thư mục & file](#chi-tiết-các-thư-mục--file)
- [Luồng hoạt động của Code](#luồng-hoạt-động-của-code)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
- [Chạy dự án](#chạy-dự-án)

---

## 🎯 Giới thiệu

Đây là **REST API backend** cung cấp các dịch vụ:
- ✅ Xác thực (Authentication) - Đăng ký, Đăng nhập
- ✅ Quản lý người dùng (User Management)
- ✅ Quản lý tài khoản (Account Management)
- ✅ Xử lý lỗi tập trung
- ✅ Validation request dữ liệu đầu vào

**Stack công nghệ:**
- Node.js v20
- Express 5.2.1
- PostgreSQL 16
- Prisma ORM 7.2.0
- Zod (Validation)
- Docker & Docker Compose

---

## 📁 Cấu trúc dự án

```
backend/
├── docker-compose.yml         # Cấu hình Docker Compose (PostgreSQL + Backend)
├── Dockerfile                 # Cấu hình Docker image cho backend
├── package.json               # Dependencies và scripts
├── prisma.config.ts           # Cấu hình Prisma
├── prisma/
│   └── schema.prisma          # Database schema - Định nghĩa models (Users, Accounts, etc.)
└── src/
    ├── app.js                 # Cấu hình Express app (middleware, routes)
    ├── server.js              # Entry point - Khởi động server
    └── common/
        ├── dtos/              # Data Transfer Objects - Định dạng dữ liệu request/response
        │   ├── httpResponse.dto.js    # DTO cho HTTP response chuẩn
        │   └── index.js               # Export DTOs
        ├── enums/             # Enum - Các hằng số được định nghĩa sẵn
        ├── exceptions/        # Custom Exceptions - Các lỗi được định nghĩa sẵn
        │   ├── client.exception.js             # Lỗi từ client (400)
        │   ├── forbidden.exception.js          # Lỗi forbidden (403)
        │   ├── internalServer.exception.js     # Lỗi server (500)
        │   ├── notFoundException.js            # Lỗi không tìm thấy (404)
        │   ├── optional.exception.js           # Lỗi tùy chọn
        │   ├── unauthorized.exception.js       # Lỗi unauthorized (401)
        │   └── index.js                        # Export exceptions
        ├── middleware/        # Middleware - Xử lý request trước khi đến controller
        │   ├── errorHandler.Middleware.js      # Xử lý lỗi tập trung
        │   ├── validationRequest.middleware.js # Validate request body/query/params
        │   └── index.js                        # Export middleware
        ├── modules/           # Các module chức năng chính
        │   ├── auth/                  # Module xác thực
        │   │   ├── auth.controller.js # Xử lý request từ client (logic flow)
        │   │   ├── auth.repository.js # Giao tiếp với database
        │   │   ├── auth.router.js     # Định nghĩa routes (/register, /login)
        │   │   ├── auth.service.js    # Business logic (mã hóa, validation, etc.)
        │   │   └── dto/
        │   │       ├── requests/      # DTO cho request từ client
        │   │       │   ├── login.request.js
        │   │       │   └── register.request.js
        │   │       └── responses/     # DTO cho response gửi lại client
        │   │           ├── login.response.js
        │   │           └── register.response.js
        │   └── users/         # Module quản lý người dùng (cấu trúc tương tự auth)
        └── utils/             # Các hàm tiện ích (helper functions)
```

---

## 📝 Chi tiết các thư mục & file

### **Root Files**

| File | Mục đích |
|------|---------|
| `docker-compose.yml` | Khởi động 2 container: PostgreSQL (DB) + Backend (Node.js app) |
| `Dockerfile` | Build image cho backend app |
| `package.json` | Định nghĩa dependencies, scripts chạy (`dev`, `start`) |
| `prisma/schema.prisma` | Định nghĩa database structure (models, relations) |

### **src/app.js**

```javascript
// Cấu hình Express app
// - Import middleware
// - Cấu hình CORS, body-parser
// - Định nghĩa routes chính
// - Export app để dùng ở server.js
```

**Mục đích:** Tách biệt app config với server startup.

### **src/server.js**

```javascript
// Entry point - Khởi động server
// - Import app
// - Lắng nghe PORT (mặc định 3000)
// - In console khi server chạy
```

### **src/common/dtos/**

**Data Transfer Objects** - Định dạng dữ liệu request/response.

**Ví dụ:**
```javascript
// RegisterRequestDto: Email, Password, Name từ client
// RegisterResponseDto: ID, Email, Name gửi lại client
```

**Tại sao cần DTOs?**
- ✅ Định dạng dữ liệu rõ ràng
- ✅ Validate dữ liệu đầu vào (dùng Zod)
- ✅ Tránh lộ thông tin nhạy cảm (mật khẩu, etc.)
- ✅ Tái sử dụng ở nhiều endpoint

### **src/common/exceptions/**

**Custom Exceptions** - Các lỗi được định nghĩa sẵn.

**Các exception:**
- `ClientException` (400) - Lỗi từ client (validation fail)
- `UnauthorizedException` (401) - Chưa xác thực
- `ForbiddenException` (403) - Không có quyền
- `NotFoundException` (404) - Không tìm thấy tài nguyên
- `InternalServerException` (500) - Lỗi server

**Mục đích:**
- ✅ Xử lý lỗi thống nhất
- ✅ Gửi HTTP status code chính xác
- ✅ Dễ debug & maintain

### **src/common/middleware/**

**Middleware** - Xử lý request trước khi đến controller.

| Middleware | Chức năng |
|-----------|----------|
| `validationRequest.middleware.js` | Validate request body/query/params (dùng schema từ DTO) |
| `errorHandler.Middleware.js` | Catch & xử lý toàn bộ lỗi từ app |

**Luồng request:**
```
Client Request 
  → validationRequest.middleware (kiểm tra dữ liệu)
  → Router → Controller → Service
  → Response → errorHandler (nếu có lỗi)
  → Client Response
```

### **src/common/modules/**

**Các module chức năng chính**, mỗi module theo cấu trúc MVC:

#### **Module Auth** (auth/)

| File | Mục đích |
|------|---------|
| `auth.router.js` | Định nghĩa routes: `POST /auth/register`, `POST /auth/login` |
| `auth.controller.js` | Xử lý request từ client (gọi service, format response) |
| `auth.service.js` | Business logic: mã hóa password, validate, tạo token, etc. |
| `auth.repository.js` | Giao tiếp database (query, insert, update, delete) |
| `dto/` | Define data format cho request/response |

**Luồng xử lý Register:**
```
POST /auth/register (email, password, name)
  → Router
  → validationRequest.middleware (validate schema)
  → Controller.register() 
  → Service.register() (mã hóa password, kiểm tra email tồn tại)
  → Repository.createUser() (thêm vào DB)
  → Response (user info)
```

#### **Module Users** (users/)

Tương tự auth module, nhưng quản lý thông tin người dùng:
- Cập nhật profile
- Đổi password
- Upload avatar
- etc.

---

## 🔄 Luồng hoạt động của Code

### **1. Luồng khởi động Server**

```
server.js (Entry Point)
  ↓
import app từ app.js
  ↓
app.listen(PORT, 3000)
  ↓
Console: "Server is running on port 3000"
  ↓
PostgreSQL container chạy ở cổng 5432
Database đã được Prisma migrate
  ↓
Server sẵn sàng nhận request
```

### **2. Luồng xử lý Request (Ví dụ: Đăng ký người dùng)**

#### **Bước 1: Client gửi request**
```javascript
// Client gửi POST request
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### **Bước 2: Router nhận request**
```javascript
// auth.router.js
router.post('/register', 
  validationRequest(registerRequestValidationSchema),
  (req, res, next) => authController.register(req, res, next)
);
```

#### **Bước 3: Validation Middleware**
```javascript
// validationRequest.middleware.js
// Kiểm tra dữ liệu đầu vào theo schema

registerRequestValidationSchema = {
  body: z.object({
    email: z.email(),           // ✅ Phải là email hợp lệ
    password: z.string().min(6).max(20),  // ✅ 6-20 ký tự
    name: z.string().min(4).max(30)       // ✅ 4-30 ký tự
  })
}

// Nếu invalid → Throw ClientException(400)
// Nếu valid → Tiếp tục đến controller
```

#### **Bước 4: Controller xử lý**
```javascript
// auth.controller.js
async register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    
    // Tạo DTO từ request
    const registerRequest = new RegisterRequestDto({ 
      email, password, name 
    });
    
    // Gọi service để xử lý logic
    const account = await this.authService.register(registerRequest);
    
    // Format response
    const response = new RegisterResponseDto(account);
    
    // Gửi response
    res.status(201).json({
      status: "success",
      data: response
    });
  } catch (error) {
    next(error); // Gửi lỗi đến error handler middleware
  }
}
```

#### **Bước 5: Service xử lý logic**
```javascript
// auth.service.js
async register(registerRequest) {
  // 1. Kiểm tra email đã tồn tại?
  const existingUser = await this.authRepository.findUserByEmail(
    registerRequest.email
  );
  
  if (existingUser) {
    throw new ClientException("Email đã được đăng ký");
  }
  
  // 2. Mã hóa password
  const hashedPassword = await bcrypt.hash(
    registerRequest.password, 
    10
  );
  
  // 3. Tạo salt để bảo mật
  const salt = crypto.randomBytes(16).toString('hex');
  
  // 4. Gọi repository để lưu vào database
  const account = await this.authRepository.createAccount({
    email: registerRequest.email,
    password: hashedPassword,
    salt: salt,
    name: registerRequest.name
  });
  
  return account;
}
```

#### **Bước 6: Repository giao tiếp Database**
```javascript
// auth.repository.js
async createAccount(data) {
  // Sử dụng Prisma Client để thêm dữ liệu vào database
  const user = await prisma.users.create({
    data: {
      email: data.email,
      name: data.name
    }
  });
  
  const account = await prisma.accounts.create({
    data: {
      userId: user.id,
      password: data.password,
      salt: data.salt
    }
  });
  
  // Trả về account với user relation
  return prisma.accounts.findUnique({
    where: { id: account.id },
    include: { user: true }
  });
}
```

#### **Bước 7: Database lưu dữ liệu**
```sql
-- PostgreSQL queries được Prisma thực thi:

INSERT INTO users (id, email, name, verify, status, created_at, updated_at)
VALUES ('uuid-1', 'user@example.com', 'John Doe', false, 'active', NOW(), NOW());

INSERT INTO accounts (id, user_id, password, salt)
VALUES ('uuid-2', 'uuid-1', 'hashed_password_xxx', 'salt_xxx');
```

#### **Bước 8: Response gửi lại Client**
```javascript
// Controller gửi response
HTTP 201 Created
Content-Type: application/json

{
  "status": "success",
  "data": {
    "id": "uuid-2",
    "userId": "uuid-1",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "verify": false,
    "status": "active"
  }
}
```

### **3. Luồng xử lý Lỗi (Error Handling)**

```javascript
// Nếu có lỗi trong bất cứ bước nào

try-catch → throw Exception → next(error)
  ↓
errorHandler.middleware.js
  ↓
Kiểm tra loại exception
  ↓
- ClientException → 400 Bad Request
- UnauthorizedException → 401 Unauthorized
- ForbiddenException → 403 Forbidden
- NotFoundException → 404 Not Found
- InternalServerException → 500 Server Error
  ↓
Response gửi lại Client:
{
  "status": "error",
  "message": "Email đã được đăng ký",
  "code": "CLIENT_ERROR"
}
```

### **4. Biểu đồ tổng quát - Clean Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT REQUEST                          │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│              app.js (Express Configuration)                  │
│  - CORS, Body Parser, Routes, Middleware Stack              │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│           ROUTE LAYER (auth.router.js)                       │
│  - Định nghĩa URL paths & HTTP methods                       │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│      MIDDLEWARE LAYER (validationRequest.middleware)         │
│  - Validate dữ liệu input bằng Zod schema                   │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│         CONTROLLER LAYER (auth.controller.js)                │
│  - Parse request                                             │
│  - Gọi service                                               │
│  - Format & gửi response                                     │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│          SERVICE LAYER (auth.service.js)                     │
│  - Business logic                                            │
│  - Validation rule                                           │
│  - Password hashing                                          │
│  - Gọi repository                                            │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│         REPOSITORY LAYER (auth.repository.js)                │
│  - Database queries                                          │
│  - Sử dụng Prisma Client                                     │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│          DATABASE LAYER (PostgreSQL)                         │
│  - INSERT/UPDATE/DELETE/SELECT                              │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
        ┌─────────────────────────────────────┐
        │   DATABASE RESULT                    │
        └─────────────────────────┬────────────┘
                                  ↓
    (Dữ liệu ngược trở lại qua các layer)
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│         ERROR HANDLER MIDDLEWARE                             │
│  - Catch toàn bộ exception                                   │
│  - Format error response                                     │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│              CLIENT RESPONSE (HTTP 200/400/500)              │
└─────────────────────────────────────────────────────────────┘
```

### **5. Ví dụ Flow cho 3 kịch bản**

#### **✅ Kịch bản 1: Đăng ký thành công**
```
Request: { email: "new@example.com", password: "123456", name: "John" }
  ↓ Validation: ✅ Valid
  ↓ Service: Email chưa tồn tại → Hash password
  ↓ Repository: INSERT user & account
  ↓ Database: ✅ Data saved
  ↓ Response: HTTP 201 { user data }
```

#### **❌ Kịch bản 2: Email đã tồn tại**
```
Request: { email: "existing@example.com", password: "123456", name: "Jane" }
  ↓ Validation: ✅ Valid
  ↓ Service: Email đã tồn tại → Throw ClientException
  ↓ Error Handler: Catch exception
  ↓ Response: HTTP 400 { message: "Email đã được đăng ký" }
```

#### **❌ Kịch bản 3: Validation lỗi**
```
Request: { email: "invalid-email", password: "123", name: "Jo" }
  ↓ Validation: ❌ Invalid
  - email không đúng format
  - password < 6 ký tự
  - name < 4 ký tự
  ↓ Error Handler: Catch validation error
  ↓ Response: HTTP 400 { errors: [...] }
```

---

## 🚀 Hướng dẫn cài đặt

### **1. Clone & cài dependencies**

```bash
cd backend
npm install
```

### **2. Cấu hình environment**

Tạo file `.env` trong folder `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mydb
PORT=3000
NODE_ENV=development
```

### **3. Khởi động với Docker**

```bash
docker-compose up -d
```

Lệnh này sẽ:
- ✅ Tạo PostgreSQL container
- ✅ Build & chạy Backend container
- ✅ Tạo database `mydb`

### **4. Migrate database**

```bash
npx prisma migrate dev --name init
```

Lệnh này sẽ:
- ✅ Tạo migrations từ schema
- ✅ Áp dụng vào database
- ✅ Generate Prisma Client

---

## ▶️ Chạy dự án

### **Development (auto-reload)**

```bash
npm run dev
```

Dùng `nodemon` - tự động restart server khi file thay đổi.

### **Production**

```bash
npm start
```

### **Check server**

```bash
curl http://localhost:3000/health
# Response: { "status": "OK" }
```

---

## 🔌 API Endpoints

### **Auth Module**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/register` | Đăng ký người dùng mới |
| POST | `/auth/login` | Đăng nhập |

### **Request/Response Examples**

**Register:**
```json
// Request
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

// Response (201 Created)
{
  "status": "success",
  "data": {
    "id": "uuid-...",
    "userId": "uuid-...",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "",
    "verify": false,
    "status": "active"
  }
}
```

---

## 📚 Database Schema

### **Users Table**

| Column | Type | Mô tả |
|--------|------|-------|
| id | UUID | Primary Key |
| email | String | Email (unique) |
| name | String | Tên người dùng |
| avatar | String | URL ảnh đại diện |
| verify | Boolean | Đã verify email? |
| status | Enum | active/locked |
| createdAt | DateTime | Ngày tạo |
| updatedAt | DateTime | Ngày cập nhật |
| deletedAt | DateTime | Ngày xóa (soft delete) |

### **Accounts Table**

| Column | Type | Mô tả |
|--------|------|-------|
| id | UUID | Primary Key |
| userId | UUID | FK → Users |
| password | String | Hash password |
| salt | String | Salt cho password |

---

## 🛠️ Công nghệ & Dependencies

| Thư viện | Phiên bản | Mục đích |
|---------|---------|---------|
| Express | ^5.2.1 | Web framework |
| Prisma | ^7.2.0 | ORM - quản lý database |
| @prisma/client | ^7.2.0 | Client cho Prisma |
| Zod | ^4.3.5 | Validation schema |
| CORS | ^2.8.5 | Cross-Origin Resource Sharing |
| dotenv | ^17.2.3 | Load environment variables |
| nodemon | ^3.1.11 | Auto-restart server (dev) |

---

## 📖 Quy ước & Best Practices

### **Naming Convention**

- **Models:** PascalCase (`Users`, `Accounts`)
- **Functions/Methods:** camelCase (`registerUser`, `validateEmail`)
- **Files:** camelCase (`auth.service.js`, `httpResponse.dto.js`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_PASSWORD_LENGTH`)

### **Folder Structure - Clean Architecture**

Tuân theo **Clean Architecture**:
- **Router:** Định nghĩa URL routes
- **Controller:** Xử lý request/response
- **Service:** Business logic
- **Repository:** Database queries
- **DTO:** Data format

### **Error Handling**

Luôn throw custom exceptions thay vì generic `Error`:

```javascript
// ❌ Bad
throw new Error("User not found");

// ✅ Good
throw new NotFoundException("User not found");
```

---

## 🐛 Troubleshooting

### **Database connection error**

```bash
# Kiểm tra DATABASE_URL trong .env
# Kiểm tra PostgreSQL container chạy chưa
docker ps | grep postgres
```

### **Port 3000 đã dùng**

```bash
# Sửa PORT trong .env hoặc
npm run dev -- --port 4000
```

### **Migration fail**

```bash
# Reset database (⚠️ xóa toàn bộ data)
npx prisma migrate reset
```

---

## 📞 Contact & Support

- **Project:** PBL3
- **Team:** [Your Team Name]
- **Last Updated:** 20/01/2026

---

**Happy Coding! 🚀**
