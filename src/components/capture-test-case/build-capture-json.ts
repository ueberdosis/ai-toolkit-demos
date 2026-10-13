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
  type?: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  content?: PmNode[];
}

interface TiptapReadOutput {
  content?: PmNode[];
  nodeRange?: [number, number];
}

/** One item of a tiptapQuery read result. */
interface QueryReadItem {
  hash?: string;
  type?: string;
  text?: string;
  content?: unknown;
}

interface TiptapQueryOutput {
  operationResults?: { items?: QueryReadItem[] }[];
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
  if (typeof hash === "string" && hash.length > 0) {
    into.attrs ??= {};
    into.attrs._hash = hash;
  }
  const intoContent = into.content ?? [];
  const fromContent = from.content ?? [];
  const count = Math.min(intoContent.length, fromContent.length);
  for (let i = 0; i < count; i += 1) {
    copyHashes(intoContent[i], fromContent[i]);
  }
}

/** Removes the line breaks and leaf placeholders that tiptapQuery adds to read text. */
function withoutBreaks(text: string): string {
  return text.replace(/[\n￼]/g, "");
}

/** Text of a node, comparable with tiptapQuery read text. */
function comparableText(node: PmNode): string {
  if (typeof node.text === "string") {
    return withoutBreaks(node.text);
  }
  return (node.content ?? []).map(comparableText).join("");
}

/** All nodes below `root` in document order, without text nodes. */
function descendantsOf(root: PmNode): PmNode[] {
  return (root.content ?? []).flatMap((child) =>
    child.type === "text" ? [] : [child, ...descendantsOf(child)],
  );
}

/**
 * Stamps the hash of a tiptapQuery read item onto the one node it can belong
 * to: a node of the item's type with the same text or, for a text match, the
 * text block that contains the text. Leaves ambiguous items unstamped.
 */
function stampQueryItem(nodes: PmNode[], item: QueryReadItem): void {
  const { hash, type } = item;
  if (
    !hash ||
    !type ||
    type === "content" ||
    nodes.some((node) => node.attrs?._hash === hash)
  ) {
    return;
  }
  const itemNodes = Array.isArray(item.content)
    ? (item.content as PmNode[])
    : undefined;
  const itemText = item.text ?? itemNodes?.map(comparableText).join("");
  if (itemText === undefined) {
    return;
  }
  const text = withoutBreaks(itemText);
  const unhashed = nodes.filter((node) => !node.attrs?._hash);
  const candidates =
    type === "text"
      ? unhashed.filter(
          (node) =>
            node.content?.some((child) => child.type === "text") &&
            comparableText(node).includes(text),
        )
      : unhashed.filter(
          (node) => node.type === type && comparableText(node) === text,
        );
  if (candidates.length !== 1) {
    return;
  }
  const [node] = candidates;
  node.attrs = { ...node.attrs, _hash: hash };
  if (type !== "text" && itemNodes?.length === 1) {
    copyHashes(node, itemNodes[0]);
  }
}

/**
 * The editor's raw `documentBefore` has no `_hash` attrs on nodes the toolkit
 * has not read yet. The toolkit assigns them (randomly) when it reads, and edit
 * operations target those hashes. So stamp the hashes from the captured
 * `tiptapRead` and `tiptapQuery` outputs onto the before-doc; without this,
 * replaying the capture can't find the targeted nodes.
 */
function withReplayHashes(
  documentBefore: unknown,
  toolCalls: CaptureToolCall[],
): unknown {
  if (!documentBefore || typeof documentBefore !== "object") {
    return documentBefore;
  }
  const reads = toolCalls.filter(
    (call) =>
      call.toolName === "tiptapRead" &&
      Array.isArray((call.output as TiptapReadOutput | null)?.content),
  );
  const queries = toolCalls.filter((call) => call.toolName === "tiptapQuery");
  if (reads.length === 0 && queries.length === 0) {
    return documentBefore;
  }

  const before = deepClone(documentBefore) as PmNode;
  const beforeNodes = before.content ?? [];
  for (const read of reads) {
    const output = read.output as TiptapReadOutput;
    const readNodes = output.content ?? [];
    const offset = output.nodeRange?.[0] ?? 0;
    for (let i = 0; i < readNodes.length; i += 1) {
      copyHashes(beforeNodes[offset + i], readNodes[i]);
    }
  }
  const nodes = descendantsOf(before);
  for (const query of queries) {
    const output = query.output as TiptapQueryOutput | null;
    for (const result of output?.operationResults ?? []) {
      for (const item of result.items ?? []) {
        stampQueryItem(nodes, item);
      }
    }
  }
  return before;
}

/**
 * Builds the JSON a developer copies when they spot a toolkit bug: the document
 * before and after the AI's edits, the schema, and the tool calls/requests made
 * to the Server AI Toolkit. `documentBefore` carries the `_hash` values the edit
 * operations target (stamped from the captured reads) so the capture replays
 * directly. `editorContext` is included once to keep the payload small.
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
