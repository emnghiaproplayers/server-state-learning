import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, updateUserName } from '../lib/api';
import type { User } from '../lib/api';
import {
  UserCheck,
  Edit3,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Save,
  CheckCircle,
  Loader2,
  Zap,
} from 'lucide-react';

export function UserEditor() {
  const queryClient = useQueryClient();

  // State for form inputs (local form edit buffer)
  const [selectedUserId, setSelectedUserId] = useState<number>(1);
  const [inputName, setInputName] = useState<string>('');
  const [forceFail, setForceFail] = useState<boolean>(false);
  const [lastActionResult, setLastActionResult] = useState<string | null>(null);

  // 1. Read users list directly from TanStack Query cache
  const { data: users, isPending, isError, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // 2. Connect optimistic update mutation with onMutate, onError, onSettled
  const mutation = useMutation({
    mutationFn: updateUserName,

    // Step 1: onMutate runs BEFORE network request
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

    // Step 2: onError runs if request fails (e.g. HTTP 500 error)
    onError: (_err, _newUserData, context) => {
      setLastActionResult(`Failed (HTTP 500)! Rolling back cache to snapshot...`);

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

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    mutation.mutate({
      id: selectedUserId,
      name: inputName.trim(),
      fail: forceFail,
    });
  };

  // Populate input when selecting a user
  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id);
    setInputName(user.name);
  };


  return (
    <div className="editor-container">
      {/* App Header */}
      <header className="editor-header">
        <div className="header-brand">
          <div className="brand-icon">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="main-title">Optimistic User Name Editor</h1>
            <p className="subtitle">
              Instant UI Updates • Snapshot Rollback on Error 500 • Resync on Settle
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="status-grid">
          <div className="status-card">
            <span className="status-card-label">Mutation State</span>
            <span
              data-testid="mutation-status"
              className={`status-pill ${
                mutation.isPending
                  ? 'pill-optimistic'
                  : mutation.isError
                  ? 'pill-error'
                  : 'pill-idle'
              }`}
            >
              {mutation.isPending && <Loader2 className="w-3 h-3 spinner inline mr-1" />}
              {mutation.isPending
                ? 'Saving (Optimistic)'
                : mutation.isError
                ? 'Error 500 (Rolled Back)'
                : 'Idle'}
            </span>
          </div>

          <div className="status-card">
            <span className="status-card-label">Query Sync Status</span>
            <span
              data-testid="query-status"
              className={`status-pill ${isFetching ? 'pill-fetching' : 'pill-synced'}`}
            >
              {isFetching && <RefreshCw className="w-3 h-3 spinner inline mr-1" />}
              {isFetching ? 'Refetching (GET /users)' : 'Synced with Server'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: Form & User List */}
      <div className="editor-grid">
        {/* Editor Form Card */}
        <div className="card form-card">
          <div className="card-header">
            <Edit3 className="w-5 h-5 text-indigo-400" />
            <h2 className="card-title">Edit User Name</h2>
          </div>

          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label htmlFor="user-select" className="form-label">Select User to Edit</label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedUserId(id);
                  const u = users?.find((item) => item.id === id);
                  if (u) setInputName(u.name);
                }}
                className="form-select"
              >
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    ID #{u.id}: {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="name-input" className="form-label">New Display Name</label>
              <input
                id="name-input"
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Enter new user name..."
                className="form-input"
                required
              />
            </div>

            {/* Checkbox: Force Server 500 Error */}
            <div className="force-error-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={forceFail}
                  onChange={(e) => setForceFail(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  <AlertTriangle className="w-4 h-4 text-rose-400 inline mr-1" />
                  Force Server Error HTTP 500 (`?fail=true`)
                </span>
              </label>
              <p className="toggle-hint">
                When checked, the PATCH request will fail with HTTP 500 to trigger instant cache rollback to snapshot.
              </p>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || !inputName.trim()}
              className={`submit-btn ${forceFail ? 'btn-danger' : 'btn-primary'}`}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 spinner" />
                  <span>Sending PATCH request...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{forceFail ? 'Save & Trigger Rollback (500)' : 'Save Optimistically'}</span>
                </>
              )}
            </button>
          </form>

          {/* Action Log Box */}
          {lastActionResult && (
            <div
              className={`action-log-box ${
                mutation.isError ? 'log-error' : mutation.isPending ? 'log-pending' : 'log-success'
              }`}
            >
              {mutation.isError ? (
                <RotateCcw className="w-4 h-4 text-rose-400 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              <span className="log-text">{lastActionResult}</span>
            </div>
          )}
        </div>

        {/* Users List Card (Rendered directly from Query Cache) */}
        <div className="card list-card">
          <div className="card-header justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="card-title">Users List (Query Cache State)</h2>
            </div>
            {dataUpdatedAt && (
              <span data-testid="updated-at" className="updated-at-badge">
                Refetched: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {isPending ? (
            <div className="skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card animate-pulse">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-lines">
                    <div className="skeleton-line w-1-2" />
                    <div className="skeleton-line w-3-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="error-alert">
              <p className="font-semibold">Failed to fetch users list</p>
              <p className="text-sm">{(error as Error).message}</p>
            </div>
          ) : (
            <ul className="users-list">
              {users?.map((user) => {
                const isEditingThis = user.id === selectedUserId;
                return (
                  <li
                    key={user.id}
                    data-testid={`user-row-${user.id}`}
                    onClick={() => handleSelectUser(user)}
                    className={`user-card ${isEditingThis ? 'user-card-selected' : ''}`}
                  >
                    <div className="user-avatar">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name" data-testid={`user-name-${user.id}`}>
                        {user.name}
                      </div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <button className="select-btn">
                      {isEditingThis ? 'Editing' : 'Select'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
