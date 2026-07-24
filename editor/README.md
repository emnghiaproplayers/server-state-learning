# Optimistic Name Editor: Instant UI Update, Snapshot Rollback & Resync

Ứng dụng React TypeScript quản lý việc chỉnh sửa tên người dùng dựa trên cơ chế **Optimistic Update** kèm **Snapshot Rollback** của TanStack Query (React Query v5). UI cập nhật ngay lập tức khi người dùng lưu, request PATCH gửi ngầm ở nền, và nếu server trả lỗi HTTP 500 thì cache được rollback chính xác về snapshot đã chụp trước lúc ghi.

---

## 1. Challenge Description

Thử thách này yêu cầu làm chủ vòng đời Optimistic Update chuẩn mực của TanStack Query qua 3 mutation hooks:
- **Server State Management:** Query cache `["users"]` là nguồn sự thật duy nhất cho danh sách users (UI đọc trực tiếp từ `useQuery`, không duy trì mảng `useState` cục bộ).
- **Quy trình 4 bước trong `onMutate`:**
  1. Hủy refetch ngầm: `await queryClient.cancelQueries({ queryKey: ["users"] })`.
  2. Chụp snapshot cache: `const previous = queryClient.getQueryData<User[]>(["users"])`.
  3. Ghi giá trị lạc quan vào cache: `queryClient.setQueryData<User[]>(["users"], ...)`.
  4. Trả về snapshot context: `return { previous }`.
- **Instant Rollback trong `onError`:** Khi PATCH nhận HTTP 500, khôi phục cache tức thì bằng `queryClient.setQueryData(["users"], context.previous)`.
- **Eventual Consistency trong `onSettled`:** Luôn gọi `await queryClient.invalidateQueries({ queryKey: ["users"] })` sau mỗi lần mutation (dù thành công hay thất bại) để kích hoạt `GET /users` refetch đồng bộ lại với server.
- **`retry: false`:** Tắt retry tự động cho mutation để quan sát ngay lập tức phản ứng rollback khi gặp lỗi 500.

---

## 2. How to Run

### A. Khởi chạy Backend NestJS Server (Port 3000)
1. Truy cập thư mục `backend`:
   ```bash
   cd backend
   ```
2. Khởi chạy server:
   ```bash
   npm run build
   node dist/main.js
   ```
   *(Backend chạy tại `http://localhost:3000`)*

### B. Khởi chạy Frontend Editor App (Port 5173 / Port Vite)
1. Truy cập thư mục `editor`:
   ```bash
   cd editor
   ```
2. Khởi chạy Vite dev server:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại: `http://localhost:5173`

---

## 3. Architecture/Stack

* **Frontend Framework:** React 19, TypeScript, Vite.
* **State Management:** TanStack React Query v5 (`@tanstack/react-query` & `@tanstack/react-query-devtools`) với `mutations: { retry: false }`.
* **Icons & UI:** Lucide React icons, Vanilla Glassmorphism CSS với status indicators và skeleton pulse.
* **Backend API:** NestJS (In-memory `UsersModule` cung cấp `GET /users` và `PATCH /users/:id?fail=true` với delay 600ms giả lập).

---

## 4. Evidence

Kết quả kiểm thử thực tế từ Terminal & Network log kết nối trực tiếp với backend server:

```text
1. Initial GET /users:
[
  { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
]

2. Success Mutation (HTTP 200 OK):
PATCH http://localhost:3000/users/1 -> Body: { name: 'Alice Permanent' }
Response Status: 200 OK -> { id: 1, name: 'Alice Permanent', email: 'alice@example.com' }

3. Failed Mutation (HTTP 500 Internal Server Error & Instant Rollback):
PATCH http://localhost:3000/users/1?fail=true -> Body: { name: 'Alice Failed', fail: true }
Response Status: 500 Internal Server Error -> { message: 'Simulated Server Error 500: Forced failure for optimistic rollback test' }

4. Resynced GET /users after onSettled:
[
  { id: 1, name: 'Alice Permanent', email: 'alice@example.com' },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
]
```

---

## 5. Hook Execution Trace

Mã nguồn thực tế triển khai 3 mutation hooks trong [UserEditor.tsx](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/components/UserEditor.tsx#L38-L72):

```typescript
  const mutation = useMutation({
    mutationFn: updateUserName,

    // Step 1: onMutate runs BEFORE the network request is sent
    onMutate: async (newUserData) => {
      setLastActionResult('Optimistic write applied to cache...');

      // 1.1 Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['users'] });

      // 1.2 Snapshot the previous value from Query Cache
      const previous = queryClient.getQueryData<User[]>(['users']);

      // 1.3 Optimistically update the query cache immediately
      queryClient.setQueryData<User[]>(['users'], (old = []) =>
        old.map((user) =>
          user.id === newUserData.id ? { ...user, name: newUserData.name } : user,
        ),
      );

      // 1.4 Return snapshot context for rollback in onError
      return { previous };
    },

    // Step 2: onError runs if the network request fails (e.g., HTTP 500 error)
    onError: (_err, _newUserData, context) => {
      setLastActionResult('Failed (HTTP 500)! Rolling back cache to snapshot...');

      // Rollback query cache to captured snapshot
      if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous);
      }
    },

    // Step 3: onSettled runs after success OR failure to resync with server
    onSettled: async () => {
      // Invalidate to trigger GET /users refetch and ensure cache convergence
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
```

### Trích đoạn gọi hàm API phơi bày lỗi 500:
- [api.ts:16-36](file:///d:/Nghia-project/escape-beta/server-state-learning/editor/src/lib/api.ts#L16-L36): Hàm `updateUserName` gửi `PATCH /users/:id?fail=true` và throw error khi `!res.ok`.
- [users.controller.ts:41-62](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/users/users.controller.ts#L41-L62): NestJS Controller ném `InternalServerErrorException` (HTTP 500) khi `failQuery === 'true'`.

---

## 6. Design Decisions

### A. Tại sao `cancelQueries` phải chạy đầu tiên trong `onMutate`?
Việc gọi `await queryClient.cancelQueries({ queryKey: ['users'] })` trước tiên có 2 tác dụng bắt buộc:
1. Đảm bảo bất kỳ request `GET /users` nào đang bay ở nền (in-flight request) đều bị hủy, tránh việc response cũ đáp xuống sau `onMutate` và đè mất dữ liệu optimistic write.
2. Đảm bảo dữ liệu thu được qua `queryClient.getQueryData(['users'])` ở bước 2 chính là snapshot nguyên bản tĩnh nhất trước khi thực hiện ghi đè.

### B. Tại sao Rollback trong `onError` sử dụng `context.previous` thay vì refetch?
- **Tốc độ phản hồi (0ms delay):** Khôi phục dữ liệu ngay lập tức tại local cache qua `setQueryData(['users'], context.previous)` giúp UI trả về ngay tên snapshot cũ mà không chờ đợi mạng.
- **Tránh nhân đôi lỗi mạng:** Nếu server đang trả 500 (quá tải hoặc sập DB), việc cố gắng gọi lại `fetchUsers` ngay trong `onError` sẽ tiếp tục thất bại và tăng áp lực lên backend.

### C. Lý do `onSettled` luôn gọi `invalidateQueries` ở cả hai nhánh?
`onSettled` đảm bảo tính nhất quán cuối cùng (Eventual Consistency). Dù mutation thành công hay thất bại (đã rollback), việc phát lệnh `invalidateQueries` giúp TanStack Query thực hiện refetch ngầm từ server để xác nhận và làm mịn (reconcile) cache client với trạng thái thực tế trên server.
