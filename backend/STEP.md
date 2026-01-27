🗺️ BACKEND MASTER PLAN - PBL3
Dự án: Unified Workspace & Digital Service Integration Stack: Node.js (Express), PostgreSQL (Prisma), Redis (BullMQ).

🏗 Giai đoạn 1: Khởi tạo & Cơ sở hạ tầng (Infrastructure)
Mục tiêu: Có một server chạy được, kết nối DB thành công và cấu trúc Clean Architecture chuẩn.

[x] Setup Project Structure: Cấu trúc thư mục theo Clean Architecture (modules, common, config).

[x] Docker Environment:

[x] Cấu hình docker-compose.yml cho PostgreSQL.

[ ] Cấu hình docker-compose.yml cho Redis (chuẩn bị cho BullMQ).

[x] Database Initialization:

[x] Cài đặt Prisma ORM.

[ ] Viết file schema.prisma khớp hoàn toàn với DBML mới nhất.

[ ] Chạy migration khởi tạo (npx prisma migrate dev --name init).

[ ] Server Base:

[x] Setup Express App, config CORS, Helmet, Compression.

[x] Setup errorHandler Middleware (Global Exception Filter).

[ ] Setup Logger (Winston hoặc Morgan).

🔐 Giai đoạn 2: Xác thực & Người dùng (Auth & Users)
Mục tiêu: Quản lý người dùng, bảo mật password và phiên đăng nhập.

[x] User Module:

[ ] Repository: CRUD bảng users.

[ ] Authentication Logic:

[x] Cài đặt bcrypt (hash password) và jsonwebtoken (JWT).

[x] API POST /auth/register: Validate Zod, check email trùng, hash pass, tạo user.

[x] API POST /auth/login: Verify pass, tạo Access Token & Refresh Token.

[] API POST /auth/refresh: Cấp lại Access Token mới từ Refresh Token.

[] Middleware AuthGuard: Kiểm tra JWT trong Header cho các route bảo mật.

[ ] Profile Management:

[ ] API GET /users/me: Lấy thông tin người dùng hiện tại.

[ ] API PATCH /users/me: Cập nhật avatar, tên.

✅ Giai đoạn 3: Quản lý công việc (Core Domain - Tasks)
Mục tiêu: Người dùng có thể thao tác CRUD với công việc cá nhân.

[ ] Task CRUD:

[ ] API POST /tasks: Tạo task mới (validate Priority, Status).

[ ] API GET /tasks: Lấy danh sách task (Hỗ trợ Pagination, Filter theo Status/Priority).

[ ] API GET /tasks/:id: Chi tiết task.

[ ] API PATCH /tasks/:id: Cập nhật trạng thái (Drag & drop logic), nội dung.

[ ] API DELETE /tasks/:id: Soft delete (cập nhật deleted_at).

[ ] Tags System:

[ ] API POST /tags: Tạo thẻ màu (Label).

[ ] API GET /tags: Lấy danh sách tags của user.

[ ] Logic gán Tags vào Task (Quan hệ Many-to-Many trong Prisma).

🔗 Giai đoạn 4: Tích hợp dịch vụ số (Integrations - The Hard Part)
Mục tiêu: Kết nối OAuth2 và quản lý Token của bên thứ 3 an toàn.

[ ] Security Utility:

[ ] Viết hàm encrypt(text) và decrypt(text) dùng AES-256 (để mã hóa Access Token của Google/GitHub trước khi lưu vào DB).

[ ] Google Integration (Gmail):

[ ] Đăng ký Google Cloud Console Project (Lấy Client ID, Secret).

[ ] API GET /auth/google/url: Trả về link để user đăng nhập Google.

[ ] API GET /auth/google/callback: Nhận Code -> Đổi lấy Access/Refresh Token -> Mã hóa -> Lưu vào bảng integrations.

[ ] GitHub Integration:

[ ] Đăng ký GitHub OAuth App.

[ ] API GET /auth/github/url.

[ ] API GET /auth/github/callback: Xử lý tương tự Google.

[ ] Token Management:

[ ] Logic kiểm tra Token hết hạn và tự động Refresh (đặc biệt là Google Token).

⚙️ Giai đoạn 5: Sync Engine (Đồng bộ dữ liệu)
Mục tiêu: Biến API thụ động thành Task chủ động.

[ ] Gmail Service:

[ ] Dùng googleapis để fetch email quan trọng/starred.

[ ] Logic Mapping: Convert Email Object -> Task Entity (Title = Subject, Body = Snippet).

[ ] GitHub Service:

[ ] Dùng octokit để fetch Issues được assign.

[ ] Logic Mapping: Convert Issue Object -> Task Entity.

[ ] Manual Sync API:

[ ] API POST /sync/gmail: User bấm nút "Đồng bộ ngay".

[ ] API POST /sync/github: User bấm nút "Đồng bộ ngay".

[ ] Ghi log vào bảng sync_logs.

⏳ Giai đoạn 6: Background Jobs & Automation (BullMQ + Redis)
Mục tiêu: Tự động hóa quy trình mà không bắt user phải chờ đợi.

[ ] Queue Setup:

[ ] Cấu hình BullMQ connection với Redis.

[ ] Tạo Queue: emailQueue (gửi mail), syncQueue (đồng bộ data).

[ ] Auto-Sync Scheduler:

[ ] Setup BullMQ Repeatable Job: Tự động chạy job syncQueue mỗi 30 phút cho các user active.

[ ] Reminder System:

[ ] Setup Job quét DB tìm task sắp hết hạn (due_date).

[ ] Đẩy job vào emailQueue.

[ ] Worker Processor:

[ ] Viết Worker xử lý syncQueue: Gọi lại logic ở Giai đoạn 5.

[ ] Viết Worker xử lý emailQueue: Dùng nodemailer gửi cảnh báo deadline.

🛡️ Giai đoạn 7: Logs, Polish & Documentation
Mục tiêu: Hoàn thiện chức năng phụ trợ và tài liệu.

[ ] Audit Logs:

[ ] Viết Interceptor/Middleware để tự động ghi log vào bảng audit_logs khi có hành động quan trọng (Login, Delete Task).

[ ] Task Activities:

[ ] Logic ghi lại lịch sử thay đổi của Task (Ví dụ: Chuyển từ "Todo" sang "Done").

[ ] API Documentation:

[ ] Cài đặt Swagger (OpenAPI).

[ ] Document các Endpoint chính.

[ ] Testing (Optional nhưng nên có):

[ ] Unit Test cho các Service tính toán logic.

[ ] Integration Test cho luồng Auth.

🚀 Giai đoạn 8: Deployment (Triển khai)
[ ] Build Docker Image tối ưu (Multi-stage build).

[ ] Setup Environment Variables cho Production.

[ ] Deploy lên VPS/Cloud (Render/Railway/AWS).