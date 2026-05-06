# Ke hoach trien khai PBL3

## 1) Phan tich cong cu can dung (toan bo du an)

### A. Backend (Node.js/Express + Prisma)

- **Cong cu/nen tang**: Render, Railway, Fly.io, hoac VPS (Hetzner/DigitalOcean).
- **Ly do**:
  - Can chay Node.js server lien tuc, ho tro HTTP + Socket.io.
  - Ho tro bien moi truong, tu dong build, deploy nhanh.
  - Co the ket noi PostgreSQL va Redis ben ngoai.
- **Chi phi**:
  - Render: co free tier (nhung thuong sleep), tra phi thap de on dinh.
  - Railway: co free credit/thap phi; thich hop nhanh.
  - Fly.io: co free allowance; tra phi thap cho prod nhe.
  - VPS: tra phi thap (~5 USD/thang) va chu dong nhieu nhat.

### B. Frontend (React + Vite)

- **Cong cu/nen tang**: Vercel hoac Netlify.
- **Ly do**:
  - Phan frontend la static build, can CDN de tai nhanh.
  - Tu dong build tu Git, preview moi PR.
- **Chi phi**:
  - Vercel/Netlify deu co free tier du dung cho nho.

### C. PostgreSQL (Database)

- **Cong cu/nen tang**: Supabase, Neon, Railway Postgres, Render Postgres.
- **Ly do**:
  - Du an dung Prisma + Postgres, can DB managed de on dinh.
  - De backup, scaling, ket noi tu backend.
- **Chi phi**:
  - Supabase/Neon co free tier; phu hop giai doan dau.
  - Render/Railway co goi thap phi khi can hieu nang on dinh.

### D. Redis (BullMQ hang doi + reminder)

- **Cong cu/nen tang**: Upstash Redis hoac Redis Cloud.
- **Ly do**:
  - BullMQ can Redis luu queue va job.
  - Managed Redis giam cong van hanh.
- **Chi phi**:
  - Upstash co free tier (so luong lenh/GB gioi han).
  - Redis Cloud co free tier nho; goi thap phi khi can.

### E. Luu bien moi truong va secrets

- **Cong cu/nen tang**: secret manager cua nen tang deploy (Vercel/Render/Railway).
- **Ly do**:
  - Bao mat JWT secret, OAuth client secret.
  - De quan ly env theo moi truong (dev/staging/prod).
- **Chi phi**: Thuong mien phi trong nen tang.

### F. Domain + SSL

- **Cong cu/nen tang**: Ten mien (Namecheap, Porkbun) + SSL tu dong.
- **Ly do**:
  - OAuth (Google/GitHub/Slack) can redirect URL co domain + HTTPS.
  - SSL giup bao mat cookie refresh token.
- **Chi phi**:
  - Ten mien ~10-15 USD/nam; SSL thuong mien phi.

  ### G. Cloudflare (webhook + tunnel)
  - **Cong cu/nen tang**: Cloudflare (Tunnel/Zero Trust) hoac Cloudflare DNS.
  - **Ly do**:
    - Webhook can mot URL public on dinh de nhan su kien tu ben ngoai.
    - Cloudflare Tunnel co the public hoa backend ma khong can mo cong tren VPS.
  - **Chi phi**:
    - Co free tier; goi tra phi chi can thiet khi can them tinh nang bao mat.

---

## 2) Goi y cau hinh deploy thap phi

### Lua chon A (de nang cap sau)

- **Frontend**: Vercel (free).
- **Backend**: Render web service (free -> sleep), hoac Railway (free credit).
- **Postgres**: Neon/Supabase free tier.
- **Redis**: Upstash free tier.

### Lua chon B (on dinh hon, chi phi thap)

- **Frontend**: Vercel (free).
- **Backend**: VPS nho (5-6 USD/thang) chay Docker.
- **Postgres**: Chay tren VPS (Docker) hoac managed (Neu muon giam van hanh).
- **Redis**: Chay tren VPS (Docker) hoac Upstash.

---

## 3) Ke hoach trien khai (de xuat)

### Buoc 1: Chuan bi bien moi truong

- Backend: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, OAuth keys (Google/GitHub/Slack), `FRONTEND_URL`.
- Frontend: `VITE_API_BASE_URL` (neu co trong project), OAuth redirect URL tuong ung.

### Buoc 2: Deploy Database va Redis

- Tao Postgres tren Supabase/Neon (hoac Render/Railway).
- Tao Redis tren Upstash.
- Cap nhat `DATABASE_URL` va `REDIS_URL` cho backend.

### Buoc 3: Deploy Backend

- Chon Render/Railway/Fly/VPS.
- Build va run Node.js app.
- Chay migrate Prisma (moi truong prod).
- Kiem tra `/health`.

### Buoc 4: Deploy Frontend

- Connect repo toi Vercel/Netlify.
- Build Vite, set env goi API.
- Kiem tra dang nhap, redirect, goi API.

### Buoc 5: Cau hinh OAuth + Domain

- Cap nhat redirect URL cho Google/GitHub/Slack.
- Gan domain cho frontend va backend.

### Buoc 6: Van hanh

- Bat logs, theo doi errors.
- Dat backup DB (auto).
- Theo doi chi phi va gioi han free tier.
