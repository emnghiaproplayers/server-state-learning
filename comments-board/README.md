# Comments Board: TanStack Query Mutation & Invalidation Flow

Ứng dụng React TypeScript hiển thị và quản lý danh sách Comment theo cơ chế Server State sở hữu bởi TanStack Query (React Query v5). Mọi thao tác thêm và xóa comment đều được thực hiện thông qua `useMutation` và bẫy `onSuccess` duy nhất là `queryClient.invalidateQueries({ queryKey: ["comments"] })`. Ứng dụng **tuyệt đối không** đụng tới `setState` thủ công cho danh sách hay vá cache bằng `setQueryData`.

---

## 1. Challenge Description

Bài học này xây dựng một luồng ghi và đồng bộ trạng thái máy chủ chuẩn mực (Mutation -> Invalidation -> Background Refetch -> UI Sync):
- **Server State Owner:** TanStack Query trực tiếp quản lý cache với query key `["comments"]`.
- **Pure Mutation Graph:** Không có bất kỳ bản sao local state (`useState`) nào lưu giữ mảng comments.
- **Strict Invalidation:** Sau khi `createComment` hoặc `deleteComment` thành công, `queryClient.invalidateQueries` đánh dấu query `["comments"]` là `stale` để TanStack Query tự động trigger ngầm request `GET /comments`.
- **Observability:** Hiển thị trực quan hai trạng thái độc lập:
  - `write-status`: Phản ánh `createMut.isPending` (`saving` | `idle`).
  - `list-status`: Phản ánh `isFetching` từ `useQuery` (`refreshing` | `idle`).
- **Stale-While-Revalidate:** Khi danh sách refetch sau invalidation, các dòng hiện có ở lại trên màn hình mà không làm rơi UI về skeleton loader.

---

## 2. How to Run

### A. Khởi chạy Backend (NestJS Server - Port 3000)
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Khởi chạy backend dev server:
   ```bash
   npm run build
   node dist/main.js
   ```
   *(Backend sẽ chạy tại `http://localhost:3000`)*

### B. Khởi chạy Frontend (React + Vite - Port 5173)
1. Di chuyển vào thư mục `comments-board`:
   ```bash
   cd comments-board
   ```
2. Cài đặt các thư viện phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
3. Khởi chạy Vite development server:
   ```bash
   npm run dev
   ```
4. Truy cập trình duyệt tại: `http://localhost:5173`

---

## 3. Architecture/Stack

* **Frontend Framework:** React 19, TypeScript, Vite.
* **Server State Management:** TanStack React Query (`@tanstack/react-query` & `@tanstack/react-query-devtools`).
* **Icons & Styling:** Lucide React, Modern Glassmorphic Dark CSS với hiệu ứng Tailwind-compatible (`animate-pulse`).
* **Backend API:** NestJS (In-memory `CommentsModule` phục vụ REST endpoints `GET /comments`, `POST /comments`, `DELETE /comments/:id`).

---

## 4. Smoke Test

Kết quả kiểm thử thực tế từ Terminal kết nối trực tiếp với backend server:

```text
1. Initial GET: []
2. Created C1: {
  id: 1,
  author: 'Alice',
  body: 'Testing TanStack Query invalidation graph'
}
3. Created C2: { id: 2, author: 'Bob', body: 'Second comment for testing delete' }
4. GET after creation: [
  {
    id: 1,
    author: 'Alice',
    body: 'Testing TanStack Query invalidation graph'
  },
  { id: 2, author: 'Bob', body: 'Second comment for testing delete' }
]
5. GET after deleting C1: [ { id: 2, author: 'Bob', body: 'Second comment for testing delete' } ]
```

---

## 5. Code Execution Trace

Hành trình chi tiết từ khi người dùng submit form thêm comment cho đến khi UI cập nhật hoàn tất:

1. **User Submit Form:**
   - Người dùng điền thông tin và bấm nút Post Comment.
   - [CommentsBoard.tsx:43](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L43) -> Hàm `handleSubmit` gọi `createMut.mutate({ author, body })`.
2. **Kích hoạt Mutation & Cập nhật Write Status:**
   - [CommentsBoard.tsx:24](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L24) -> `useMutation` chuyển sang trạng thái `isPending = true`.
   - [CommentsBoard.tsx:58](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L58) -> Element `<span data-testid="write-status">` cập nhật nội dung sang `"saving"`, nút Submit bị `disabled`.
3. **Thực thi HTTP Request POST:**
   - [api.ts:14](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/lib/api.ts#L14) -> Hàm `createComment(dto)` gửi HTTP POST tới `http://localhost:3000/comments`.
   - [comments.controller.ts:19](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/comments/comments.controller.ts#L19) -> NestJS Controller nhận request, thêm comment mới và phản hồi với HTTP Status 201 cùng object comment vừa tạo.
4. **Kích hoạt Cache Invalidation tại onSuccess:**
   - [CommentsBoard.tsx:27](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L27) -> Callback `onSuccess` của `createMut` chạy: gọi `queryClient.invalidateQueries({ queryKey: ["comments"] })` và reset form state (`setAuthor('')`, `setBody('')`).
5. **Background Refetch & Cập nhật List Status:**
   - Query key `["comments"]` bị đánh dấu `stale`. TanStack Query tự động gọi lại `fetchComments()` ngầm.
   - [CommentsBoard.tsx:16](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L16) -> `isFetching` của `useQuery` đổi thành `true`.
   - [CommentsBoard.tsx:69](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L69) -> Element `<span data-testid="list-status">` chuyển sang `"refreshing"`. Các dòng comment cũ vẫn giữ trên màn hình (Stale-While-Revalidate), không bị thay thế bởi Skeleton.
6. **Re-render DOM với Dữ liệu mới:**
   - Request `GET /comments` hoàn tất, `useQuery` cập nhật `data` và đưa `isFetching` về `false`.
   - [CommentsBoard.tsx:164](file:///d:/Nghia-project/escape-beta/server-state-learning/comments-board/src/components/CommentsBoard.tsx#L164) -> Dòng mới `<li data-testid="comment-1">` được render vào DOM. `write-status` và `list-status` đều quay về `"idle"`.

---

## 6. Design Decisions

### A. Tại sao Invalidation lại tối ưu hơn việc Vá Cache (`setQueryData`) hay `setState` thủ công?
1. **Một nguồn sự thật duy nhất (Single Source of Truth):**
   - Server là nơi nắm giữ dữ liệu thật. Khi gọi `invalidateQueries`, client tin tưởng hoàn toàn dữ liệu trả về từ Server thay vì tự suy đoán mảng dữ liệu sau khi sửa đổi.
2. **Loại bỏ nguy cơ lệch dữ liệu (Out-of-Sync Risk):**
   - Nếu backend có các logic tính toán phụ (ví dụ: gán timestamp, auto-increment ID, hay trigger sanitize text), việc push thủ công ở client sẽ làm sai lệch dữ liệu thực tế trên server.
3. **Mã nguồn ngắn gọn và dễ bảo trì:**
   - Developer không cần viết hàng chục dòng code thao tác mảng phức tạp (`map`, `filter`, `concat` trong cache handler). Chỉ cần 1 dòng `invalidateQueries`, toàn bộ UI tự động nhận dữ liệu mới nhất.
