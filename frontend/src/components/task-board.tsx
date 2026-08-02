'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, moveTaskApi, reorder, Task, MoveTaskVariables } from '../lib/tasks';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'todo', title: '📋 TODO' },
  { id: 'in_progress', title: '⚡ IN PROGRESS' },
  { id: 'done', title: '✅ DONE' },
];

export default function TaskBoard() {
  const queryClient = useQueryClient();
  const [lastAction, setLastAction] = useState<string | null>(null);

  // 1. Fetch board tasks via useQuery with queryKey ["tasks"]
  const { data: tasks = [], isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  // 2. Optimistic Mutation with Full-List Snapshot Rollback
  const moveMutation = useMutation<Task, Error, MoveTaskVariables, { previous: Task[] | undefined }>({
    mutationFn: moveTaskApi,

    // Step 1: onMutate executes 3 exact steps: cancelQueries -> getQueryData -> setQueryData(reorder) -> return { previous }
    onMutate: async (vars) => {
      setLastAction(`Optimistic move started for task: ${vars.taskId}`);

      // 1. Cancel in-flight queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // 2. Snapshot FULL list (Task[]), not just a single item
      const previous = queryClient.getQueryData<Task[]>(['tasks']);

      // 3. Optimistic write using pure reorder helper
      queryClient.setQueryData<Task[]>(['tasks'], (old) => (old ? reorder(old, vars) : old));

      // Return snapshot context for onError
      return { previous };
    },

    // Step 2: onError restores FULL snapshot array when server rejects move
    onError: (err, _vars, context) => {
      setLastAction(`❌ MOVE FAILED (500): ${err.message}. Rolling back full list!`);
      toast.error(`Rollback! Server error: ${err.message}`);

      if (context?.previous) {
        queryClient.setQueryData(['tasks'], context.previous);
      }
    },

    // Step 3: onSettled invalidates query key to re-sync with server truth regardless of success/error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },

    onSuccess: (data) => {
      setLastAction(`✅ Move confirmed by server for task: ${data.id}`);
      toast.success(`Task move saved successfully!`);
    },
  });

  const handleMove = (taskId: string, toColumn: string, toIndex: number, fail = false) => {
    moveMutation.mutate({ taskId, toColumn, toIndex, fail });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header & Status Notice */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Task Board - Full-List Snapshot Optimistic Rollback
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Optimistic write updates mảng cache <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-blue-600 font-mono">["tasks"]</code> ngay lập tức. Khi server trả lỗi 500, snapshot toàn mảng khôi phục tất cả các phần tử bị dịch chuyển.
            </p>
          </div>
          {moveMutation.isPending && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-xs font-semibold animate-pulse">
              <span>⚡ Server is processing move (600ms delay)...</span>
            </div>
          )}
        </div>

        {/* Live action log banner */}
        {lastAction && (
          <div className="text-xs font-mono p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
            <strong>Log State:</strong> {lastAction}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-zinc-500">Đang tải Task Board...</div>
      )}

      {isError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          Lỗi: {error?.message}
        </div>
      )}

      {/* Board Columns Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const colTasks = tasks
              .filter((t) => t.columnId === col.id)
              .sort((a, b) => a.order - b.order);

            return (
              <div
                key={col.id}
                data-testid={`column-${col.id}`}
                className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col space-y-4"
              >
                <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm tracking-wide">
                    {col.title}
                  </h2>
                  <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-bold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div className="h-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                      Không có task nào
                    </div>
                  ) : (
                    colTasks.map((task, index) => {
                      const colIndex = COLUMNS.findIndex((c) => c.id === col.id);
                      const prevCol = colIndex > 0 ? COLUMNS[colIndex - 1] : null;
                      const nextCol = colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1] : null;

                      return (
                        <div
                          key={task.id}
                          data-testid={`task-${task.id}`}
                          data-task-id={task.id}
                          data-column-id={task.columnId}
                          data-order={task.order}
                          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                              {task.id} (order #{task.order})
                            </span>
                          </div>

                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            {task.title}
                          </h3>

                          {/* Controls bar */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex flex-wrap gap-1.5 text-xs">
                            {/* Move Left */}
                            {prevCol && (
                              <button
                                data-testid={`move-left-${task.id}`}
                                onClick={() => handleMove(task.id, prevCol.id, 0, false)}
                                disabled={moveMutation.isPending}
                                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded text-zinc-700 dark:text-zinc-200 font-medium transition disabled:opacity-50"
                              >
                                ← {prevCol.id}
                              </button>
                            )}

                            {/* Move Right */}
                            {nextCol && (
                              <button
                                data-testid={`move-right-${task.id}`}
                                onClick={() => handleMove(task.id, nextCol.id, 0, false)}
                                disabled={moveMutation.isPending}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-300 rounded font-medium transition disabled:opacity-50"
                              >
                                → {nextCol.id}
                              </button>
                            )}

                            {/* Force 500 Failure Rollback Test */}
                            {nextCol && (
                              <button
                                data-testid={`move-fail-${task.id}`}
                                onClick={() => handleMove(task.id, nextCol.id, 0, true)}
                                disabled={moveMutation.isPending}
                                className="px-2 py-1 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 rounded font-semibold transition disabled:opacity-50 border border-red-200 dark:border-red-800"
                                title="Gửi ?fail=true ép server trả về HTTP 500 để test rollback full snapshot"
                              >
                                💥 Move (Force 500 Rollback)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
