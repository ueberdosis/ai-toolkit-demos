"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { ServerAiPagesDemo } from "@/demos/server-ai-pages/server-ai-pages-demo";
import { getConvertToken } from "./actions";

const SLUG = "server-ai-pages";
const DOCUMENT_KEY_PATTERN = /^[\w-]{1,64}$/;

type DocumentRef = { documentId: string; isNewDocument: boolean };

type Session = DocumentRef & {
  convertToken: string | null;
  convertTokenError: string | null;
};

/**
 * Joins the document named by `?doc=`, or starts a new one and writes its key
 * into the URL, so the link can be shared with a second window.
 */
function resolveDocument(): DocumentRef {
  const url = new URL(window.location.href);
  const requestedKey = url.searchParams.get("doc");
  if (requestedKey && DOCUMENT_KEY_PATTERN.test(requestedKey)) {
    return { documentId: `${SLUG}/${requestedKey}`, isNewDocument: false };
  }

  const key = uuid();
  url.searchParams.set("doc", key);
  window.history.replaceState(null, "", url);
  return { documentId: `${SLUG}/${key}`, isNewDocument: true };
}

export default function Page() {
  // Survives Strict Mode's effect replay, which would otherwise read back the new key as an existing document.
  const resolvedDocument = useRef<DocumentRef | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    resolvedDocument.current ??= resolveDocument();
    const documentRef = resolvedDocument.current;
    let cancelled = false;

    getConvertToken(documentRef.documentId)
      .catch((error: unknown) => ({
        error: error instanceof Error ? error.message : "Unknown error",
      }))
      .then((result) => {
        if (cancelled) return;
        setSession({
          ...documentRef,
          convertToken: "token" in result ? result.token : null,
          convertTokenError: "error" in result ? result.error : null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) return null;

  return <ServerAiPagesDemo slug={SLUG} {...session} />;
}
