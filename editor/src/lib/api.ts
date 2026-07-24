export type User = {
  id: number;
  name: string;
  email: string;
};

const BASE_URL = 'http://localhost:3000';

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`);
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.statusText}`);
  }
  return res.json();
}

export async function updateUserName(params: {
  id: number;
  name: string;
  fail?: boolean;
}): Promise<User> {
  const url = `${BASE_URL}/users/${params.id}${params.fail ? '?fail=true' : ''}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: params.name, fail: params.fail }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.message || `HTTP ${res.status}: Failed to update user name`,
    );
  }

  return res.json();
}
