"use client";

import { PanelRightOpen, X } from "lucide-react";
import { type ReactNode, useState } from "react";

type ResponsiveRightSidebarProps = {
  children: ReactNode;
  mobileTitle: string;
  triggerLabel: string;
  triggerIcon?: ReactNode;
  onOpen?: () => void;
};

export function ResponsiveRightSidebar({
  children,
  mobileTitle,
  triggerLabel,
  triggerIcon,
  onOpen,
}: ResponsiveRightSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden h-screen w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white sm:flex">
        {children}
      </aside>

      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setIsMobileOpen(true);
        }}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-[var(--black)] px-4 py-2.5 text-sm font-medium text-white shadow-lg sm:hidden"
      >
        {triggerIcon ?? <PanelRightOpen size={16} />}
        {triggerLabel}
      </button>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white sm:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-medium">{mobileTitle}</span>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close sidebar"
              className="cursor-pointer rounded-full p-1 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      )}
    </>
  );
}
