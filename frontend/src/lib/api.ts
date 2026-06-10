export interface Comment {
  id: number;
  author: string;
  body: string;
}

const BASE_URL = 'http://localhost:3000';

export async function fetchComments(): Promise<Comment[]> {
  const res = await fetch(`${BASE_URL}/comments`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to fetch comments`);
  }
  return res.json() as Promise<Comment[]>;
}

export async function createComment(dto: { author: string; body: string }): Promise<Comment> {
  const res = await fetch(`${BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}: Failed to create comment`);
  }
  return res.json() as Promise<Comment>;
}

export async function deleteComment(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/comments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to delete comment`);
  }
}
