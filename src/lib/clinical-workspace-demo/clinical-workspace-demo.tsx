"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext } from "@tiptap/ai-toolkit";
import type { Editor } from "@tiptap/react";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import {
  createClinicalWorkspace,
  refreshClinicalDocumentToken,
} from "@/lib/clinical-workspace-demo/actions";
import { ClinicalDocumentEditor } from "./document-editor";
import { type ClinicalDocumentId, clinicalDocuments } from "./documents";
import "./clinical-workspace.css";

type DocumentRuntime = {
  id: ClinicalDocumentId;
  documentId: string;
  doc: Y.Doc;
  provider: TiptapCollabProvider;
};

const tasks = [
  {
    title: "Align the participant information",
    text: "Compare @Consent with @Protocol. Suggest corrections to the visit schedule and any language that overstates potential benefit. Edit only @Consent and explain the changes in linked comments.",
  },
  {
    title: "Reconcile safety reporting",
    text: "Read @Protocol and @Safety. Align the serious adverse event reporting deadline in @Safety with @Protocol, and add a clear participant-friendly instruction to @Consent about promptly contacting the study team about new symptoms. Propose tracked changes in both documents.",
  },
  {
    title: "Check the primary endpoint",
    text: "Compare the primary endpoint and assessment timepoint in @Analysis against @Protocol. Correct inconsistencies in @Analysis as tracked changes, preserving the statistical methods and adding a justification for each edit.",
  },
];

export function ClinicalWorkspaceDemo() {
  const [runtimes, setRuntimes] = useState<DocumentRuntime[]>([]);
  const [workspaceToken, setWorkspaceToken] = useState("");
  const [setupError, setSetupError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately restarts the workspace connection.
  useEffect(() => {
    let cancelled = false;
    const resources: DocumentRuntime[] = [];
    const timer = window.setTimeout(() => {
      if (!cancelled)
        setSetupError(
          "The study documents could not connect. Check the collaboration service and retry.",
        );
    }, 30_000);
    setSetupError("");
    setRuntimes([]);
    const setup = async () => {
      const workspace = await createClinicalWorkspace();
      if (cancelled) return;
      const synced = new Set<string>();
      for (const { id, documentId, config } of workspace.documents) {
        const doc = new Y.Doc();
        const provider = new TiptapCollabProvider({
          ...(config.collabBaseUrl
            ? { baseUrl: config.collabBaseUrl }
            : { appId: config.appId }),
          name: documentId,
          token: () => refreshClinicalDocumentToken(workspace.token, id),
          document: doc,
          user: "demo-user",
          onSynced: ({ state }: { state: boolean }) => {
            if (!state || cancelled) return;
            synced.add(id);
            if (
              synced.size === clinicalDocuments.length &&
              resources.every(
                ({ provider: current }) =>
                  current.isSynced && current.isAuthenticated,
              )
            ) {
              window.clearTimeout(timer);
              setSetupError("");
              setWorkspaceToken(workspace.token);
              setRuntimes([...resources]);
            }
          },
          onClose: () => {
            if (!cancelled)
              setSetupError(
                "Study connection interrupted. Retry to reconnect.",
              );
          },
          onAuthenticationFailed: () => {
            if (!cancelled)
              setSetupError(
                "Study access was denied. Check the Tiptap collaboration configuration and retry.",
              );
          },
        });
        resources.push({ id, documentId, doc, provider });
      }
    };
    setup().catch((error) => {
      window.clearTimeout(timer);
      if (!cancelled)
        setSetupError(
          error instanceof Error
            ? error.message
            : "Could not open the study workspace.",
        );
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const { provider, doc } of resources) {
        provider.destroy();
        doc.destroy();
      }
    };
  }, [attempt]);

  if (setupError && runtimes.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">
          Unable to open the study workspace
        </h1>
        <p role="alert" className="max-w-lg text-sm text-slate-600">
          {setupError}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="rounded-lg bg-blue-800 px-4 py-2 text-white"
        >
          Retry connection
        </button>
      </div>
    );
  }
  if (!runtimes.length)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-600">
        Opening the LUMEN-204 study documents…
      </div>
    );
  return (
    <>
      {setupError && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <span>
            Study connection interrupted. Your documents and chat are kept open.
          </span>
          <button
            type="button"
            className="rounded border border-amber-400 px-3 py-1 font-medium"
            onClick={() => {
              for (const { provider } of runtimes) {
                if (provider.isSynced && provider.isAuthenticated) continue;
                const reconnect =
                  provider.configuration.websocketProvider.status ===
                  "connected"
                    ? provider.sendToken().then(() => provider.startSync())
                    : provider.connect();
                void reconnect.catch(() =>
                  setSetupError("Could not reconnect to the study."),
                );
              }
              setSetupError("");
            }}
          >
            Retry connection
          </button>
        </div>
      )}
      <StudyWorkspace
        key={workspaceToken}
        runtimes={runtimes}
        workspaceToken={workspaceToken}
        connectionError={Boolean(setupError)}
      />
    </>
  );
}

function StudyWorkspace({
  runtimes,
  workspaceToken,
  connectionError,
}: {
  connectionError: boolean;
  runtimes: DocumentRuntime[];
  workspaceToken: string;
}) {
  const [focusedId, setFocusedId] = useState<ClinicalDocumentId>("protocol");
  const [input, setInput] = useState("");
  const [readyIds, setReadyIds] = useState<Set<ClinicalDocumentId>>(new Set());
  const [hasPendingChanges, setHasPendingChanges] = useState(true);
  const editors = useRef(new Map<ClinicalDocumentId, Editor>());
  const focusedRef = useRef(focusedId);
  focusedRef.current = focusedId;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/clinical-workspace",
        body: () => ({
          workspaceToken,
          focusedDocumentId: focusedRef.current,
          editorContexts: Object.fromEntries(
            [...editors.current].map(([id, editor]) => [
              id,
              getEditorContext(editor),
            ]),
          ),
        }),
      }),
    [workspaceToken],
  );
  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });
  const isLoading = status === "submitted" || status === "streaming";
  useEffect(() => {
    const update = () =>
      setHasPendingChanges(
        runtimes.some(
          ({ provider }) =>
            provider.hasUnsyncedChanges ||
            !provider.isSynced ||
            !provider.isAuthenticated,
        ),
      );
    for (const { provider } of runtimes) {
      provider.on("unsyncedChanges", update);
      provider.on("synced", update);
      provider.on("status", update);
      provider.on("close", update);
    }
    update();
    return () => {
      for (const { provider } of runtimes) {
        provider.off("unsyncedChanges", update);
        provider.off("synced", update);
        provider.off("status", update);
        provider.off("close", update);
      }
    };
  }, [runtimes]);
  const ready =
    readyIds.size === clinicalDocuments.length &&
    !hasPendingChanges &&
    !connectionError;
  const register = useMemo(
    () =>
      Object.fromEntries(
        clinicalDocuments.map(({ id }) => [
          id,
          (editor: Editor | null) => {
            if (editor) editors.current.set(id, editor);
            else editors.current.delete(id);
            setReadyIds(new Set(editors.current.keys()));
          },
        ]),
      ) as Record<ClinicalDocumentId, (editor: Editor | null) => void>,
    [],
  );

  const submit = useCallback(
    (message: { text: string }) => {
      if (
        !ready ||
        isLoading ||
        !message.text.trim() ||
        runtimes.some(
          ({ provider }) =>
            provider.hasUnsyncedChanges ||
            !provider.isSynced ||
            !provider.isAuthenticated,
        )
      )
        return false;
      clearError();
      return sendMessage(message);
    },
    [ready, isLoading, clearError, sendMessage, runtimes],
  );

  const documentsPanel = (
    <div className="h-full overflow-auto p-4">
      <h2 className="font-semibold text-slate-900">Study documents</h2>
      <p className="mt-1 mb-4 text-xs leading-relaxed text-slate-500">
        Switch documents to review their comments and tracked changes. Chat can
        work across all four documents.
      </p>
      {clinicalDocuments.map((document) => (
        <button
          type="button"
          key={document.id}
          aria-pressed={document.id === focusedId}
          onClick={() => setFocusedId(document.id)}
          className={`mb-2 w-full rounded-lg border p-3 text-left ${document.id === focusedId ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
        >
          <span className="block text-sm font-semibold text-slate-900">
            {document.title}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {document.detail}
          </span>
          <span className="mt-2 block text-xs text-blue-700">
            @{document.mention}
            {document.id === focusedId ? " · Currently focused" : ""}
          </span>
        </button>
      ))}
    </div>
  );

  const mentionMatch = /@([a-z]*)$/i.exec(input);
  const mentions = mentionMatch
    ? clinicalDocuments.filter(({ mention }) =>
        mention.toLowerCase().startsWith(mentionMatch[1].toLowerCase()),
      )
    : [];
  const chatExtras = (
    <div className="max-h-[55vh] shrink-0 overflow-y-auto border-t border-slate-100 px-4 py-3">
      <p className="mb-2 text-xs text-slate-500">
        Focused on{" "}
        <strong>
          {clinicalDocuments.find(({ id }) => id === focusedId)?.mention}
        </strong>
      </p>
      {error && (
        <div role="alert" className="mb-3 text-sm text-red-700">
          The request failed. {error.message} You can send your request again.
        </div>
      )}
      {!ready && (
        <p className="text-xs text-slate-500">Syncing study documents…</p>
      )}
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            Try a cross-document review
          </p>
          {tasks.map((task) => (
            <button
              type="button"
              disabled={!ready || isLoading}
              key={task.title}
              onClick={() => submit({ text: task.text })}
              className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-blue-800 hover:bg-blue-50 disabled:opacity-50"
            >
              {task.title}
            </button>
          ))}
        </div>
      )}
      {mentions.length > 0 ? (
        <fieldset className="mt-3 space-y-1" aria-label="Document mentions">
          {mentions.map(({ id, title, mention }) => (
            <button
              type="button"
              key={id}
              onClick={() =>
                setInput(input.replace(/@[a-z]*$/i, `@${mention} `))
              }
              className="block w-full rounded px-2 py-1 text-left text-xs text-blue-800 hover:bg-blue-50"
            >
              @{mention} — {title}
            </button>
          ))}
        </fieldset>
      ) : (
        <fieldset
          className="mt-3 flex flex-wrap gap-1"
          aria-label="Mention a document"
        >
          {clinicalDocuments.map(({ id, mention }) => (
            <button
              type="button"
              key={id}
              onClick={() =>
                setInput(
                  (value) =>
                    `${value}${value && !value.endsWith(" ") ? " " : ""}@${mention} `,
                )
              }
              className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800"
            >
              @{mention}
            </button>
          ))}
        </fieldset>
      )}
    </div>
  );

  return (
    <div className="clinical-workspace">
      {runtimes.map((runtime) => {
        const document = clinicalDocuments.find(({ id }) => id === runtime.id);
        if (!document) return null;
        return (
          <div
            key={runtime.id}
            className={runtime.id === focusedId ? "h-screen" : "hidden"}
          >
            <ClinicalDocumentEditor
              doc={runtime.doc}
              provider={runtime.provider}
              workspace={{
                title: document.title,
                isFocused: runtime.id === focusedId,
                content: document.content,
                messages,
                input,
                setInput,
                sendMessage: submit,
                isLoading,
                disabled: !ready,
                documentsPanel,
                chatExtras,
                onEditor: register[runtime.id],
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
