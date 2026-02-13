"use client";

import type { ReactNode } from "react";

interface ToolbarPanelProps {
  children: ReactNode;
}

export function ToolbarPanel({ children }: ToolbarPanelProps) {
  return (
    <div className="flex items-center flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3">
      {children}
    </div>
  );
}
