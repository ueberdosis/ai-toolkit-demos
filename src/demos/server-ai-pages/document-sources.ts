import type { Editor, JSONContent } from "@tiptap/core";
import { ImportDocx } from "@tiptap-pro/extension-import-docx";
import { formatBytes, formatCount, formatDuration } from "./format";
import { generateDocument } from "./generate-document";
import type { Operation, PreparedOperation } from "./measure";
import type { PageFormatOption } from "./pages-extensions";
import type { PerfRecorder } from "./perf-recorder";

export const SUPPORTED_FILE_TYPES = [".docx", ".pdf", ".json", ".html", ".htm"];

export const REPEAT_OPTIONS = [1, 2, 5, 10];

/** Replaces the whole document outside the undo history. */
function replaceContent(editor: Editor, content: JSONContent | string): void {
  editor.chain().setContent(content).setMeta("addToHistory", false).run();
}

/** Concatenates the document's blocks `times` times, to build a large document from a real one. */
function repeatContent(content: JSONContent, times: number): JSONContent {
  if (times <= 1) return content;
  const blocks = content.content ?? [];
  return {
    ...content,
    content: Array.from({ length: times }, () => blocks).flat(),
  };
}

function parseTiptapJson(text: string): JSONContent {
  const value: unknown = JSON.parse(text);
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "doc"
  ) {
    return value as JSONContent;
  }
  throw new Error('Expected Tiptap JSON with a top-level "doc" node');
}

/** Converts the file with Tiptap Conversion; applying it also sets Pages headers, footers, and notes. */
function convertDocx(editor: Editor, file: File): Promise<PreparedOperation> {
  const canImport = editor.extensionManager.extensions.some(
    (extension) => extension.name === ImportDocx.name,
  );
  if (!canImport) {
    return Promise.reject(
      new Error("DOCX import is unavailable without a Conversion token"),
    );
  }

  return new Promise((resolve, reject) => {
    editor
      .chain()
      .importDocx({
        file,
        onImport: (context) => {
          if (context.error) {
            reject(context.error);
            return;
          }
          resolve({
            apply: () => context.setEditorContent(),
            details: [
              { label: "File", value: formatBytes(file.size) },
              {
                label: "Converter",
                value: `${context.logs.warn.length} warnings, ${context.logs.error.length} errors`,
              },
            ],
          });
        },
      })
      .run();
  });
}

export function generateOperation(editor: Editor, pages: number): Operation {
  return {
    label: `Generate ${formatCount(pages)} pages`,
    prepare: async () => {
      const content = generateDocument({ pages });
      return { apply: () => replaceContent(editor, content) };
    },
  };
}

/**
 * Imports a file, replacing the document. `repeat` concatenates the imported
 * content that many times; DOCX ignores it, since repeated footnote
 * references would point at the same notes.
 */
export function importFileOperation(
  editor: Editor,
  file: File,
  repeat = 1,
): Operation {
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  const repeats = extension === ".docx" ? 1 : repeat;
  const label =
    repeats > 1 ? `Import ${file.name} ×${repeats}` : `Import ${file.name}`;
  const details = [
    { label: "File", value: formatBytes(file.size) },
    ...(repeats > 1 ? [{ label: "Repeated", value: `×${repeats}` }] : []),
  ];

  switch (extension) {
    case ".docx":
      return { label, prepare: () => convertDocx(editor, file) };
    case ".pdf":
      return {
        label,
        prepare: async (reportProgress) => {
          // pdf.js is large, so it's only loaded when a PDF is imported.
          const { convertPdf } = await import("./pdf-import");
          const { content, stats } = await convertPdf(file, reportProgress);
          const repeated = repeatContent(content, repeats);
          return {
            apply: () => replaceContent(editor, repeated),
            details: [
              ...details,
              {
                label: "PDF",
                value: `${formatCount(stats.pages)} pages, ${formatCount(stats.characters)} characters`,
              },
              {
                label: "Rebuilt",
                value: `${formatCount(stats.headings)} headings, ${formatCount(stats.paragraphs)} paragraphs`,
              },
              {
                label: "Dropped",
                value: `${formatCount(stats.removedRunningLines)} running header, footer, and page number lines`,
              },
              {
                label: "Note",
                value: "text only, images, tables, and layout are not imported",
              },
            ],
          };
        },
      };
    case ".json":
      return {
        label,
        prepare: async () => {
          const content = repeatContent(
            parseTiptapJson(await file.text()),
            repeats,
          );
          return { apply: () => replaceContent(editor, content), details };
        },
      };
    case ".html":
    case ".htm":
      return {
        label,
        prepare: async () => {
          const html = (await file.text()).repeat(repeats);
          return { apply: () => replaceContent(editor, html), details };
        },
      };
    default:
      return {
        label,
        prepare: () =>
          Promise.reject(
            new Error(
              `Unsupported file type. Use ${SUPPORTED_FILE_TYPES.join(", ")}`,
            ),
          ),
      };
  }
}

export function clearOperation(editor: Editor): Operation {
  return {
    label: "Clear document",
    prepare: async () => ({ apply: () => replaceContent(editor, "") }),
  };
}

export function pageFormatOperation(
  editor: Editor,
  pageFormat: PageFormatOption,
): Operation {
  return {
    label: `Switch to ${pageFormat}`,
    prepare: async () => ({
      apply: () => {
        editor.commands.setPageFormat(pageFormat);
      },
    }),
  };
}

/** Downloads the document as Tiptap JSON and logs what serializing it costs. */
export function exportJson(
  editor: Editor,
  recorder: PerfRecorder,
  fileName: string,
): void {
  const startedAt = performance.now();
  const json = editor.getJSON();
  const serializedAt = performance.now();
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  const stringifiedAt = performance.now();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));

  recorder.log("success", "Exported JSON", [
    { label: "getJSON", value: formatDuration(serializedAt - startedAt) },
    {
      label: "Stringify",
      value: formatDuration(stringifiedAt - serializedAt),
    },
    { label: "Size", value: formatBytes(blob.size) },
  ]);
}
