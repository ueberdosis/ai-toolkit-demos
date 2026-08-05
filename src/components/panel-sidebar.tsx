"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "./segmented-control";

export type SidebarPanel = {
  id: string;
  label: string;
  content: ReactNode;
};

interface PanelSidebarProps {
  panels: SidebarPanel[];
  activePanel: string;
  onActivePanelChange: (panel: string) => void;
}

// Only the active panel is mounted, so panel state has to live in the parent to survive a switch.
export function PanelSidebar({
  panels,
  activePanel,
  onActivePanelChange,
}: PanelSidebarProps) {
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

      <div className="min-h-0 flex-1 overflow-hidden">{active.content}</div>
    </aside>
  );
}
