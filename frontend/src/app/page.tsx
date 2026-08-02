'use client';

import React, { useState } from 'react';
import CommentsManager from '../components/comments-manager';
import ProductsFeed from '../components/products-feed';
import TaskBoard from '../components/task-board';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'products' | 'comments'>('tasks');

  return (
    <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex border-b border-zinc-300 dark:border-zinc-800 space-x-4">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Task Board (Optimistic Reorder & Rollback)
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Product Feed (Cursor Pagination)
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            Comments Board
          </button>
        </div>
      </div>

      {activeTab === 'tasks' && <TaskBoard />}
      {activeTab === 'products' && <ProductsFeed />}
      {activeTab === 'comments' && <CommentsManager />}
    </main>
  );
}
