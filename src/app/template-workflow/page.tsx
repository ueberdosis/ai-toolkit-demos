"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  createHtmlTemplate,
  getAiToolkit,
} from "@tiptap-pro/ai-toolkit";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { z } from "zod";

import "./template-workflow.css";

const TEMPLATE = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Non-Disclosure Agreement" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'This Non-Disclosure Agreement ("Agreement") is entered into as of the date set forth below.',
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Parties" }],
    },
    {
      type: "paragraph",
      attrs: { _templateSlot: "parties" },
      content: [
        {
          type: "text",
          text: "Party details will be generated here.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "1. Definition of Confidential Information",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: '"Confidential Information" means any and all non-public information, including but not limited to trade secrets, business plans, financial data, technical data, customer lists, and any other proprietary information disclosed by either party to the other, whether orally, in writing, or by any other means.',
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "2. Obligations of Receiving Party" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose the Confidential Information to any third parties without the prior written consent of the Disclosing Party; (c) use the Confidential Information solely for the purpose of evaluating and engaging in discussions concerning a potential business relationship between the parties.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
        _templateIf: "includeArbitration",
      },
      content: [{ type: "text", text: "3. Arbitration Clause" }],
    },
    {
      type: "paragraph",
      attrs: {
        _templateIf: "includeArbitration",
        _templateSlot: "arbitration",
      },
      content: [
        {
          type: "text",
          text: "Arbitration details will be generated here.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "4. Term and Termination" }],
    },
    {
      type: "paragraph",
      attrs: { _templateSlot: "term" },
      content: [
        {
          type: "text",
          text: "Term and termination details will be generated here.",
        },
      ],
    },
    {
      type: "heading",
      attrs: {
        level: 2,
        _templateAttributes: [{ key: "governingLawLevel", attribute: "level" }],
      },
      content: [{ type: "text", text: "5. Governing Law" }],
    },
    {
      type: "paragraph",
      attrs: { _templateSlot: "governingLaw" },
      content: [
        {
          type: "text",
          text: "Governing law details will be generated here.",
        },
      ],
    },
  ],
};

const templateSchema = z.object({}).passthrough();

const INITIAL_CONTENT = `<h1>Non-Disclosure Agreement</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into as of the date set forth below.</p>
<h2>Parties</h2>
<p><code>Party details will be generated here.</code></p>
<h2>1. Definition of Confidential Information</h2>
<p>"Confidential Information" means any and all non-public information, including but not limited to trade secrets, business plans, financial data, technical data, customer lists, and any other proprietary information disclosed by either party to the other, whether orally, in writing, or by any other means.</p>
<h2>2. Obligations of Receiving Party</h2>
<p>The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose the Confidential Information to any third parties without the prior written consent of the Disclosing Party; (c) use the Confidential Information solely for the purpose of evaluating and engaging in discussions concerning a potential business relationship between the parties.</p>
<h2>3. Arbitration Clause</h2>
<p><code>Arbitration details will be generated here.</code></p>
<h2>4. Term and Termination</h2>
<p><code>Term and termination details will be generated here.</code></p>
<h2>5. Governing Law</h2>
<p><code>Governing law details will be generated here.</code></p>`;

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: INITIAL_CONTENT,
  });

  const [workflowId, setWorkflowId] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  const { submit, isLoading, object } = useObject({
    api: "/api/template-workflow",
    schema: templateSchema,
    onFinish: () => {
      setHasGenerated(true);
    },
  });

  useEffect(() => {
    if (!editor || !object) return;

    const toolkit = getAiToolkit(editor);
    toolkit.templateWorkflow({
      template: TEMPLATE,
      values: object as Record<string, unknown>,
      position: "document",
      hasFinished: !isLoading,
      workflowId,
    });
  }, [object, workflowId, editor, isLoading]);

  const generate = () => {
    if (!editor) return;

    const htmlTemplate = createHtmlTemplate(TEMPLATE, editor.schema);
    setWorkflowId(uuid());
    submit({
      htmlTemplate,
      task: "Generate a Non-Disclosure Agreement between Acme Corporation (a Delaware corporation) and Beta Technologies LLC (a California limited liability company). The agreement should be governed by the laws of the State of New York. Include an arbitration clause. The agreement term should be 2 years. Write 1-2 paragraphs for each section slot.",
    });
  };

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Template workflow demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-50"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={isLoading || hasGenerated}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
      >
        {isLoading ? "Generating..." : "Fill template with AI"}
      </button>
    </div>
  );
}
