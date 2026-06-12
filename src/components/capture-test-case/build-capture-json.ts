/** One tool call pulled from the chat stream: a request to the Server AI Toolkit and its result. */
export interface CaptureToolCall {
  toolName: string;
  input: unknown;
  output: unknown;
}

interface BuildCaptureArgs {
  documentBefore: unknown;
  documentAfter: unknown;
  editorContext: unknown;
  toolCalls: CaptureToolCall[];
  /**
   * Request params the demo's route adds server-side (e.g. `reviewOptions`),
   * merged into each tool call so the copied requests match what the toolkit saw.
   */
  requestConfig?: Record<string, unknown>;
}

interface PmNode {
  attrs?: Record<string, unknown> | null;
  content?: PmNode[];
}

interface TiptapReadOutput {
  content?: PmNode[];
  nodeRange?: [number, number];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Copy `_hash` from `from` onto `into` recursively, wherever node positions
 * align. Block hashes live on block nodes, so this is robust even when inline
 * content differs (e.g. tracked-changes read views).
 */
function copyHashes(into: PmNode | undefined, from: PmNode | undefined): void {
  if (!into || !from) {
    return;
  }
  const hash = from.attrs?._hash;
  if (typeof hash === "string" && hash.length > 0 && into.attrs) {
    into.attrs._hash = hash;
  }
  const intoContent = into.content ?? [];
  const fromContent = from.content ?? [];
  const count = Math.min(intoContent.length, fromContent.length);
  for (let i = 0; i < count; i += 1) {
    copyHashes(intoContent[i], fromContent[i]);
  }
}

/**
 * The editor's raw `documentBefore` has no `_hash` attrs — the toolkit assigns
 * them (randomly) during `tiptapRead`, and edit operations `target` those
 * hashes. So stamp the hashes from the captured `tiptapRead` output onto the
 * before-doc; without this, replaying the capture fails with "target not found".
 */
function withReplayHashes(
  documentBefore: unknown,
  toolCalls: CaptureToolCall[],
): unknown {
  const read = toolCalls.find(
    (call) =>
      call.toolName === "tiptapRead" &&
      Array.isArray((call.output as TiptapReadOutput | null)?.content),
  );
  if (!read || !documentBefore || typeof documentBefore !== "object") {
    return documentBefore;
  }

  const output = read.output as TiptapReadOutput;
  const before = deepClone(documentBefore) as PmNode;
  const beforeNodes = before.content ?? [];
  const readNodes = output.content ?? [];
  const offset = output.nodeRange?.[0] ?? 0;
  for (let i = 0; i < readNodes.length; i += 1) {
    copyHashes(beforeNodes[offset + i], readNodes[i]);
  }
  return before;
}

/**
 * Builds the JSON a developer copies when they spot a toolkit bug: the document
 * before and after the AI's edits, the schema, and the tool calls/requests made
 * to the Server AI Toolkit. `documentBefore` carries the `_hash` values the edit
 * operations target (stamped from the `tiptapRead` output) so the capture
 * replays directly. `editorContext` is included once to keep the payload small.
 * The result is raw material a human turns into a regression test by hand.
 */
export function buildCaptureJson(args: BuildCaptureArgs): string {
  const toolCalls = args.toolCalls.map((call) => ({
    toolName: call.toolName,
    input: call.input,
    ...(args.requestConfig ?? {}),
    output: call.output,
  }));

  return JSON.stringify(
    {
      documentBefore: withReplayHashes(args.documentBefore, args.toolCalls),
      documentAfter: args.documentAfter,
      editorContext: args.editorContext,
      toolCalls,
    },
    null,
    2,
  );
}
