"use client";

import type { FormEvent, ReactNode } from "react";
import { ChatSidebar, type Message } from "@/components/chat-sidebar";
import { PanelSidebar, type SidebarPanel } from "@/components/panel-sidebar";
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
  inputAction?: ReactNode;
};

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
  inputAction,
}: RightSidebarProps) {
  const panels: SidebarPanel<PanelId>[] = [
    {
      id: "chat",
      label: "Chat",
      content: (
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
          inputAction={inputAction}
        />
      ),
    },
    { id: "tracked", label: "Tracked changes", content: trackedPanel },
  ];

  // Hide the Comments tab when the demo provides no comments panel (e.g. the
  // streaming tracked-changes demo, where the stream does not create threads).
  if (commentsPanel) {
    panels.push({ id: "comments", label: "Comments", content: commentsPanel });
  }

  return (
    <PanelSidebar
      panels={panels}
      activePanel={activePanel}
      onActivePanelChange={onActivePanelChange}
    />
  );
}
