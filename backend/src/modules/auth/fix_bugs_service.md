# Tong hop huong xu ly issue OAuth + trung lap normalizeEmail

## 1) Khong hien toast khi lien ket Google/GitHub/Slack bi loi

### Hien tuong

- Dang nhap bang email/mat khau, sau do lien ket Google/GitHub/Slack.
- Neu tai khoan ben thu ba da lien ket voi user khac hoac email khong trung, mong muon co toast thong bao.
- Thuc te: toast khong hien tren trang /mail, trong khi lien ket thanh cong thi toast van hien.

### Nguyen nhan nghi ngo

- Toast chi duoc xu ly trong trang callback (GoogleCallbackPage). Neu redirect khong vao /auth/callback?mode=link, hoac component bi unmount truoc khi toast render, thi /mail se khong co thong bao.
- Trong backend, buildOauthErrorRedirect se dua ve /auth/login neu state khong co hoac parse bi loi (khong nhan ra mode=link). Khi do frontend khong xu ly toast lien ket.
- Cac provider deu dung chung /auth/callback, nhung FE chi co 1 component callback (google-callback-page). Neu URL param thieu `mode=link` thi nhanh re vao flow login va khong show toast.

### Cach kiem tra nhanh

- Quan sat URL sau khi OAuth fail: co dung dang /auth/callback?error=...&mode=link hay khong.
- Kiem tra log backend xem state co bi null hoac parse that bai khong.

### Huong giai quyet de xuat

1. Dam bao backend luon redirect ve /auth/callback?error=...&mode=link khi bat ky link flow fail.
    - Neu state bi mat, can fallback mode=link (co the dua them tham so "mode=link" ngay khi tao link URL).
2. Dua xu ly toast ve trang /mail (de giam phu thuoc vao trang callback).
    - VD: callback luu error vao sessionStorage (link_error) roi navigate /mail.
    - MailReceiverPage doc sessionStorage, toast, sau do xoa key.
3. (Optional) Tach mot OAuthCallbackPage dung chung (khong dat ten Google) va xu ly loi/success duoc cho ca 3 provider.

## 2) Trung lap ham normalizeEmail trong google.service.js, github.service.js, slack.service.js

### Hien tuong

- Ca 3 file deu co ham normalizeEmail giong nhau.
- Gay lap code va kho dong bo khi can thay doi rule.

### Huong giai quyet de xuat

1. Tao util dung chung trong common utils, vi du:
    - backend/src/common/utils/normalizeEmail.js
    - export const normalizeEmail = (email) => (email || "").trim().toLowerCase();
2. Import vao 3 service va bo ham local.
3. (Optional) Dung chung normalizeEmail trong auth.service.js (register/login) de giam trung lap.

### Loi ich

- Giam lap code, de maintain, de them rule moi (VD: loai bo dau cham Gmail, validate format) chi can sua 1 noi.

## 3) Trung lap buildOauthState/parseOauthState o cac service OAuth

### Hien tuong

- google.service.js, github.service.js, slack.service.js deu co `buildOauthState` va `parseOauthState` voi logic giong nhau.

### Huong giai quyet de xuat

1. Tao util dung chung trong common utils, vi du:
    - backend/src/common/utils/oauthState.js
    - export const buildOauthState = (options = {}) => { ... }
    - export const parseOauthState = (state) => { ... }
2. Import vao 3 service va loai bo ham local.
3. (Optional) Dung chung parseOauthState trong auth.controller.js de giam lap tiep.

### Loi ich

- Giam lap logic, tranh sai khac giua cac provider, de mo rong/ma hoa state ve sau.
