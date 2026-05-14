import type { Editor } from "@tiptap/react";
import { subscribeToThreads } from "@tiptap-pro/extension-comments";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
import { useCallback, useEffect, useState } from "react";

export type DemoComment = {
  id: string;
  content?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  data?: Record<string, string>;
};

export type DemoThread = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  resolvedAt?: string | null;
  data?: {
    suggestionId?: string;
    suggestionReason?: string;
    suggestionType?: string;
    suggestionText?: string;
    source?: string;
    userName?: string;
  };
  comments?: DemoComment[];
};

type DemoUser = {
  name: string;
  avatarUrl: string;
};

export function useDemoThreads(
  provider: TiptapCollabProvider | null,
  editor: Editor | null,
  user: DemoUser,
) {
  const [threads, setThreads] = useState<DemoThread[]>([]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const unsubscribe = subscribeToThreads({
      provider,
      callback: (currentThreads) => {
        setThreads((currentThreads ?? []) as DemoThread[]);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [provider]);

  const createThread = useCallback(() => {
    const content = window.prompt("Comment content");

    if (!content?.trim() || !editor) {
      return;
    }

    editor
      .chain()
      .focus()
      .setThread({
        content: content.trim(),
        commentData: {
          userName: user.name,
          avatarUrl: user.avatarUrl,
        },
      })
      .run();
  }, [editor, user]);

  return { threads, createThread };
}
