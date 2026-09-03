"use client";

import { Loader2, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { ChatSidebar, type Message } from "./chat-sidebar";
import { ResponsiveRightSidebar } from "./responsive-right-sidebar";
import { SegmentedControl } from "./segmented-control";

export type PanelId = "chat" | "tracked" | "comments";

interface RightSidebarProps {
  activePanel: PanelId;
  onActivePanelChange: (panel: PanelId) => void;
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: SubmitEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  trackedPanel?: ReactNode;
  commentsPanel?: ReactNode;
  inputAction?: ReactNode;
}

// A tab is offered only for the panels the demo passes in.
export function RightSidebar({
  activePanel,
  onActivePanelChange,
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  placeholder = "Ask the AI to edit the document...",
  trackedPanel,
  commentsPanel,
  inputAction,
}: RightSidebarProps) {
  const panels: Array<{ id: PanelId; label: string; content: ReactNode }> = [
    {
      id: "chat",
      label: "Chat",
      content: (
        <ChatSidebar
          embedded
          messages={messages}
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder={placeholder}
          inputAction={inputAction}
        />
      ),
    },
  ];

  if (trackedPanel) {
    panels.push({
      id: "tracked",
      label: "Tracked changes",
      content: trackedPanel,
    });
  }

  if (commentsPanel) {
    panels.push({ id: "comments", label: "Comments", content: commentsPanel });
  }

  const active = panels.find((panel) => panel.id === activePanel) ?? panels[0];

  return (
    <ResponsiveRightSidebar
      mobileTitle="AI Chat"
      triggerLabel={isLoading ? "AI thinking..." : "Chat"}
      triggerIcon={
        isLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <MessageSquare size={16} />
        )
      }
      onOpen={() => onActivePanelChange("chat")}
    >
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

          // The comments panel holds reply drafts and comment edits, so it stays mounted.
          // The other panels keep their state in the demo, so remounting them is free.
          if (!isActive && panel.id !== "comments") {
            return null;
          }

          return (
            <div key={panel.id} className={isActive ? "h-full" : "hidden"}>
              {panel.content}
            </div>
          );
        })}
      </div>
    </ResponsiveRightSidebar>
  );
}
