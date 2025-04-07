import React from "react";
import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
        className: 'group',
        duration: 4000,
        unstyled: true,
        classNames: {
          toast: "group flex w-full items-center space-x-4 rounded-lg border p-4 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm opacity-90",
          actionButton: "group-[.success]:bg-green-500 group-[.error]:bg-red-500 rounded px-2 py-1 text-white",
          cancelButton: "rounded bg-gray-200 px-2 py-1",
          error: "group border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
          success: "group border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
          warning: "group border-yellow-500/30 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
          info: "group border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
        },
      }}
    />
  );
}
