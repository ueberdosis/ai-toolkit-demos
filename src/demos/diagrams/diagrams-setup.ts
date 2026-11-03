import type { JSONContent } from "@tiptap/react";
import {
  chartStyleRules,
  Diagrams,
  flowDiagramStyleRules,
} from "@tiptap-pro/extension-diagrams";
import {
  normalizeChartSpec,
  parseChartSyntax,
} from "@tiptap-pro/extension-diagrams/core";
import { echartsRenderer } from "@tiptap-pro/extension-diagrams/echarts";
import {
  mermaidDiagramRenderer,
  mermaidRenderer,
} from "@tiptap-pro/extension-diagrams/mermaid";

// The build emits both files as static assets; the Mermaid Renderer loads them into its iframe by URL.
const mermaidFiles = {
  mermaidUrl: new URL("mermaid/dist/mermaid.min.js", import.meta.url).href,
  rendererUrl: new URL(
    "@tiptap-pro/extension-diagrams/mermaid-renderer",
    import.meta.url,
  ).href,
};

/** The Diagrams extension with ECharts for charts and Mermaid for charts and diagrams. */
export const diagramsExtension = Diagrams.configure({
  resizable: true,
  renderers: [echartsRenderer(), mermaidRenderer(mermaidFiles)],
  diagramRenderers: [mermaidDiagramRenderer(mermaidFiles)],
});

/** The CSS that charts and diagrams need. */
export const diagramStyles = chartStyleRules() + flowDiagramStyleRules();

/** A short report with a bar chart and a Mermaid flow diagram. */
export const diagramsInitialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Quarterly report" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Revenue grew in every month of the first half, while costs grew more slowly.",
        },
      ],
    },
    {
      type: "chart",
      attrs: {
        data: parseChartSyntax(
          "Month | Revenue | Costs\nJan | 120 | 80\nFeb | 150 | 95\nMar | 110 | 90\nApr | 180 | 100\nMay | 160 | 105\nJun | 210 | 120",
        ).data,
        spec: normalizeChartSpec({ title: "Revenue and costs" }, "bar"),
      },
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Every order goes through the same steps." },
      ],
    },
    {
      type: "flowDiagram",
      attrs: {
        format: "mermaid",
        source:
          "flowchart LR\n  A[Order] --> B{In stock?}\n  B -->|yes| C[Ship]\n  B -->|no| D[Reorder]\n  D --> C",
        title: "Order flow",
      },
    },
  ],
};
