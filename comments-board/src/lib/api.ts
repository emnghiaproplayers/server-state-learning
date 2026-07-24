export type Comment = {
  id: number;
  author: string;
  body: string;
};

const BASE_URL = 'http://localhost:3000';

export async function fetchComments(): Promise<Comment[]> {
  const res = await fetch(`${BASE_URL}/comments`);
  if (!res.ok) {
    throw new Error(`Failed to fetch comments: ${res.statusText}`);
  }
  return res.json();
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
    throw new Error(`Failed to create comment: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteComment(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/comments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete comment: ${res.statusText}`);
  }
}
