# Server State Learning: React Query Comments, Authenticated Real-time Chat, Product Feed Cursor Pagination & Full-List Optimistic Task Board

Hệ thống kết hợp quản lý trạng thái máy chủ (Server State) bằng TanStack Query (React Query) ở phía Client, giao tiếp thời gian thực bảo mật cao (Socket.IO với JWT Authentication), phân trang sản phẩm dạng Cursor Infinite Feed, và **Task Board di chuyển phần tử với Optimistic Update và Rollback bằng Snapshot toàn bộ danh sách**.

---

## 1. Challenge Description

Hệ thống bao gồm 6 phần tích hợp chính:

1. **Scaffold NestJS CommentsModule:**
   - Xây dựng cụm API in-memory quản lý comments với 3 endpoints chính: `GET /comments`, `POST /comments` (với ValidationPipe chống body thiếu dữ liệu), và `DELETE /comments/:id`.
2. **Next.js & TanStack Query Mutation:**
   - Cấu hình `QueryClient` với `staleTime: 10_000` và `gcTime: 60_000` chống trùng lặp cache.
   - Sử dụng `useQuery` và `useMutation` để tạo comment và tự động kích hoạt invalidate cache (`invalidateQueries`).
3. **Delete Mutation & E2E Testing:**
   - Tích hợp tính năng xóa comment kèm kiểm thử tự động bằng Playwright.
4. **HTML Client & JWT authenticated Socket.IO connection:**
   - Xây dựng giao diện chat tĩnh kết nối Socket.IO bảo mật bằng JSON Web Token (JWT).
5. **Product Feed với Cursor Pagination & useInfiniteQuery:**
   - Endpoint `GET /products?cursor=<n>&limit=<n>` phân trang theo cursor, trả về `{ data: Product[], nextCursor: number | null }`.
   - Seed 25 sản phẩm in-memory. Ở trang cuối cùng, `nextCursor` BẮT BUỘC trả về `null`.
   - Phía Client bọc `useInfiniteQuery` tích lũy dữ liệu vào mảng `query.data.pages.flatMap((p) => p.data)` mà không sao chép dữ liệu vào `useState` cục bộ.
6. **Task Board Optimistic Reordering với Full-List Snapshot Rollback:**
   - Endpoint `PATCH /tasks/:id/move` nhận `{ toColumn, toIndex }`, hỗ trợ query param `?fail=true` ép trả về 500 với delay 600ms.
   - Trong `onMutate`: thực hiện theo đúng thứ tự 3 bước `await cancelQueries({ queryKey: ["tasks"] })`, `const previous = getQueryData<Task[]>(["tasks"])`, và `setQueryData(["tasks"], (old) => old ? reorder(old, vars) : old)`.
   - Helper `reorder(old, vars)` là hàm thuần (pure function) tạo bản sao mảng mới (`old.map(t => ({...t}))`), tuyệt đối không sửa đổi reference của cache cũ.
   - Trong `onError`: khôi phục **CẢ DANH SÁCH** `if (context?.previous) setQueryData(["tasks"], context.previous)`.
   - Trong `onSettled`: kích hoạt `invalidateQueries({ queryKey: ["tasks"] })` để đồng bộ lại sự thật từ server.

---

## 2. How to Run

### A. Chuẩn bị Cơ sở dữ liệu (PostgreSQL)
```bash
docker compose up -d
```

### B. Khởi chạy Backend (NestJS Server)
```bash
cd backend
npm install
npm run start:dev
```
Backend khởi chạy tại: `http://localhost:3000`

### C. Khởi chạy Frontend (Next.js Application)
```bash
cd ../frontend
npm install
npm run dev
```
Frontend khởi chạy tại: `http://localhost:3001`

---

## 3. Architecture/Stack

* **Frontend:** Next.js 14 (App Router), React 18, TanStack Query v5 (`useQuery`, `useMutation`, `useInfiniteQuery`), Formik, React-Hot-Toast, TailwindCSS.
* **Backend:** NestJS 11 (`TasksModule`, `ProductsModule`, `CommentsModule`, `UsersModule`), TypeORM, ValidationPipe, PostgreSQL (`pg`), Socket.IO Gateway, JWT, Bcrypt.
* **E2E Testing:** Playwright Test (Chromium).

---

## 4. Smoke Test & E2E Test Results

### A. Results of Playwright E2E Tests for Optimistic Reorder & Rollback
```text
Running 2 tests using 1 worker

  ✓ 1 [chromium] › e2e/tasks-optimistic-reorder.spec.ts:5:7 › Task Board Optimistic Reorder & Rollback › Spec 1: Successful move updates UI instantly and persists after server response (1.6s)
  ✓ 2 [chromium] › e2e/tasks-optimistic-reorder.spec.ts:30:7 › Task Board Optimistic Reorder & Rollback › Spec 2: Rollback move reverts ENTIRE list snapshot when server returns HTTP 500 (1.8s)

  2 passed (4.2s)
```

### B. Curl Smoke Test Results for Endpoint `PATCH /tasks/:id/move`

#### 1. Move Thành Công (Normal Case)
- **Request:** `PATCH http://localhost:3000/tasks/task-1/move` với Body `{ "toColumn": "in_progress", "toIndex": 0 }`
- **Response status:** `200 OK` (sau 600ms delay)
- **Response Body:**
```json
{
  "id": "task-1",
  "title": "Nghiên cứu TanStack Query v5 optimistic updates",
  "columnId": "in_progress",
  "order": 0
}
```

#### 2. Move Thất Bại (Force 500 Rollback Case với `?fail=true`)
- **Request:** `PATCH http://localhost:3000/tasks/task-1/move?fail=true` với Body `{ "toColumn": "in_progress", "toIndex": 0 }`
- **Response status:** `500 Internal Server Error`
- **Response Body:**
```json
{
  "statusCode": 500,
  "message": "Server Error: Failed to process move request on backend"
}
```
*Ghi chú: Phía client bắt lỗi HTTP 500 trong `mutationFn` (thông qua `throw`), kích hoạt `onError` ghi lại snapshot `context.previous` (cả mảng `Task[]`), đưa tất cả các phần tử bị dịch trở lại cột và vị trí ban đầu một cách hoàn hảo.*

---

## 5. Code Execution Trace

Luồng thực thi khi người dùng click di chuyển Task trên Task Board:

1. **Người dùng click di chuyển task trên giao diện:**
   - [task-board.tsx:64](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L64) -> Gọi `moveMutation.mutate({ taskId, toColumn, toIndex, fail })`.
2. **Kích hoạt `onMutate` phía Client:**
   - [task-board.tsx:28](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L28) -> `await queryClient.cancelQueries({ queryKey: ["tasks"] })` tạm dừng các query đang chạy.
   - [task-board.tsx:31](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L31) -> Lấy snapshot toàn mảng `const previous = queryClient.getQueryData<Task[]>(["tasks"])`.
   - [task-board.tsx:34](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L34) -> Cập nhật optimistic cache `queryClient.setQueryData(["tasks"], (old) => old ? reorder(old, vars) : old)`.
   - [tasks.ts:40](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/lib/tasks.ts#L40) -> Hàm thuần `reorder` clone mảng mới (`old.map(t => ({...t}))`) và sắp xếp lại vị trí.
3. **Gọi API mutationFn xuống Backend:**
   - [tasks.ts:25](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/lib/tasks.ts#L25) -> Gọi `PATCH /tasks/:id/move${fail ? '?fail=true' : ''}`. Ném lỗi nếu `!res.ok`.
4. **Tiếp nhận tại Backend Controller & Service:**
   - [tasks.controller.ts:14](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/tasks/tasks.controller.ts#L14) -> `@Patch(':id/move')` nhận `@Param('id')`, `@Query('fail')`, `@Body() dto`.
   - [tasks.service.ts:28](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/tasks/tasks.service.ts#L28) -> Nếu `fail=true`, ném `HttpException(500)`. Nếu thành công, delay 600ms, di chuyển task, tính lại `order` và trả về `Task`.
5. **Xử lý Rollback / Success tại Client Hook:**
   - [task-board.tsx:43](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L43) -> Khi gặp lỗi 500, `onError` khôi phục `queryClient.setQueryData(["tasks"], context.previous)`.
   - [task-board.tsx:52](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/task-board.tsx#L52) -> `onSettled` luôn gọi `queryClient.invalidateQueries({ queryKey: ["tasks"] })` để hội tụ cache về dữ liệu thực trên server.

---

## 6. Design Decisions

### So sánh Snapshot Một Trường (Bài Easy) vs Snapshot Cả Danh Sách (Bài Challenge này)
- **Snapshot một trường (Easy Tier)**: Chỉ lưu lại giá trị cũ của đúng phần tử được thao tác (ví dụ: `previousUser = { name: "Old Name" }`). Phù hợp khi thao tác là độc lập và không ảnh hưởng đến các bản ghi khác trong cache.
- **Snapshot cả danh sách (Challenge Tier)**: Lưu giữ toàn bộ mảng `Task[]` trước mutation (`previous = getQueryData<Task[]>(["tasks"])`).
  - **Tại sao bắt buộc?** Khi di chuyển một Task sang cột khác hoặc vị trí mới, `order` và `columnId` của **nhiều Task khác (sibling tasks)** bị dịch chuyển đồng thời. Nếu chỉ snapshot đúng 1 Task được move, khi rollback dữ liệu của các Task khác sẽ bị lệch và vỡ vị trí hoàn toàn.

### Tại sao `onSettled` phải invalidate thay vì `onSuccess`?
- Nếu đặt `invalidateQueries` duy nhất ở `onSuccess`, nhánh rollback khi xảy ra lỗi `onError` sẽ không bao giờ được gửi lại request để re-sync dữ liệu với server (hội tụ cache). Đặt `invalidateQueries` ở `onSettled` đảm bảo bất kể mutation thành công hay thất bại, cache sẽ luôn được tự động làm mới từ server.

### Tại sao `reorder` phải là Pure Function clone object?
- TanStack Query quản lý cache theo cơ chế so sánh reference object trong React. Nếu gọi `.splice()` hoặc gán thuộc tính trực tiếp lên đối tượng trong cache `old`, cả mảng `old` lẫn snapshot `previous` sẽ bị biến đổi đồng thời (do dùng chung reference), dẫn đến việc `onError` rollback không còn tác dụng. Việc clone `old.map(t => ({...t}))` đảm bảo ngắt hoàn toàn reference.
