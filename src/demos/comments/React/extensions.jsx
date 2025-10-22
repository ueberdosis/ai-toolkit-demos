import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

function NodeViewComponent({ selected }) {
  return (
    <NodeViewWrapper
      as="div"
      style={{
        border: "2px solid #cbd5e1",
        borderRadius: 8,
        background: selected ? "#f1f5f9" : "#fff",
        boxShadow: "0 2px 8px 0 #e2e8f0",
        padding: "24px",
        margin: "8px 0",
        outline: selected ? "2px solid #3b82f6" : "none",
        outlineOffset: "2px",
        transition: "box-shadow 0.2s, border-color 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
      }}
    >
      <span role="img" aria-label="smiley">
        😊
      </span>
    </NodeViewWrapper>
  );
}

export const NodeViewExtension = Node.create({
  name: "nodeView",

  group: "inline",
  inline: true,
  content: "",
  selectable: true,

  addAttributes() {
    return {
      // Store an optional "data" value from/to the DOM
      data: {
        default: null,
        parseHTML: (element) => element.getAttribute("data"),
        renderHTML: (attributes) => {
          if (!attributes?.data) {
            return {};
          }
          return { data: attributes.data };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Render as a div with the optional data attribute, no content hole
    return [
      "div",
      mergeAttributes(HTMLAttributes),
      ["span", { role: "img", "aria-label": "smiley" }, "😊"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NodeViewComponent);
  },

  addCommands() {
    return {
      insertNodeView:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
