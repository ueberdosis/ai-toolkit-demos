"use client";

import type { UIMessage } from "ai";
import type { FormEvent, ReactNode } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";

type PanelId = "chat" | "tracked" | "comments" | "tracked-comments";

type RightSidebarProps = {
  activePanel: PanelId;
  onActivePanelChange: (panel: PanelId) => void;
  messages: UIMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  trackedPanel: ReactNode;
  commentsPanel: ReactNode;
  trackedCommentsPanel: ReactNode;
};

const panels: Array<{ id: PanelId; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "tracked", label: "Tracked changes" },
  { id: "comments", label: "Comments" },
  { id: "tracked-comments", label: "Tracked + comments" },
];

export function RightSidebar({
  activePanel,
  onActivePanelChange,
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  trackedPanel,
  commentsPanel,
  trackedCommentsPanel,
}: RightSidebarProps) {
  return (
    <aside className="flex h-screen w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => onActivePanelChange(panel.id)}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                activePanel === panel.id
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activePanel === "chat" && (
          <ChatSidebar
            embedded
            messages={messages}
            input={input}
            onInputChange={onInputChange}
            onSubmit={(event) =>
              onSubmit(event as unknown as FormEvent<HTMLFormElement>)
            }
            isLoading={isLoading}
            placeholder="Ask the AI to edit the document..."
          />
        )}
        {activePanel === "tracked" && trackedPanel}
        {activePanel === "comments" && commentsPanel}
        {activePanel === "tracked-comments" && trackedCommentsPanel}
      </div>
    </aside>
  );
}
