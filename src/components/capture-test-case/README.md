# Copy test case

`<CopyTestCaseButton>` copies the latest AI run as a JSON `{ documentBefore, documentAfter, editorContext, toolCalls }` — the raw material for turning a spotted Server AI Toolkit bug into a regression test by hand. It is mounted on the server demos (tracked-changes, agent-chatbot, comments).

## The copied JSON

- **`documentBefore` / `documentAfter`** — the document before the prompt and after the run settles.
- **`documentBefore` carries the `_hash` values the edit operations target** (stamped from the `tiptapRead` output). The editor itself has no hashes — the toolkit assigns them (randomly) during `tiptapRead` — so without this stamping a replay fails with _"target not found"_. With it, `documentBefore` posts directly to `/v3/toolkit/execute-tool`.
- **`editorContext`** — the serialized schema, included once.
- **`toolCalls`** — the requests made to the toolkit: `toolName`, `input`, the route's `reviewOptions`, and the `output`.

## Writing the test — two things to know

1. **Comment threads are cloud-only.** Replaying a capture inline reproduces the tracked-changes encoding (`suggestion` marks: `replaceDeletion` / `replaceInsertion` / `add` / `delete`) but **not** the `inlineThread` marks — those need the Tiptap Cloud thread backend. Assert on the suggestion encoding; cover threads via the cloud path (e.g. MSW) if you need them.
2. **`suggestion.id` and `suggestion.createdAt` are non-deterministic** (random UUID + wall-clock timestamp). Don't assert on them — assert on `suggestionType`, `userId`, and the text.
