"use client";

import type { FormEvent, ReactNode } from "react";
import { ChatSidebar, type Message } from "@/components/chat-sidebar";
import type { PanelId } from "./panel-id";

type RightSidebarProps = {
  activePanel: PanelId;
  onActivePanelChange: (panel: PanelId) => void;
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  trackedPanel: ReactNode;
  commentsPanel?: ReactNode;
};

const allPanels: Array<{ id: PanelId; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "tracked", label: "Tracked changes" },
  { id: "comments", label: "Comments" },
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
}: RightSidebarProps) {
  // Hide the Comments tab when the demo provides no comments panel (e.g. the
  // streaming tracked-changes demo, where the stream does not create threads).
  const panels = commentsPanel
    ? allPanels
    : allPanels.filter((panel) => panel.id !== "comments");

  return (
    <aside className="flex h-screen w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-white p-4">
        <div
          className={`grid w-full gap-0 rounded-lg bg-[var(--gray-2)] p-0.5 ${
            panels.length === 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => onActivePanelChange(panel.id)}
              className={`flex min-h-6 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-medium leading-[1.15] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] ${
                activePanel === panel.id
                  ? "bg-white text-[var(--black-contrast)]"
                  : "text-[var(--gray-5)] hover:text-[var(--black)]"
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
        {commentsPanel && activePanel === "comments" && commentsPanel}
      </div>
    </aside>
  );
}
