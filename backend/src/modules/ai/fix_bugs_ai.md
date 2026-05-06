# Plan fix bugs AI floating chat (FE + BE + business)

## Muc tieu

- Loai bo rui ro XSS khi hien thi noi dung AI
- Quan ly vong doi stream SSE an toan, khong leak
- Xu ly an toan khi response stream bi rong/bi chan
- Lam chac phan xu ly response cua Gemini o BE
- Clamp gioi han truy van va validate args tool
- Tinh chinh instruction de tranh tao task ngoai y muon

## Pham vi va file can cham

- FE: frontend/src/features/ai-chat/components/FloatingChat.jsx
- FE: frontend/src/features/ai-chat/api/ai.api.js
- BE: backend/src/modules/ai/ai.service.js
- (Tuy chon) BE: backend/src/modules/ai/tools.js

## Ke hoach chi tiet

### 1) FE - Chuyen tu dangerouslySetInnerHTML sang Markdown an toan

- Cai dat deps: react-markdown, remark-gfm
- Thay the formatContent() + dangerouslySetInnerHTML bang <ReactMarkdown>
- Giam thieu ro ri XSS, giu render markdown dep mat
- Kiem tra cac format: **bold**, _italic_, `code`, list, line break

### 2) FE - Quan ly vong doi stream bang AbortController

- Tao AbortController trong FloatingChat khi goi streamAiChat
- Khi dong chat hoac unmount component, goi controller.abort()
- Neu co stream dang chay, huy truoc khi mo stream moi
- Dam bao khong setState khi component da unmount

### 3) FE - Guard khi response body bi rong

- Trong streamAiChat, kiem tra response.body truoc getReader()
- Neu body null/undefined, throw loi ro rang
- onError hien thi thong bao than thien

### 4) BE - Kiem tra candidates an toan

- Dung optional chaining khi truy cap candidates[0].content.parts
- Neu parts rong, tra SSE error co kiem soat (khong crash)
- Giu log de debug truong hop bi safety block

### 5) BE - Clamp limit getTasks

- Tao safeLimit = clamp 1..50
- Su dung safeLimit thay cho call.args.limit
- Ghi log neu limit bi clamp de theo doi hanh vi model

### 6) BE - Validate args tool

- Dung Zod schema cho createTask va getTasks
- Neu sai: tra functionResponse status=error + message ro rang
- De model tu hieu va tu sua lan goi tiep theo

### 7) Business - Tinh chinh systemInstruction

- Cap nhat instruction: chi goi createTask khi user yeu cau ro rang
- Neu thong tin chua du: hoi lai (title/dueDate) truoc khi goi tool
- Giu ngon ngu tieng Viet, phong cach lich su

## Thu tu thuc hien (uu tien)

1. FE: XSS fix (react-markdown)
2. FE: AbortController + cleanup
3. FE: Guard response.body
4. BE: candidates guard
5. BE: clamp limit
6. BE: validate args
7. Business: prompt tuning

## Checklist verify

- Chat hien thi markdown dung, khong thuc thi HTML doc hai
- Dong khung chat thi stream dung ngay
- Response body null thi hien thong bao loi, app khong crash
- Gemini bi block safety: BE tra SSE error, FE hien thong bao
- getTasks limit > 50 bi clamp
- args sai dinh dang: AI nhan thong bao loi va tu dieu chinh
- Cau noi mo ho khong tu tao task
