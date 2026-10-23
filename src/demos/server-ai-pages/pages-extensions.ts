import { Collaboration } from "@tiptap/extension-collaboration";
import { ConvertKit } from "@tiptap-pro/extension-convert-kit";
import {
  type PageFormat,
  Pages,
  type YDocLike,
} from "@tiptap-pro/extension-pages";
import { TableKit } from "@tiptap-pro/extension-pages-tablekit";
import type * as Y from "yjs";

export const PAGE_GAP_BACKGROUND = "#f1f5f9";

export const PAGE_FORMAT_OPTIONS = [
  "A4",
  "Letter",
] as const satisfies readonly PageFormat[];

export type PageFormatOption = (typeof PAGE_FORMAT_OPTIONS)[number];

/** Fields shared by the header/footer, footnotes and endnotes resolver contexts. */
type SubEditorContext = {
  isCollaborative: boolean;
  ydoc: YDocLike | null;
  field: string;
};

function contentExtensions() {
  // Collaboration brings its own undo history, which conflicts with ConvertKit's UndoRedo.
  return [
    ConvertKit.configure({ table: false, undoRedo: false }),
    TableKit.configure(),
  ];
}

/** Mirrors the main schema in every sub-editor and binds it to its own Y field. */
function subEditorExtensions(context: SubEditorContext) {
  if (!context.isCollaborative || !context.ydoc) return contentExtensions();
  return [
    ...contentExtensions(),
    Collaboration.configure({
      document: context.ydoc as Y.Doc,
      field: context.field,
    }),
  ];
}

/** ConvertKit schema, pagination-safe tables, and the Pages layout. */
export function createPagesExtensions() {
  return [
    ...contentExtensions(),
    Pages.configure({
      pageFormat: "A4",
      pageGapBackground: PAGE_GAP_BACKGROUND,
      // Same token names as the defaults; naming them explicitly makes DOCX
      // imports emit Word's NUMPAGES field as `{total}` instead of `{numpages}`.
      placeholders: { page: "page", total: "total" },
      // No header/footer defaults: with collaboration on, the Y.Doc owns that content.
      headerFooterExtensions: subEditorExtensions,
      footnotes: { enabled: true, extensions: subEditorExtensions },
      endnotes: { enabled: true, extensions: subEditorExtensions },
    }),
  ];
}
