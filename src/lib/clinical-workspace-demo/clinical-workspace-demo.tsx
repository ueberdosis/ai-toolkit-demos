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
  getClinicalDocumentConfig,
  refreshClinicalDocumentToken,
} from "@/lib/clinical-workspace-demo/actions";
import { ClinicalDocumentEditor } from "./document-editor";
import { clinicalDocuments } from "./documents";
import {
  type WorkspaceDocument,
  workspaceDocumentSchema,
} from "./workspace-documents";
import "./clinical-workspace.css";

type DocumentRuntime = {
  id: string;
  metadata: WorkspaceDocument;
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
    title: "Create a participant visit guide",
    text: "Read @Protocol and @Consent, then create a new document titled Participant visit guide with the mention @VisitGuide. Summarize the visit schedule, assessments, and participant responsibilities in plain language. Use the protocol as the source of truth, flag uncertainties for review, and leave the source documents unchanged.",
  },
];

export function ClinicalWorkspaceDemo() {
  const [runtimes, setRuntimes] = useState<DocumentRuntime[]>([]);
  const [workspaceToken, setWorkspaceToken] = useState("");
  const [setupError, setSetupError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [connectingDocument, setConnectingDocument] = useState(false);
  const retryDocumentsRef = useRef<() => void>(() => {});
  const addDocumentRef = useRef<(document: WorkspaceDocument) => void>(
    () => {},
  );
  const addDocument = useCallback(
    (document: WorkspaceDocument) => addDocumentRef.current(document),
    [],
  );

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
      const connecting = new Set<string>();
      const connect = async (
        metadata: WorkspaceDocument,
        connection?: Awaited<ReturnType<typeof getClinicalDocumentConfig>>,
      ) => {
        const { id } = metadata;
        if (connecting.has(id)) return;
        connecting.add(id);
        const { documentId, config } =
          connection ?? (await getClinicalDocumentConfig(workspace.token, id));
        if (cancelled) return;
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
            if (
              resources.length >= clinicalDocuments.length &&
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
        resources.push({ id, metadata, documentId, doc, provider });
        // Render new editors immediately, and keep chat disabled until they sync.
        if (resources.length > clinicalDocuments.length)
          setRuntimes([...resources]);
      };
      const pending = new Map<string, WorkspaceDocument>();
      const openPending = () => {
        setConnectingDocument(pending.size > 0);
        for (const document of pending.values()) {
          if (connecting.has(document.id)) continue;
          void connect(document)
            .then(() => {
              if (cancelled) return;
              pending.delete(document.id);
              setConnectingDocument(pending.size > 0);
            })
            .catch((error) => {
              connecting.delete(document.id);
              if (!cancelled)
                setSetupError(
                  error instanceof Error
                    ? error.message
                    : "Could not connect the new document.",
                );
            });
        }
      };
      addDocumentRef.current = (document) => {
        pending.set(document.id, document);
        openPending();
      };
      retryDocumentsRef.current = openPending;
      await Promise.all(
        clinicalDocuments.map((document) =>
          connect(
            document,
            workspace.documents.find(({ id }) => id === document.id),
          ),
        ),
      );
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
      addDocumentRef.current = () => {};
      retryDocumentsRef.current = () => {};
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
              retryDocumentsRef.current();
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
        connectionError={Boolean(setupError) || connectingDocument}
        onDocumentCreated={addDocument}
      />
    </>
  );
}

function StudyWorkspace({
  runtimes,
  workspaceToken,
  connectionError,
  onDocumentCreated,
}: {
  connectionError: boolean;
  onDocumentCreated: (document: WorkspaceDocument) => void;
  runtimes: DocumentRuntime[];
  workspaceToken: string;
}) {
  const [focusedId, setFocusedId] = useState<string>("protocol");
  const documents = useMemo(
    () => runtimes.map(({ metadata }) => metadata),
    [runtimes],
  );
  const documentsRef = useRef(documents);
  documentsRef.current = documents;
  const [input, setInput] = useState("");
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [hasPendingChanges, setHasPendingChanges] = useState(true);
  const editors = useRef(new Map<string, Editor>());
  const focusedRef = useRef(focusedId);
  focusedRef.current = focusedId;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/clinical-workspace",
        body: () => ({
          workspaceToken,
          documents: documentsRef.current,
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
  const createdIds = useRef(new Set<string>());
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type !== "tool-createDocument" ||
          !("state" in part) ||
          part.state !== "output-available" ||
          !("output" in part)
        )
          continue;
        const output = part.output as { document?: unknown } | null;
        const parsed = workspaceDocumentSchema.safeParse(output?.document);
        if (!parsed.success || createdIds.current.has(parsed.data.id)) continue;
        createdIds.current.add(parsed.data.id);
        onDocumentCreated(parsed.data);
      }
    }
  }, [messages, onDocumentCreated]);
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
    readyIds.size === documents.length &&
    !hasPendingChanges &&
    !connectionError;
  const register = useRef(new Map<string, (editor: Editor | null) => void>());
  for (const { id } of documents) {
    if (!register.current.has(id))
      register.current.set(id, (editor) => {
        if (editor) editors.current.set(id, editor);
        else editors.current.delete(id);
        setReadyIds(new Set(editors.current.keys()));
      });
  }

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
        review existing documents and create new drafts.
      </p>
      {documents.map((document) => (
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

  const mentionMatch = /@([a-z][a-z0-9]*|)$/i.exec(input);
  const mentions = mentionMatch
    ? documents.filter(({ mention }) =>
        mention.toLowerCase().startsWith(mentionMatch[1].toLowerCase()),
      )
    : [];
  const chatExtras = (
    <div className="max-h-[55vh] shrink-0 overflow-y-auto border-t border-slate-100 px-4 py-3">
      <p className="mb-2 text-xs text-slate-500">
        Focused on{" "}
        <strong>{documents.find(({ id }) => id === focusedId)?.mention}</strong>
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
            Try a study document task
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
                setInput(input.replace(/@[a-z0-9]*$/i, `@${mention} `))
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
          {documents.map(({ id, mention }) => (
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
        const document = runtime.metadata;
        const onEditor = register.current.get(runtime.id);
        if (!onEditor) return null;
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
                content:
                  clinicalDocuments.find(({ id }) => id === runtime.id)
                    ?.content ?? "",
                messages,
                input,
                setInput,
                sendMessage: submit,
                isLoading,
                disabled: !ready,
                documentsPanel,
                chatExtras,
                onEditor,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
