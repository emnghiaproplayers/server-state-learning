# Server State Learning: React Query Comments & Authenticated Real-time Chat

Hệ thống kết hợp quản lý trạng thái máy chủ (Server State) bằng TanStack Query (React Query) ở phía Client và giao tiếp thời gian thực bảo mật cao (Socket.IO with JWT Authentication) ở phía Backend.

---

## 1. Challenge Description

Thử thách này bao gồm 4 phần tích hợp:
1. **Scaffold NestJS CommentsModule:**
   - Xây dựng cụm API in-memory quản lý comments với 3 endpoints chính: `GET /comments`, `POST /comments` (với ValidationPipe chống body thiếu dữ liệu), và `DELETE /comments/:id`.
2. **Next.js & TanStack Query Mutation:**
   - Cấu hình `QueryClient` với `staleTime: 10_000` và `gcTime: 60_000` chống trùng lặp cache.
   - Sử dụng `useQuery` và `useMutation` để tạo comment và tự động kích hoạt invalidate cache (`invalidateQueries`).
   - Sử dụng Formik quản lý form và kiểm tra dữ liệu đầu vào phía client.
3. **Delete Mutation & E2E Testing:**
   - Tích hợp tính năng xóa comment kèm kiểm thử tự động bằng Playwright (`flow-1` và `flow-2` và `flow-3`).
4. **HTML Client & JWT authenticated Socket.IO connection:**
   - Xây dựng giao diện chat tĩnh kết nối Socket.IO bảo mật bằng JSON Web Token (JWT).
   - Kiểm tra rejection flow khi không có token và authenticated flow khi đã đăng ký/đăng nhập.

---

## 2. How to Run

### A. Chuẩn bị Cơ sở dữ liệu (PostgreSQL)
Chạy lệnh sau tại thư mục gốc dự án để khởi chạy Postgres container phục vụ cho lưu trữ tin nhắn:
```bash
docker compose up -d
```

### B. Khởi chạy Backend (NestJS Server)
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy server ở chế độ phát triển (port 3000):
   ```bash
   npm run start:dev
   ```

### C. Khởi chạy Frontend (Next.js Application)
1. Di chuyển vào thư mục frontend:
   ```bash
   cd ../frontend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy Next.js development server (port 3001):
   ```bash
   npm run dev
   ```

### D. Chạy Chat Client tĩnh
Mở file `.clients/index.html` trực tiếp bằng trình duyệt Web của bạn để tham gia phòng chat real-time.

---

## 3. Architecture/Stack

* **Frontend:** Next.js 14 (App Router), React 18, TanStack Query v5, HeroUI, Formik, React-Hot-Toast.
* **Backend:** NestJS 11, TypeORM, PostgreSQL (`pg`), Socket.IO Gateway, JWT, Bcrypt.
* **E2E Testing:** Playwright Test (Chromium/Google Chrome).

---

## 4. Smoke Test

### A. Kết quả E2E Playwright Tests
Dưới đây là kết quả kiểm thử thực tế từ terminal khi chạy `npx playwright test --project=head --headed` thành công:

```text
Running 3 tests using 1 worker

BROWSER LOG: %cDownload the React DevTools for a better development experience: https://reactjs.org/link/react-devtools font-weight:bold
BROWSER LOG: Failed to load resource: the server responded with a status of 404 (Not Found)
  ok 1 [head] › scripts\flow-1-add-comment-invalidates-list.spec.ts:3:5 › flow 1 - add comment invalidates list (3.0s)
  ok 2 [head] › scripts\flow-2-delete-comment-refreshes-list.spec.ts:3:5 › flow 2 - delete comment refreshes list (2.4s)
  ok 3 [head] › scripts\flow-3-network-get-count.spec.ts:3:5 › flow 3 - count GET /comments calls (1.4s)

  3 passed (38.2s)
```

### B. Kết quả Socket.IO Authentication Flows (Index.html Client)

#### 1. Rejection Flow (Không token / token sai)
Khi click kết nối nhưng chưa Login/Register:
- Socket.IO connection gửi handshake không chứa token hợp lệ.
- Backend reject connection và phát sự kiện `authError`.
- **Giao diện Client:** Hiển thị status **Disconnected** (chấm màu đỏ), log báo lỗi: `"Authentication failed: Missing token"`.

#### 2. Authenticated Flow (Token hợp lệ từ JWT)
Đăng ký tài khoản `alice` và tự động kết nối:
- Frontend nhận được access token JWT từ API `POST /auth/signup`.
- Gửi token qua handshake `auth.token`.
- Backend xác thực thành công, ghi nhận danh tính `alice`.
- **Giao diện Client:** Đổi sang trạng thái **Connected** (chấm màu xanh lá), join phòng chat thành công và gửi tin nhắn bình thường. Username hiển thị trong tin nhắn được trích xuất trực tiếp từ token JWT đã được xác thực ở phía server.

---

## 5. Code Execution Trace

Hành trình của thao tác xóa comment từ giao diện Client cho tới xử lý ở phía Backend:

1. **Kích hoạt sự kiện click nút Delete trên giao diện:**
   - [comments-manager.tsx:171](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/comments-manager.tsx#L171) -> Gọi hàm `removeMutation.mutate(comment.id)`.
2. **Thực thi gọi hàm API Client:**
   - [api.ts:32](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/lib/api.ts#L32) -> Hàm `deleteComment(id)` thực hiện gửi HTTP Request với method `DELETE` tới URL `${BASE_URL}/comments/${id}`.
3. **Tiếp nhận và xử lý tại Backend Controller:**
   - [comments.controller.ts:26](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/comments/comments.controller.ts#L26) -> `@Delete(':id')` bắt request, kiểm tra ID bằng `ParseIntPipe`, chuyển tiếp đến `CommentsService.remove(id)` để xóa bản ghi khỏi bộ nhớ in-memory và trả về status code 204.

---

## 6. Design Decisions

### A. Cache Invalidation trong TanStack Query
Sử dụng phương pháp bẫy sự kiện thành công (`onSuccess`) của Mutation để gọi `qc.invalidateQueries({ queryKey: ['comments'] })`. Điều này đảm bảo dữ liệu hiển thị luôn được đồng bộ tức thì với Server bằng cách gửi ngầm 1 request GET mới để làm mới danh sách mà không cần reload toàn bộ trang.

### B. JWT Authentication cho WebSockets
Thay vì tin tưởng định danh do Client khai báo trong payload chat (dễ bị giả mạo danh tính), chúng ta thiết lập Guard trong hàm kết nối `handleConnection(client: Socket)`. Chỉ khi JWT token gửi kèm handshake được xác thực khớp chữ ký số trên server, kết nối mới được duy trì. Thuộc tính `username` được lưu trữ vào bộ nhớ phiên của socket (`client.data.username`), đảm bảo tính toàn vẹn danh tính.
