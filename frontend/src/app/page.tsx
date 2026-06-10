'use client';

import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUsers = async (): Promise<User[]> => {
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
    refetchOnWindowFocus: 'always', // trigger refetch when clicking back into the browser window/tab
  });

  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '24px', boxSizing: 'border-box' }}>
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
          {/* Non-blocking background fetch indicator */}
          {isFetching && !isPending && (
            <span className="badge-pulse" style={{ fontSize: '0.75rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '9999px', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              ⚡ Syncing in background...
            </span>
          )}
          
          <button 
            onClick={() => refetch()} 
            style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
          >
            Refetch
          </button>
        </div>
      </header>

      {/* Skeletons on initial load */}
      {isPending ? (
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
      ) : isError ? (
        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.9rem' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Query Failed</strong>
          {(error as Error).message}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data?.map((user) => (
            <li 
              key={user.id} 
              data-testid={`user-${user.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s' }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              {/* Initials Avatar */}
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
      )}
    </div>
  );
}
