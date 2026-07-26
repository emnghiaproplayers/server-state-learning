'use client';

import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProductsPage, ProductsPage, Product } from '../lib/api';

export default function ProductsFeed() {
  const query = useInfiniteQuery<ProductsPage, Error>({
    queryKey: ['products', 'infinite'],
    queryFn: ({ pageParam }) => fetchProductsPage({ cursor: Number(pageParam), limit: 5 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const products: Product[] = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Product Feed (Cursor Pagination)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Accumulated product feed using React Query <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">useInfiniteQuery</code>
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            Loaded: {products.length} items ({query.data?.pages.length ?? 0} pages)
          </span>
        </div>
      </div>

      {query.isPending && (
        <div className="space-y-3 mb-6" data-testid="products-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse flex items-center justify-between px-4"
            >
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      )}

      {query.isError && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <p className="font-semibold">Failed to load product feed</p>
          <p className="text-sm">{query.error.message}</p>
        </div>
      )}

      {!query.isPending && products.length > 0 && (
        <div className="space-y-3 mb-6" id="products-list">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  #{product.id}
                </span>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </h3>
                </div>
              </div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${product.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button
          onClick={() => query.fetchNextPage()}
          disabled={!query.hasNextPage || query.isFetchingNextPage}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-medium rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
        >
          {query.isFetchingNextPage ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Loading more...</span>
            </>
          ) : !query.hasNextPage ? (
            <span>No more products</span>
          ) : (
            <span>Load More</span>
          )}
        </button>
      </div>
    </div>
  );
}
