"use client";

import TiptapCollabProvider from "@tiptap-pro/provider";
import { useEffect, useState } from "react";
import Editor from "@/app/inline-edits/editor";

export default function Page() {
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  useEffect(() => {
    setProvider(
      new TiptapCollabProvider({
        appId: String(process.env.NEXT_PUBLIC_TIPTAP_APP_ID),
        token: String(process.env.NEXT_PUBLIC_TIPTAP_APP_JWT),
        name: "ai-cursor-test1",
      }),
    );

    return () => {
      provider?.destroy();
    };
  }, []);

  if (!provider) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Inline edits demo</h1>

      <Editor provider={provider}></Editor>
    </div>
  );
}
