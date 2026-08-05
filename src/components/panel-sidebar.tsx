"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "./segmented-control";

export type SidebarPanel<T extends string = string> = {
  id: T;
  label: string;
  content: ReactNode;
  /** Stay mounted while another panel is active, so in-progress input survives a switch. */
  keepMounted?: boolean;
};

interface PanelSidebarProps<T extends string> {
  panels: SidebarPanel<T>[];
  activePanel: T;
  onActivePanelChange: (panel: T) => void;
}

// Panels without `keepMounted` are unmounted while inactive, so their state has to live
// in the parent to survive a switch.
export function PanelSidebar<T extends string>({
  panels,
  activePanel,
  onActivePanelChange,
}: PanelSidebarProps<T>) {
  if (panels.length === 0) {
    return null;
  }

  const active = panels.find((panel) => panel.id === activePanel) ?? panels[0];

  return (
    <aside className="flex h-screen w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-white p-4">
        <SegmentedControl
          options={panels}
          value={active.id}
          onChange={onActivePanelChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {panels.map((panel) => {
          const isActive = panel.id === active.id;

          if (!isActive && !panel.keepMounted) {
            return null;
          }

          return (
            <div key={panel.id} className={isActive ? "h-full" : "hidden"}>
              {panel.content}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
