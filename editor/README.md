# Optimistic Name Editor: Instant UI Update, Snapshot Rollback & Resync

Ứng dụng React TypeScript chỉnh sửa tên người dùng dựa trên cơ chế **Optimistic Update** kèm **Rollback** chính xác của TanStack Query (React Query v5). UI cập nhật tên mới ngay lập tức khi bấm lưu (onMutate), request PATCH gửi ngầm ở nền, và nếu server trả lỗi HTTP 500 thì cache được rollback ngay lập tức về snapshot đã chụp trước lúc ghi mà không cần đụng tới local `useState`.

---

## 1. Challenge Description

Bài học này làm chủ vòng đời Optimistic Update hoàn chỉnh qua 3 mutation hooks của TanStack Query:
- **Query Cache làm Single Source of Truth:** UI render danh sách users trực tiếp từ cache của `useQuery(["users"])`, không giữ bản sao local state riêng biệt.
- **Snapshot capture trong `onMutate`:** TRƯỚC KHI ghi giá trị mới vào cache, `onMutate` thực hiện hủy các query đang chạy (`cancelQueries`), chụp snapshot dữ liệu hiện tại bằng `getQueryData(["users"])`, sau đó mới ghi giá trị mới qua `setQueryData(["users"], optimisticNext)`.
- **Instant Rollback trong `onError`:** Khi server trả lỗi HTTP 500, `onError` khôi phục dữ liệu cache về chính xác `context.previousUsers` đã chụp trong `onMutate`, không gửi thêm request mạng để undo.
- **Cache Resync trong `onSettled`:** Sau khi kết thúc mutation (cả khi thành công 200 lẫn khi thất bại 500), `onSettled` gọi `invalidateQueries(["users"])` để kích hoạt `GET /users` refetch ngầm, đảm bảo cache client hội tụ 100% với server.
- **`retry: false`:** Cấu hình mutation không thử lại tự động để hành vi rollback diễn ra tức thì và có thể quan sát được ngay.

---

## 2. How to Run

### A. Khởi chạy Backend (NestJS Server - Port 3000)
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Khởi chạy server:
   ```bash
   npm run build
   node dist/main.js
   ```
   *(Backend chạy tại `http://localhost:3000`)*

### B. Khởi chạy Frontend (`editor` App - Port 5173 / Port Vite)
1. Di chuyển vào thư mục `editor`:
   ```bash
   cd editor
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy Vite dev server:
   ```bash
   npm run dev
   ```
4. Truy cập trình duyệt tại: `http://localhost:5173`

---

## 3. Architecture/Stack

* **Frontend:** React 19, TypeScript, Vite.
* **Server State:** TanStack React Query (`@tanstack/react-query` v5 & Devtools) với `mutations: { retry: false }`.
* **Icons & Styling:** Lucide React icons, Glassmorphism Dark CSS với hiệu ứng animation pulse & spinner.
* **Backend:** NestJS (`UsersModule` phục vụ REST endpoints `GET /users` và `PATCH /users/:id` kèm cờ `?fail=true` ném lỗi HTTP 500 giả lập và delay 600ms).

---

## 4. Evidence (Terminal Logs & Network Test Output)

Kết quả kiểm thử thực tế từ Terminal kết nối tới backend server:

```text
1. Initial Users: [
  { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
]

2. PATCH 200 Success: { id: 1, name: 'Alice Permanent', email: 'alice@example.com' }

3. PATCH 500 Fail Status: 500 Error Body: {
  message: 'Simulated Server Error 500: Forced failure for optimistic rollback test',
  error: 'Internal Server Error',
  statusCode: 500
}

4. Resynced GET /users after settle: [
  { id: 1, name: 'Alice Permanent', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
]
```

### Bối cảnh Quan sát Trực quan trên Browser:
1. **Trường hợp 1 (Force 500 = OFF - Flow 200 Success):**
   - Nhấn Save -> Tên trong danh sách đổi NGAY LẬP TỨC sang tên mới (chưa chờ response).
   - `mutation-status` chuyển `Saving (Optimistic)`.
   - Sau 600ms, request PATCH trả về 200 OK -> `onSettled` kích hoạt `GET /users` refetch ngầm, `query-status` chớp `Refetching (GET /users)`.
2. **Trường hợp 2 (Force 500 = ON - Flow 500 Rollback):**
   - Tích chọn checkbox *Force Server Error HTTP 500* và nhấn Save.
   - UI lập tức hiện tên mới (Optimistic update).
   - Sau 600ms, server trả lỗi HTTP 500 -> `onError` lập tức rollback tên trong danh sách về đúng tên ban đầu (`context.previousUsers`).
   - `mutation-status` chuyển `Error 500 (Rolled Back)`.
   - `onSettled` tiếp tục gọi `GET /users` refetch để đảm bảo tính nhất quán tuyệt đối.

---

## 5. Hook Execution Trace

Chi tiết thứ tự thực thi của 3 mutation hook trong ứng dụng:

1. **Trigger Mutation tại Form Submit:**
   - [UserEditor.tsx:75](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L75) -> Hàm `handleSubmit` gọi `mutation.mutate({ id: selectedUserId, name: inputName, fail: forceFail })`.
2. **Thực thi `onMutate` (Trước khi gửi Network Request):**
   - [UserEditor.tsx:32](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L32) -> Bước 1: `await queryClient.cancelQueries({ queryKey: ["users"] })` hủy các refetch đang bay để không ghi đè giá trị optimistic.
   - [UserEditor.tsx:35](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L35) -> Bước 2: `const previousUsers = queryClient.getQueryData<User[]>(["users"])` chụp snapshot cache hiện tại.
   - [UserEditor.tsx:38](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L38) -> Bước 3: `queryClient.setQueryData<User[]>(["users"], ...)` ghi giá trị optimistic làm UI đổi ngay tức thì.
   - [UserEditor.tsx:45](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L45) -> Bước 4: Return `{ previousUsers }` trả về context cho `onError`.
3. **Thực thi Network Call PATCH /users/:id:**
   - [api.ts:16](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/lib/api.ts#L16) -> Hàm `updateUserName` gửi HTTP PATCH tới `${BASE_URL}/users/${id}`.
   - [users.controller.ts:41](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/users/users.controller.ts#L41) -> NestJS Controller tiếp nhận request. Nếu `fail === true`, throw `InternalServerErrorException` (HTTP 500).
4. **Xử lý Lỗi tại `onError` (Rollback):**
   - [UserEditor.tsx:49](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L49) -> Nhận lỗi HTTP 500 từ server.
   - [UserEditor.tsx:54](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L54) -> Tháo nắp snapshot: `queryClient.setQueryData(["users"], context.previousUsers)` khôi phục dữ liệu cache về đúng trạng thái trước khi bấm Save.
5. **Điều hòa Trạng thái tại `onSettled` (Resync):**
   - [UserEditor.tsx:60](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L60) -> Chạy ở CẢ hai kết cục (Success hoặc Error): `await queryClient.invalidateQueries({ queryKey: ["users"] })` phát lệnh refetch ngầm `GET /users` để điều hòa cache 100% đồng bộ với server.

---

## 6. Design Decisions

### A. Tại sao `cancelQueries` bắt buộc phải chạy ĐẦU TIÊN trong `onMutate`?
Nếu không gọi `cancelQueries` trước, một request `GET /users` đang bay ở nền (ví dụ do window focus hoặc refetch định kỳ) có thể phản hồi và đè dữ liệu server cũ lên cache **sau khi** bạn vừa ghi optimistic write. Đồng thời, việc `cancelQueries` trước giúp chụp snapshot `getQueryData` chuẩn xác nhất trước khi thực hiện biến đổi.

### B. Tại sao Rollback trong `onError` dùng `setQueryData` thay vì gọi lại API để undo?
- **Tốc độ (Instant Rollback):** Rollback cục bộ bằng `setQueryData(["users"], context.previousUsers)` phản hồi ngay lập tức (0ms delay), giúp người dùng thấy UI trả lại tên cũ ngay khi server báo lỗi.
- **Tránh quá tải mạng:** Nếu backend đang gặp sự cố 500, việc tiếp tục bắn thêm request GET/PATCH để khôi phục sẽ làm tăng tải cho server đang nghẽn.

### C. Lý do `onSettled` luôn gọi `invalidateQueries` bất kể thành công hay thất bại?
`onSettled` đóng vai trò là "chốt hạ đồng bộ" (Eventual Consistency). Dù ghi thành công hay thất bại rollback, việc phát lệnh `invalidateQueries` giúp TanStack Query lấy lại bản snapshot chính thức từ server, loại bỏ triệt để bất kỳ sự lệch lạc dữ liệu nào do race condition gây ra.
