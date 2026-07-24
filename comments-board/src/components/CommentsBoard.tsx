import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchComments, createComment, deleteComment } from '../lib/api';
import { MessageSquare, Plus, Trash2, RefreshCw, Send, Loader2, Clock, CheckCircle2 } from 'lucide-react';

export function CommentsBoard() {
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');

  const queryClient = useQueryClient();

  // 1. Read comments list via useQuery
  const { data, isPending, isError, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['comments'],
    queryFn: fetchComments,
  });

  // 2. Create mutation with cache invalidation
  const createMut = useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      setAuthor('');
      setBody('');
    },
  });

  // 3. Delete mutation with cache invalidation
  const deleteMut = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    createMut.mutate({ author: author.trim(), body: body.trim() });
  };

  return (
    <div className="comments-container">
      {/* Header section */}
      <header className="board-header">
        <div className="header-title-group">
          <div className="icon-badge">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="main-title">Comments Board</h1>
            <p className="subtitle">TanStack Query Mutation & Invalidation Flow</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="status-panel">
          <div className="status-badge">
            <span className="status-label">Write Status:</span>
            <span
              data-testid="write-status"
              className={`status-pill ${createMut.isPending ? 'status-saving' : 'status-idle'}`}
            >
              {createMut.isPending && <Loader2 className="w-3 h-3 spinner inline mr-1" />}
              {createMut.isPending ? 'saving' : 'idle'}
            </span>
          </div>

          <div className="status-badge">
            <span className="status-label">List Status:</span>
            <span
              data-testid="list-status"
              className={`status-pill ${isFetching ? 'status-refreshing' : 'status-idle'}`}
            >
              {isFetching && <RefreshCw className="w-3 h-3 spinner inline mr-1" />}
              {isFetching ? 'refreshing' : 'idle'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: Form & List */}
      <div className="board-grid">
        {/* Form Card */}
        <div className="card form-card">
          <div className="card-header">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h2 className="card-title">Add Comment</h2>
          </div>

          <form onSubmit={handleSubmit} className="comment-form">
            <div className="form-group">
              <label htmlFor="author-input" className="form-label">Author Name</label>
              <input
                id="author-input"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Alice"
                disabled={createMut.isPending}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="body-input" className="form-label">Comment Content</label>
              <textarea
                id="body-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your thoughts..."
                disabled={createMut.isPending}
                rows={3}
                className="form-textarea"
                required
              />
            </div>

            <button
              type="submit"
              disabled={createMut.isPending || !author.trim() || !body.trim()}
              className="submit-btn"
            >
              {createMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 spinner" />
                  <span>Saving comment...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Comment</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List Card */}
        <div className="card list-card">
          <div className="card-header justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h2 className="card-title">Comments List</h2>
            </div>
            {dataUpdatedAt ? (
              <div className="updated-at-box" title="Last Query Refetch Time">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span data-testid="comments-updated-at" className="updated-at-text">
                  {new Date(dataUpdatedAt).toISOString()}
                </span>
              </div>
            ) : null}
          </div>

          {/* Conditional Rendering: Pending (Initial Load), Error, or Success */}
          {isPending ? (
            <div className="skeleton-container">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-item animate-pulse">
                  <div className="skeleton-header">
                    <div className="skeleton-avatar" />
                    <div className="skeleton-title" />
                  </div>
                  <div className="skeleton-body" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="error-box">
              <p className="error-title">Failed to load comments</p>
              <p className="error-desc">{(error as Error).message}</p>
            </div>
          ) : data && data.length === 0 ? (
            <div className="empty-box">
              <CheckCircle2 className="w-10 h-10 text-gray-500 mb-2" />
              <p className="empty-text">No comments yet.</p>
              <p className="empty-subtext">Be the first to share a thought!</p>
            </div>
          ) : (
            <ul className="comments-list">
              {data?.map((comment) => (
                <li
                  key={comment.id}
                  data-testid={`comment-${comment.id}`}
                  className="comment-row"
                >
                  <div className="comment-main">
                    <div className="comment-author-badge">
                      {comment.author.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="comment-content flex-1">
                      <div className="comment-author-name">{comment.author}</div>
                      <p className="comment-body-text">{comment.body}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMut.mutate(comment.id)}
                    disabled={deleteMut.isPending}
                    className="delete-btn"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
