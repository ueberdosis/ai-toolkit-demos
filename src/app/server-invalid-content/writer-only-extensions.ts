import { Mark, mergeAttributes, Node } from "@tiptap/core";

/**
 * A block node that only the writer's editor knows. The AI request schema doesn't have it,
 * so the server sees it as invalid content.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-callout": "" }), 0];
  },
});

/**
 * A mark that only the writer's editor knows. The AI request schema doesn't have it,
 * so the server sees the text that uses it as invalid content.
 */
export const Highlight = Mark.create({
  name: "highlight",

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", HTMLAttributes, 0];
  },
});
