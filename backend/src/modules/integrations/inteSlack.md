# Tài liệu Integration: Webhook + WebSocket

## Phần 1 — Phân tích luồng hiện có (GitHub & Gmail)

---

### 1.1 Luồng GitHub Webhook + WebSocket

#### Kiến trúc tổng quan

```
GitHub Repo
    │  (Issues: opened / assigned)
    ▼
POST /v1/api/integrations/webhook/github        ← Public endpoint (không cần JWT)
    │
    ├─ 1. Trả ngay 200 OK  ─────────────────────────────────────────────────────
    │        (GitHub timeout nếu không phản hồi trong 10 giây)
    │
    ├─ 2. Xác minh chữ ký HMAC-SHA256
    │        Header: x-hub-signature-256 = "sha256=<digest>"
    │        Secret: GITHUB_WEBHOOK_SECRET (env)
    │        Body:   req.rawBody (Buffer gốc, đã cấu hình trong app.js)
    │        Dùng crypto.timingSafeEqual() để tránh timing attack
    │
    ├─ 3. Đọc event type từ header x-github-event
    │        Chỉ xử lý event = "issues" với action = "opened" | "assigned"
    │
    ├─ 4. Xác định targetUsers (người nhận thông báo)
    │        assigned  → payload.assignee
    │        opened    → issue.assignees (nếu có) | issue.user
    │
    ├─ 5. Lookup Integration trong DB
    │        WHERE provider = 'GITHUB' AND providerUserId = <github_user_id>
    │        Không tìm thấy → log & bỏ qua (user chưa liên kết)
    │
    ├─ 6. Upsert Task vào INBOX (taskRepository.upsertTaskToInbox)
    │        title:       "[GitHub] <issue.title>"
    │        sourceType:  GITHUB
    │        sourceId:    issue.id (string)
    │        sourceLink:  issue.html_url
    │        priority:    MEDIUM
    │
    └─ 7. Emit Socket.io → user room
             Event: NEW_INBOX_ITEM
             Data:  { message: "...", task: newTask }
             Room:  integration.userId  (io.to(userId).emit(...))
```

#### Setup webhook

- User gọi `POST /v1/api/integrations/github/setup-webhooks` với `{ repositoryIds: [...] }`
- Backend dùng GitHub API để đăng ký hook trỏ vào URL công khai (qua Cloudflare Tunnel hoặc domain thật)
- `webhookData` (hook IDs) được lưu vào `Integration.webhookData` (JSON)
- Tắt webhook: `DELETE /v1/api/integrations/github/webhooks`

#### Bảo mật

| Biện pháp           | Chi tiết                                                   |
| ------------------- | ---------------------------------------------------------- |
| HMAC-SHA256         | Ký bằng `GITHUB_WEBHOOK_SECRET`, verify mọi request        |
| Timing-safe compare | `crypto.timingSafeEqual` tránh timing attack               |
| rawBody buffer      | Dùng Buffer gốc (không parse JSON trước) để hash chính xác |
| 200 OK tức thì      | Phản hồi trước khi xử lý, tránh GitHub retry storm         |

---

### 1.2 Luồng Gmail Webhook (Google Cloud Pub/Sub Push) + WebSocket

#### Kiến trúc tổng quan

```
Gmail inbox thay đổi (email mới)
    │
    ▼
Google Cloud Pub/Sub
    │  (Push subscription → HTTP POST)
    ▼
POST /v1/api/integrations/webhook/gmail         ← Public endpoint
    │
    ├─ 1. Trả ngay 200 OK
    │
    ├─ 2. Giải mã payload
    │        req.body.message.data (base64) → JSON → { emailAddress, historyId }
    │
    ├─ 3. Lookup Integration
    │        WHERE email = emailAddress AND provider = 'GOOGLE'
    │        Tìm qua bảng User (email) + include integrations[GOOGLE]
    │
    ├─ 4. Tạo Google OAuth2 Client với token đã lưu (encrypted)
    │        googleService.getValidGoogleClient(integration)
    │        Tự động refresh nếu token hết hạn
    │
    ├─ 5. Query Gmail API (bỏ qua History API cho đơn giản)
    │        gmail.users.messages.list:
    │          labelIds: ['INBOX']
    │          q: 'is:unread {"task" "công việc" "deadline" "bug" ...}'
    │          maxResults: 5
    │
    ├─ 6. Lấy chi tiết + AI-filter email (integrationService.filterEmails)
    │
    ├─ 7. Với mỗi email:
    │   ├─ Kiểm tra đã tồn tại trong DB (sourceId = email.id, sourceType = GMAIL)
    │   ├─ Upsert Task vào INBOX
    │   └─ CHỈ emit Socket nếu task là MỚI TINH (dedup check)
    │           Event: NEW_INBOX_ITEM
    │           Data:  { message: "...", task: newTask }
    │
    └─ (Dedup: existingTask check trước emit → tránh spam Socket)
```

#### Khác biệt so với GitHub

|               | GitHub                     | Gmail                                 |
| ------------- | -------------------------- | ------------------------------------- |
| Trigger       | GitHub repo event          | Google Pub/Sub push                   |
| Xác thực      | HMAC-SHA256 signature      | Pub/Sub subscription (Google-managed) |
| Lookup user   | providerUserId (GitHub ID) | email address                         |
| Dedup         | upsert (sourceId unique)   | check existing task trước khi emit    |
| Token refresh | N/A (PAT không hết hạn)    | Tự động refresh OAuth2 token          |

---

### 1.3 Luồng Socket.io (Frontend ↔ Backend)

#### Backend — Socket Gateway (`src/common/realtime/socket.gateway.js`)

```
server.js
  └─ new Server(httpServer, { cors })      ← Khởi tạo Socket.io
  └─ setIO(io)                             ← Lưu instance vào module-level singleton
  └─ app.set('socketio', io)               ← Lưu thêm vào Express app

io.on('connection', socket => {
  socket.on('join_user_room', userId => {
    socket.join(userId)                    ← User join room = userId của họ
  })
})

// Emit từ webhook / worker:
io.to(userId).emit('NEW_INBOX_ITEM', data)
```

#### Frontend — Socket Service (`src/shared/api/socket.service.js`)

```
socket = io(VITE_API_BASE_URL)             ← Kết nối khi app load

socket.on('connect', () => {
  // Re-join tất cả rooms đã đăng ký sau reconnect
  joinedRooms.forEach(roomId => socket.emit('join_user_room', roomId))
})

socketService.joinUserRoom(userId)         ← Component gọi khi mount
socketService.onEvent('NEW_INBOX_ITEM', cb)
socketService.offEvent('NEW_INBOX_ITEM', cb)
```

#### Frontend — Hook (`useInboxSocket.js`)

```jsx
useInboxSocket(userId, onNewItem)
  └─ socketService.joinUserRoom(userId)
  └─ socketService.onEvent('NEW_INBOX_ITEM', handler)
  └─ cleanup: socketService.offEvent('NEW_INBOX_ITEM', handler)
```

#### Sự kiện Socket.io hiện có

| Event name             | Hướng           | Mô tả                                       |
| ---------------------- | --------------- | ------------------------------------------- |
| `join_user_room`       | Client → Server | Client join vào room = userId               |
| `NEW_INBOX_ITEM`       | Server → Client | Có task mới từ webhook (GitHub/Gmail/Slack) |
| `NOTIFICATION_CREATED` | Server → Client | BullMQ worker gửi notification nhắc nhở     |
| `TASK_EVENT_REMINDER`  | Server → Client | Nhắc trước deadline task/event              |

---

## Phần 2 — Trạng thái hiện tại của Slack (Pull Only)

Slack **chưa có webhook**. Hiện tại chỉ có:

- `GET /v1/api/integrations/preview/slack` — Kéo 10 tin nhắn mới nhất (on-demand)
- `GET /v1/api/integrations/dashboard/slack` — Kéo dữ liệu phân loại (5 categories)
- OAuth flow hoàn chỉnh (`/auth/slack/url`, `/auth/slack/callback`)
- `Integration` lưu `accessToken` encrypted + `providerUserId` (Slack user ID)

**Vấn đề**: Người dùng phải refresh tay để thấy tin nhắn mới. Không có realtime.

---

## Phần 3 — Kế hoạch triển khai Slack Webhook + WebSocket

### 3.1 Tổng quan kiến trúc mục tiêu

```
Slack Workspace
  │  (message gửi vào channel / DM / mention bot)
  ▼
Slack Events API  (event subscription)
  │  HTTP POST
  ▼
POST /v1/api/integrations/webhook/slack         ← Public endpoint
  │
  ├─ URL Verification (lần đầu setup): trả { challenge }
  ├─ Signature verify (x-slack-signature)
  ├─ Lookup Integration bằng team_id + Slack user ID
  ├─ Filter message (loại bỏ bot, message của chính mình)
  ├─ Upsert Task vào INBOX (sourceType: SLACK)
  └─ Emit NEW_INBOX_ITEM via Socket.io
       ↓
  Frontend (useInboxSocket) nhận realtime
```

---

### 3.2 Cơ chế bảo mật của Slack Events API

Slack ký mỗi request bằng **Signing Secret** (khác với Bot Token):

```
v0=HMAC-SHA256(signingSecret, "v0:" + timestamp + ":" + rawBody)
```

Header gửi kèm:

- `x-slack-signature`: `"v0=<hex_digest>"`
- `x-slack-request-timestamp`: Unix timestamp (giây)

**Các kiểm tra bắt buộc:**

1. Timestamp phải trong vòng **5 phút** (chống replay attack)
2. So sánh signature dùng `crypto.timingSafeEqual` (chống timing attack)
3. Dùng `rawBody` Buffer (không parse JSON trước)

---

### 3.3 Kế hoạch chi tiết Backend

#### Bước 1 — Thêm env vars (`backend/.env`)

```env
SLACK_SIGNING_SECRET=<từ api.slack.com → App Settings → Basic Information>
```

#### Bước 2 — Thêm route vào `integration.router.js`

```js
// TRƯỚC authGuard
integrationRouter.post('/webhook/slack', webhookController.handleSlack);
```

#### Bước 3 — Thêm `handleSlack` vào `webhook.controller.js`

```js
handleSlack: async (req, res) => {
  // ── URL Verification Challenge (Slack gửi khi setup lần đầu) ──────────
  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // ── Trả 200 OK ngay lập tức ───────────────────────────────────────────
  res.status(200).send('OK');

  try {
    // ── 1. Verify Slack Signature ─────────────────────────────────────────
    const slackSignature = req.headers['x-slack-signature'];
    const slackTimestamp  = req.headers['x-slack-request-timestamp'];
    const signingSecret   = process.env.SLACK_SIGNING_SECRET;

    if (!slackSignature || !slackTimestamp || !signingSecret) {
      console.error('[SLACK WEBHOOK] Thiếu signature / timestamp / signing secret');
      return;
    }

    // Chống replay attack: timestamp không được quá 5 phút
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(slackTimestamp)) > 300) {
      console.error('[SLACK WEBHOOK] Timestamp quá cũ (replay attack?)');
      return;
    }

    // Tính chữ ký
    const sigBaseString = `v0:${slackTimestamp}:${req.rawBody}`;
    const hmac = crypto.createHmac('sha256', signingSecret);
    const digest = 'v0=' + hmac.update(sigBaseString).digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(slackSignature),
      Buffer.from(digest),
    )) {
      console.error('[SLACK WEBHOOK] Chữ ký không hợp lệ');
      return;
    }

    // ── 2. Parse event ────────────────────────────────────────────────────
    const { event, team_id } = req.body;

    // Chỉ xử lý message mới, loại bỏ bot / edited / deleted
    if (!event || event.type !== 'message' || event.subtype || !event.user) {
      return;
    }

    const slackUserId = event.user;
    const text        = event.text || '';
    const channelId   = event.channel;
    const ts          = event.ts;

    // ── 3. Lookup Integration ─────────────────────────────────────────────
    // Tìm integration dựa vào Slack User ID + team_id (để phân biệt workspace)
    const integration = await prisma.integration.findFirst({
      where: {
        provider:       'SLACK',
        providerUserId: slackUserId,
        // webhookData.teamId có thể dùng để filter thêm nếu cần
      },
    });

    if (!integration) {
      console.log(`[SLACK WEBHOOK] Slack user ${slackUserId} chưa liên kết tài khoản`);
      return;
    }

    console.log('[SLACK WEBHOOK] Tin nhắn mới từ Slack:', text.substring(0, 80));

    // ── 4. Upsert Task vào INBOX ──────────────────────────────────────────
    const taskData = {
      title:          `[Slack] ${text.substring(0, 100)}`,
      description:    text,
      priority:       'MEDIUM',
      sourceType:     'SLACK',
      sourceId:       ts,                           // ts = message timestamp (unique trong channel)
      sourceLink:     `https://slack.com/app_redirect?channel=${channelId}&message_ts=${ts}`,
      sourceMetadata: { channelId, teamId: team_id, slackUserId, ts },
    };

    const existingTask = await prisma.task.findFirst({
      where: { userId: integration.userId, sourceId: ts, sourceType: 'SLACK' },
    });

    const newTask = await taskRepository.upsertTaskToInbox(
      integration.userId,
      taskData,
    );

    // ── 5. Emit Socket.io chỉ khi task MỚI ───────────────────────────────
    if (!existingTask) {
      const io = req.app.get('socketio');
      if (io) {
        io.to(integration.userId).emit('NEW_INBOX_ITEM', {
          message: 'Bạn có một tin nhắn Slack mới!',
          task: newTask,
        });
        console.log(`[SLACK WEBHOOK] Đã emit Socket đến user ${integration.userId}`);
      }
    }

  } catch (err) {
    console.error('[SLACK WEBHOOK] Lỗi xử lý:', err);
  }
},
```

#### Bước 4 — Cấu hình Slack App (api.slack.com)

```
Slack App Dashboard → Event Subscriptions:
  Enable Events: ON
  Request URL:   https://<your-domain>/v1/api/integrations/webhook/slack

Subscribe to bot events:
  - message.channels     (tin nhắn trong public channel bot đã tham gia)
  - message.groups       (tin nhắn trong private channel)
  - message.im           (tin nhắn DM gửi đến bot)
  - app_mention          (mention @YourBot)

OAuth & Permissions → Bot Token Scopes:
  - channels:history
  - groups:history
  - im:history
  - chat:write          (nếu muốn bot reply)

→ Reinstall App vào workspace sau khi thêm scopes
```

> **Lưu ý quan trọng**: Slack Events API gửi event dưới danh nghĩa **Bot**, không phải user.
>
> - `event.user` = Slack user ID của người gửi tin (để lookup integration)
> - Bot Token (`xoxb-...`) được dùng để setup, KHÔNG lưu vào Integration (dùng User Token `xoxp-...`)
> - Nếu user dùng User Token OAuth flow (scope `user_token`), cần đảm bảo Event Subscriptions dùng **cùng app**.

---

#### Bước 5 — Lưu `teamId` vào `webhookData` khi OAuth callback

Trong `slack.service.js`, khi upsert Integration, bổ sung `webhookData`:

```js
await tx.integration.upsert({
	// ...
	update: {
		accessTokenEncrypted,
		status: 'ACTIVE',
		profileData: { user: userProfile, team },
		webhookData: { teamId: team?.id }, // ← Thêm dòng này
	},
	create: {
		// ...
		webhookData: { teamId: team?.id }, // ← Thêm dòng này
	},
});
```

---

### 3.4 Kế hoạch chi tiết Frontend

Frontend **không cần thay đổi logic Socket.io** — `useInboxSocket` đã lắng nghe `NEW_INBOX_ITEM` từ tất cả nguồn (GitHub / Gmail / Slack).

#### Thay đổi cần thiết:

**1. `integration.api.js`** — Không cần thêm gì (webhook là server-to-server)

**2. `useIntegrations.js`** — Đã có `slackResult` trong `Promise.allSettled` để fetch preview

**3. `IntegrationsSection.jsx`** — Hiện tại nút Slack chỉ có `onConnect` (OAuth). Có thể thêm trạng thái "Webhook Active" khi `integration.webhookData` có giá trị:

```jsx
// Sau khi user connect Slack thành công, hiển thị badge "Webhook Active"
// (đọc từ backend endpoint mới GET /integrations/status/slack)
```

---

### 3.5 So sánh 3 luồng Webhook

|                       | GitHub                                | Gmail                          | Slack (kế hoạch)                  |
| --------------------- | ------------------------------------- | ------------------------------ | --------------------------------- |
| **Protocol**          | GitHub Webhooks                       | Google Pub/Sub Push            | Slack Events API                  |
| **Auth verify**       | HMAC-SHA256 (`x-hub-signature-256`)   | Pub/Sub trust (Google-managed) | HMAC-SHA256 (`x-slack-signature`) |
| **Replay protection** | Không (GitHub tự retry)               | Không cần                      | Timestamp ±5 phút                 |
| **URL verification**  | Không                                 | Không                          | Có (`challenge` response)         |
| **Lookup user by**    | `providerUserId` = GitHub user ID     | Email address → User table     | `providerUserId` = Slack user ID  |
| **Dedup**             | `upsertTaskToInbox` (sourceId unique) | Check existing trước emit      | Check existing trước emit         |
| **Task prefix**       | `[GitHub]`                            | `[Gmail]`                      | `[Slack]`                         |
| **Socket event**      | `NEW_INBOX_ITEM`                      | `NEW_INBOX_ITEM`               | `NEW_INBOX_ITEM`                  |

---

### 3.6 Thứ tự triển khai (Checklist)

#### Backend

- [ ] **B1** Thêm `SLACK_SIGNING_SECRET` vào `backend/.env` và `.env.example`
- [ ] **B2** Thêm `integrationRouter.post('/webhook/slack', webhookController.handleSlack)` **trước** `authGuard` trong `integration.router.js`
- [ ] **B3** Implement `handleSlack` trong `webhook.controller.js` (URL challenge + signature verify + upsert + Socket emit)
- [ ] **B4** Bổ sung `webhookData: { teamId }` khi upsert Integration trong `slack.service.js`
- [ ] **B5** (Optional) Thêm index `Integration(provider, providerUserId)` nếu chưa có (đã có `@@unique([provider, providerUserId])` trong schema → OK)

#### Slack App Dashboard (api.slack.com)

- [ ] **S1** Vào app → Event Subscriptions → Enable → điền Request URL
- [ ] **S2** Subscribe bot events: `message.channels`, `message.groups`, `message.im`, `app_mention`
- [ ] **S3** Thêm Bot Token Scopes: `channels:history`, `groups:history`, `im:history`
- [ ] **S4** Reinstall App vào workspace
- [ ] **S5** Copy **Signing Secret** → paste vào `SLACK_SIGNING_SECRET` env

#### Frontend

- [ ] **F1** Không cần thay đổi `useInboxSocket` (đã hoạt động với mọi `NEW_INBOX_ITEM`)
- [ ] **F2** (Optional) Cập nhật `IntegrationsSection.jsx` để hiển thị trạng thái webhook active

---

### 3.7 Luồng hoàn chỉnh sau triển khai

```
User A gửi tin nhắn vào Slack channel
    │
    ▼
Slack Events API → POST /v1/api/integrations/webhook/slack
    │
    ├─ Verify timestamp (≤ 5 phút)
    ├─ Verify x-slack-signature (HMAC-SHA256)
    ├─ Parse event.user (Slack user ID) + event.text + event.channel
    ├─ prisma.integration.findFirst({ provider: SLACK, providerUserId: slackUserId })
    ├─ taskRepository.upsertTaskToInbox(userId, { title: "[Slack] ...", sourceType: SLACK })
    └─ io.to(userId).emit('NEW_INBOX_ITEM', { message, task })
            │
            ▼
    Frontend socket.service.js nhận 'NEW_INBOX_ITEM'
            │
            ▼
    useInboxSocket → onNewItem(data) callback
            │
            ▼
    Inbox UI cập nhật realtime (task mới xuất hiện ngay lập tức)
```

---

### 3.8 Xử lý edge cases

| Edge case                            | Xử lý                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Slack retry (endpoint lỗi)           | Trả 200 OK ngay lập tức trước khi xử lý async                               |
| Bot message (subtype: `bot_message`) | `if (event.subtype) return` — bỏ qua                                        |
| Message edited/deleted               | `event.subtype = 'message_changed'/'message_deleted'` → bỏ qua              |
| User chưa liên kết Slack             | Log và return, không crash                                                  |
| Duplicate event (Slack retry)        | `upsertTaskToInbox` idempotent + dedup check trước Socket emit              |
| Token hết hạn                        | Slack Bot Token không hết hạn; User Token có thể hết hạn → cần refresh flow |
| Team ID khác nhau                    | `webhookData.teamId` để phân biệt nếu 1 Slack user thuộc nhiều workspace    |

---

### 3.9 Testing

```bash
# Dùng Slack CLI hoặc ngrok + Slack App để test local
# Hoặc dùng curl để giả lập request (cần tính đúng signature)

# 1. Expose local backend
cloudflared tunnel --url http://localhost:3000

# 2. Điền URL vào Slack App → Event Subscriptions
# Slack sẽ gửi challenge → endpoint trả { challenge } → verified

# 3. Gửi tin nhắn vào channel bot đã join
# → Backend nhận event → log "[SLACK WEBHOOK] Tin nhắn mới"
# → Frontend nhận Socket event NEW_INBOX_ITEM
```
