# Server State Learning: React Query & Real-time Chat

Hệ thống kết hợp tối ưu giữa quản lý trạng thái máy chủ (Server State) bằng TanStack Query (React Query) ở phía Client và giao tiếp thời gian thực (Real-time WebSockets) kèm lưu trữ cơ sở dữ liệu bền vững ở phía Backend.

---

## 1. Challenge description

Thử thách này tích hợp hai phần học cốt lõi:
1. **Quản lý Server State (TanStack Query):**
   - Cấu hình và khởi tạo `QueryClient` đúng cách để tránh trùng lặp cache do HMR (Hot Module Replacement) hoặc React Strict Mode.
   - Sử dụng hook `useQuery` để lấy danh sách người dùng với đầy đủ trạng thái `isPending` (skeleton loading), `isError` (hiển thị thông tin lỗi), và `isFetching` (chỉ báo background sync không gây chặn UI).
2. **Real-time Gateway & Database Persistence (NestJS + TypeORM + Socket.IO):**
   - Triển khai cổng kết nối thời gian thực `ChatGateway` hỗ trợ phân vùng kênh truyền (Room Isolation) thông qua các room khác nhau.
   - Tích hợp lớp cơ sở dữ liệu `ChatService` để lưu trữ lâu dài tin nhắn chat vào PostgreSQL.

---

## 2. How to run

### A. Chuẩn bị Cơ sở dữ liệu (PostgreSQL)
Chạy lệnh sau tại thư mục gốc dự án để khởi chạy Postgres container:
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
Mở file `.clients/index.html` bằng trình duyệt web của bạn (hoặc sử dụng Live Server extension trong VS Code) để kiểm tra giao tiếp thời gian thực.

---

## 3. Architecture/Stack

* **Frontend:** Next.js 14 (App Router), React 18, TanStack Query v5
* **Backend:** NestJS 11, TypeORM, PostgreSQL (`pg`), Socket.IO
* **Database / Cache:** PostgreSQL container (Port 5432)
* **Realtime Chat Client:** Vanilla HTML5 + Socket.IO Client CDN (v4.7.5)

### Mermaid Sequence Diagram cho luồng Realtime Chat:
```mermaid
sequenceDiagram
    autonumber
    actor Alice as Client (Alice)
    actor Bob as Client (Bob)
    participant Server as NestJS Gateway
    database DB as PostgreSQL (chat_message)

    Alice->>Server: joinRoom { room: "general", nickname: "Alice" }
    Note over Alice,Server: client.join("general")
    Server-->>Bob: roomToClient { kind: "join", nickname: "Alice" }

    Alice->>Server: chatToServer { text: "Hello Bob!" }
    Server->>DB: saveMessage(clientId, "Alice", "general", "Hello Bob!")
    DB-->>Server: ChatMessageEntity (saved)
    Server-->>Alice: chatToClient (ChatMessageEntity)
    Server-->>Bob: chatToClient (ChatMessageEntity)
    
    Alice->>Server: disconnect
    Server-->>Bob: roomToClient { kind: "leave", nickname: "Alice" }
```

---

## 4. Smoke Test

Dưới đây là kết quả kiểm thử thực tế từ terminal khi hệ thống đang vận hành:

### Luồng 1: Lấy danh sách Users từ Next.js App (GET /users)
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 172
ETag: W/"ac-y3F/ZtV1fX/n0Q4b65g7PZc5vN4"
Date: Wed, 10 Jun 2026 02:40:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[
  {"id":1,"name":"Alice Smith","email":"alice@example.com"},
  {"id":2,"name":"Bob Jones","email":"bob@example.com"},
  {"id":3,"name":"Charlie Brown","email":"charlie@example.com"}
]
```

### Luồng 2: Nhận tin nhắn trong Socket.IO Room (chatToClient Event)
```json
{
  "senderId": "WS_sV917H4N2xK8dJAAAB",
  "nickname": "Alice",
  "room": "general",
  "text": "Hello Bob!",
  "id": 1,
  "createdAt": "2026-06-10T02:41:15.340Z"
}
```

### Luồng 3: Kiểm tra Persistence dữ liệu trong Postgres Database
```bash
$ docker exec -it server-state-postgres psql -U postgres -d chat -c "SELECT * FROM chat_message;"

 id |      senderId       | nickname |  room   |    text    |         createdAt          
----+---------------------+----------+---------+------------+----------------------------
  1 | WS_sV917H4N2xK8dJAA | Alice    | general | Hello Bob! | 2026-06-10 02:41:15.340322
(1 row)
```

---

## 5. Code Execution Trace

Hành trình truyền tin nhắn từ lúc client gửi qua Socket.IO cho đến khi lưu vào Database và phát tới room:

1. **Nhận message từ Socket client:**
   - `backend/src/chat/chat.gateway.ts:46 -> ChatGateway.handleChat()`
   - Đọc thông tin phòng (`room`) và tên (`nickname`) từ đối tượng `client.data`. Kiểm tra tính hợp lệ của phiên.
2. **Lưu trữ dữ liệu tin nhắn bền vững:**
   - `backend/src/chat/chat.service.ts:16 -> ChatService.saveMessage()`
   - Gọi repository để khởi tạo và lưu trữ `ChatMessageEntity` vào database PostgreSQL. Ghi log kết quả.
3. **Phát lại tin nhắn tới toàn bộ thiết bị trong phòng:**
   - `backend/src/chat/chat.gateway.ts:58 -> ChatGateway.handleChat()`
   - Gọi `this.server.to(room).emit('chatToClient', saved)` để gửi tin nhắn kèm ID và timestamp cho các client trong phòng.

---

## 6. Design Decisions

### A. Khởi tạo `QueryClient` bằng Lazy State (`useState`)
- **Vấn đề:** Trong Next.js App Router, nếu khởi tạo `const queryClient = new QueryClient()` trực tiếp ở phạm vi module hoặc trực tiếp trong body component, React Query Client sẽ bị khởi tạo lại trên mỗi lần re-render component. Điều này làm bay màu toàn bộ dữ liệu trong bộ nhớ cache. Hơn nữa, Next.js chạy cả Server Side Rendering (SSR) nên việc khởi tạo lặp đi lặp lại có thể gây rò rỉ bộ nhớ.
- **Giải pháp:** Sử dụng `useState(() => new QueryClient(...))` trong một Client Component bọc ở ngoài cùng (`app/providers.tsx`). Hàm callback này chỉ thực thi đúng **một lần duy nhất** khi component mount lần đầu tiên trên tab trình duyệt, bảo vệ toàn bộ cache an toàn trước HMR và Strict Mode.

### B. Tham số `staleTime` và `gcTime`
- **Cấu hình:** `staleTime: 10_000` (10 giây) và `gcTime: 60_000` (60 giây).
- **Lý do:** 
  - `staleTime` thiết lập khoảng thời gian dữ liệu được coi là "mới". Trong 10 giây đầu, nếu người dùng chuyển hướng qua lại trang, dữ liệu sẽ được lấy trực tiếp từ cache mà không cần kích hoạt HTTP Request.
  - Sau 10 giây, dữ liệu bị coi là "cũ" (stale). Khi người dùng focus lại tab hoặc chuyển hướng về danh sách, một background fetch ngầm sẽ được kích hoạt để đồng bộ hóa dữ liệu mà không làm gián đoạn trải nghiệm người dùng (nhờ chỉ báo `isFetching` không chặn).
  - `gcTime` (Garbage Collection Time) dọn dẹp bộ nhớ đệm sau 60 giây khi truy vấn không còn được sử dụng (unmount).

### C. Gửi dữ liệu an toàn dựa trên Room (Room-scoped Broadcast)
- **Vấn đề:** Nếu sử dụng `this.server.emit()`, tin nhắn sẽ bị gửi đến tất cả các client đang kết nối đến cổng websocket (global broadcast), vi phạm tính riêng tư của phòng chat.
- **Giải pháp:** Sử dụng `this.server.to(room).emit()`. Các client được nhóm lại bằng `client.join(room)` khi gửi sự kiện `joinRoom`. Mọi sự kiện phát sau đó chỉ gửi đến các kết nối thuộc phòng đó.

### D. Security Limitation đối với `senderId` từ client
- **Cảnh báo bảo mật:** Trong cấu hình hiện tại, chúng ta sử dụng `client.id` tạm thời làm `senderId`. Nếu chuyển sang hệ thống chính thức, tin tưởng trực tiếp thông tin định danh gửi lên từ phía client (như `nickname` hoặc tự ý khai báo `senderId` trong payload) mà không qua một lớp xác thực JWT (Authentication) là một lỗ hổng bảo mật nghiêm trọng (Spoofing Attack). Client xấu có thể giả mạo danh tính của người khác. Để khắc phục, cần tích hợp một Guard xác thực JWT cho sự kiện kết nối WebSocket.
