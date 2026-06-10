'use client';

import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  name: string;
  email: string;
}

// 1. fetchUsers ném lỗi khi phản hồi không hợp lệ
export const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch('http://localhost:3000/users');
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json() as Promise<User[]>;
};

export default function UsersPage() {
  const { data, isPending, isError, error, isFetching, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    refetchOnWindowFocus: 'always',
  });

  // 2. Giao diện hiển thị skeleton khi isPending
  if (isPending) {
    return (
      <div data-testid="users-skeleton" style={{ maxWidth: '600px', margin: '60px auto', padding: '24px' }}>
        <h1 style={{ color: '#f8fafc', marginBottom: '32px' }}>Users List</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.06)' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-pulse" style={{ width: '130px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }}></div>
                <div className="skeleton-pulse" style={{ width: '200px', height: '10px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Thông báo lỗi khi isError
  if (isError) {
    return (
      <div data-testid="users-error" style={{ maxWidth: '600px', margin: '60px auto', padding: '24px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
        <h1 style={{ color: '#f8fafc', marginBottom: '16px' }}>Query Failed</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        <button onClick={() => refetch()} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  // 4. Kiểm tra early return để đảm bảo TypeScript nhận diện rõ ràng kiểu dữ liệu User[]
  if (!data) {
    return null;
  }

  // 5. Danh sách người dùng khi thành công. Dữ liệu cũ vẫn tồn tại trong DOM trong khi tải lại thông tin.
  // Đồng thời hiển thị chỉ thị khác nhau cho isFetching (background refresh) so với isPending
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cinema User Directory
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Observing cache validation and background fetches
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Chỉ thị isFetching khác biệt hoàn toàn so với skeleton của isPending */}
          {isFetching && (
            <span className="badge-pulse" data-testid="users-fetching" style={{ fontSize: '0.75rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '9999px', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              ⚡ Syncing in background...
            </span>
          )}
          
          <button 
            onClick={() => refetch()} 
            style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Refetch
          </button>
        </div>
      </header>

      <ul data-testid="users-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((user) => (
          <li 
            key={user.id} 
            data-testid={`user-${user.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#c7d2fe', fontSize: '0.85rem' }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{user.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '3px' }}>{user.email}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
