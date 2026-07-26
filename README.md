# Server State Learning: React Query Comments, Authenticated Real-time Chat & Product Feed Cursor Pagination

Hệ thống kết hợp quản lý trạng thái máy chủ (Server State) bằng TanStack Query (React Query) ở phía Client, giao tiếp thời gian thực bảo mật cao (Socket.IO with JWT Authentication) và phân trang sản phẩm theo dạng Cursor Infinite Feed ở phía Backend.

---

## 1. Challenge Description

Thử thách này bao gồm 5 phần tích hợp chính:

1. **Scaffold NestJS CommentsModule:**
   - Xây dựng cụm API in-memory quản lý comments với 3 endpoints chính: `GET /comments`, `POST /comments` (với ValidationPipe chống body thiếu dữ liệu), và `DELETE /comments/:id`.
2. **Next.js & TanStack Query Mutation:**
   - Cấu hình `QueryClient` với `staleTime: 10_000` và `gcTime: 60_000` chống trùng lặp cache.
   - Sử dụng `useQuery` và `useMutation` để tạo comment và tự động kích hoạt invalidate cache (`invalidateQueries`).
   - Sử dụng Formik quản lý form và kiểm tra dữ liệu đầu vào phía client.
3. **Delete Mutation & E2E Testing:**
   - Tích hợp tính năng xóa comment kèm kiểm thử tự động bằng Playwright (`flow-1`, `flow-2` và `flow-3`).
4. **HTML Client & JWT authenticated Socket.IO connection:**
   - Xây dựng giao diện chat tĩnh kết nối Socket.IO bảo mật bằng JSON Web Token (JWT).
   - Kiểm tra rejection flow khi không có token và authenticated flow khi đã đăng ký/đăng nhập.
5. **Product Feed với Cursor Pagination & useInfiniteQuery:**
   - Endpoint `GET /products?cursor=<n>&limit=<n>` phân trang theo cursor, trả về `{ data: Product[], nextCursor: number | null }`.
   - Seed 25 sản phẩm in-memory. Ở trang cuối cùng, `nextCursor` BẮT BUỘC trả về `null`.
   - Phía Client bọc `useInfiniteQuery` tích lũy dữ liệu vào mảng `query.data.pages.flatMap((p) => p.data)` mà không sao chép dữ liệu vào `useState` cục bộ.
   - Nút Load More tự động `disabled={!query.hasNextPage || query.isFetchingNextPage}`, dừng cuộn trang sạch sẽ khi `nextCursor` là `null`.

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

### D. Trải nghiệm trên trình duyệt
- Truy cập `http://localhost:3001` để xem Product Feed (Cursor Pagination) và Comments Board.
- Mở file `.clients/index.html` trực tiếp bằng trình duyệt Web để tham gia phòng chat real-time.

---

## 3. Architecture/Stack

* **Frontend:** Next.js 14 (App Router), React 18, TanStack Query v5 (`useInfiniteQuery`), HeroUI, Formik, React-Hot-Toast, TailwindCSS.
* **Backend:** NestJS 11 (`ProductsModule`, `CommentsModule`, `UsersModule`), TypeORM, ValidationPipe, PostgreSQL (`pg`), Socket.IO Gateway, JWT, Bcrypt.
* **E2E Testing:** Playwright Test (Chromium/Google Chrome).

---

## 4. Smoke Test

### A. Kết quả 3 Cặp Request / Response Thật cho Endpoint `GET /products`

#### 1. Page đầu tiên (`cursor=0&limit=5`)
* **Request:** `GET /products?cursor=0&limit=5`
* **Response (HTTP 200 OK):**
```json
{
  "data": [
    { "id": 1, "name": "Product 1 - Premium item #1", "price": 15 },
    { "id": 2, "name": "Product 2 - Premium item #2", "price": 21 },
    { "id": 3, "name": "Product 3 - Premium item #3", "price": 26 },
    { "id": 4, "name": "Product 4 - Premium item #4", "price": 32 },
    { "id": 5, "name": "Product 5 - Premium item #5", "price": 37 }
  ],
  "nextCursor": 5
}
```

#### 2. Page ở giữa (`cursor=10&limit=5`)
* **Request:** `GET /products?cursor=10&limit=5`
* **Response (HTTP 200 OK):**
```json
{
  "data": [
    { "id": 11, "name": "Product 11 - Premium item #11", "price": 70 },
    { "id": 12, "name": "Product 12 - Premium item #12", "price": 76 },
    { "id": 13, "name": "Product 13 - Premium item #13", "price": 81 },
    { "id": 14, "name": "Product 14 - Premium item #14", "price": 87 },
    { "id": 15, "name": "Product 15 - Premium item #15", "price": 92 }
  ],
  "nextCursor": 15
}
```

#### 3. Page cuối cùng (`cursor=20&limit=5`)
* **Request:** `GET /products?cursor=20&limit=5`
* **Response (HTTP 200 OK):**
```json
{
  "data": [
    { "id": 21, "name": "Product 21 - Premium item #21", "price": 125 },
    { "id": 22, "name": "Product 22 - Premium item #22", "price": 131 },
    { "id": 23, "name": "Product 23 - Premium item #23", "price": 136 },
    { "id": 24, "name": "Product 24 - Premium item #24", "price": 142 },
    { "id": 25, "name": "Product 25 - Premium item #25", "price": 147 }
  ],
  "nextCursor": null
}
```
* **Xác nhận nút Load More:** Khi `nextCursor` nhận giá trị `null`, hàm `getNextPageParam` trả về `undefined`, khiến `query.hasNextPage` chuyển thành `false`. Nút Load More bị disable vĩnh viễn và đổi nhãn thành *"No more products"*.

### B. Kết quả E2E Playwright Tests
```text
Running 3 tests using 1 worker

  ok 1 [head] › scripts\flow-1-add-comment-invalidates-list.spec.ts:3:5 › flow 1 - add comment invalidates list (3.0s)
  ok 2 [head] › scripts\flow-2-delete-comment-refreshes-list.spec.ts:3:5 › flow 2 - delete comment refreshes list (2.4s)
  ok 3 [head] › scripts\flow-3-network-get-count.spec.ts:3:5 › flow 3 - count GET /comments calls (1.4s)

  3 passed (38.2s)
```

---

## 5. Code Execution Trace

Hành trình thực thi của một thao tác **Load More** sản phẩm từ Client xuống Backend:

1. **Người dùng nhấp vào nút "Load More" trên giao diện:**
   - [products-feed.tsx:90](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/products-feed.tsx#L90) -> Thực thi hàm `query.fetchNextPage()`.
2. **Hook `useInfiniteQuery` tính toán `pageParam` và gọi `queryFn`:**
   - [products-feed.tsx:10](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/components/products-feed.tsx#L10) -> Hàm `getNextPageParam` đọc `lastPage.nextCursor` của trang trước (ví dụ: `5`), truyền làm `pageParam` cho lượt gọi tiếp theo.
3. **Thực thi gọi API Client:**
   - [api.ts:46](file:///d:/Nghia-project/escape-beta/server-state-learning/frontend/src/lib/api.ts#L46) -> Hàm `fetchProductsPage({ cursor: 5, limit: 5 })` tạo HTTP GET request gửi tới `${BASE_URL}/products?cursor=5&limit=5`.
4. **Tiếp nhận và validate tại Backend Controller:**
   - [products.controller.ts:11](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/products/products.controller.ts#L11) -> `@Get()` tiếp nhận request, `ValidationPipe` tự động ép kiểu `cursor` và `limit` thành kiểu số integer, sau đó chuyển tới `ProductsService.getProducts(cursor, limit)`.
5. **Xử lý cắt dữ liệu và tính Cursor tại Backend Service:**
   - [products.service.ts:20](file:///d:/Nghia-project/escape-beta/server-state-learning/backend/src/products/products.service.ts#L20) -> `ProductsService.getProducts(cursor, limit)` cắt mảng `this.products.slice(start, end)` và trả về cấu trúc `{ data, nextCursor: end < total ? end : null }`.

---

## 6. Design Decisions

### A. Cursor Pagination vs Offset Pagination
- **Offset Pagination (`LIMIT 5 OFFSET 20`)**: Dễ bị nhảy hoặc lặp dữ liệu khi có bản ghi mới được thêm/xóa trong lúc người dùng đang cuộn feed. Đồng thời hiệu năng suy giảm trên tập dữ liệu lớn do DB phải scan qua N dòng offset đầu tiên.
- **Cursor Pagination (`WHERE id > cursor LIMIT 5`)**: Đảm bảo tính ổn định tuyệt đối của feed. Dữ liệu luôn chính xác bất chấp các thao tác thêm/xóa dữ liệu thời gian thực.

### B. Tích lũy Cache trong TanStack Query vs Anti-Pattern `useState`
- **Tích lũy chuẩn theo React Query**: `useInfiniteQuery` lưu giữ mảng các trang dữ liệu trong `query.data.pages`. Lúc render chỉ cần gọi `.flatMap((p) => p.data)`.
- **Tránh Anti-Pattern `useState`**: Không sao chép các phần tử vào mảng `useState` cục bộ thông qua `useEffect`. Việc làm này gây duplicate bộ nhớ, mất tính nhất quán khi cache bị refetch, và sinh ra các re-render không cần thiết.

### C. `nextCursor: null` làm nguồn sự thật duy nhất
- Đỉnh điểm của feed được đánh dấu bằng `nextCursor: null`. Client đọc giá trị này trong `getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined`. Nhờ đó, TanStack Query tự động nhận biết khi nào kết thúc feed và cập nhật `hasNextPage = false`, giúp nút Load More disable một cách tự nhiên mà không cần đến các câu lệnh điều kiện `if` thủ công trong event handler.
