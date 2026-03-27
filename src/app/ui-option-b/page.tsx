import Link from "next/link";

interface DemoRow {
  title: string;
  description: string;
  links: { label: string; href: string }[];
}

interface Category {
  title: string;
  rows: DemoRow[];
}

const CATEGORIES: Category[] = [
  {
    title: "AI Agents",
    rows: [
      {
        title: "AI Agent Chatbot",
        description: "Chat-based document editing with AI tools",
        links: [{ label: "Chatbot", href: "/ai-agent-chatbot" }],
      },
      {
        title: "Review Changes",
        description: "Preview or review AI suggestions, accept or reject each change individually",
        links: [
          { label: "Preview Changes", href: "/preview-changes" },
          { label: "Review Changes", href: "/review-changes" },
          { label: "Justified Changes", href: "/justified-changes" },
        ],
      },
      {
        title: "Streaming",
        description: "Real-time streaming with optional review modes",
        links: [
          { label: "Basic Streaming", href: "/tool-streaming" },
          { label: "Stream + Preview", href: "/preview-changes-streaming" },
          { label: "Stream + Review", href: "/review-changes-streaming" },
        ],
      },
      {
        title: "Tracked Changes",
        description: "Review AI edits as tracked changes, with optional comment threads",
        links: [
          { label: "Tracked Changes", href: "/tracked-changes" },
          { label: "Tracked + Comments", href: "/tracked-changes-comments" },
        ],
      },
      {
        title: "Multi-document",
        description: "Edit across multiple documents simultaneously",
        links: [{ label: "Multi-document", href: "/multi-document" }],
      },
      {
        title: "Comments",
        description: "AI-powered commenting system",
        links: [{ label: "Comments", href: "/comments" }],
      },
      {
        title: "Schema Awareness",
        description: "Custom node and mark support",
        links: [{ label: "Schema Awareness", href: "/schema-awareness" }],
      },
      {
        title: "Selection Awareness",
        description: "Context-aware editing from selection",
        links: [{ label: "Selection Awareness", href: "/selection-awareness" }],
      },
    ],
  },
  {
    title: "Workflows",
    rows: [
      {
        title: "Workflows",
        description:
          "Simple, single-task AI operations with ready-to-use prompts",
        links: [
          { label: "Insert Content", href: "/insert-content-workflow" },
          { label: "Proofreader", href: "/proofreader" },
          { label: "Tiptap Edit (replace, insert)", href: "/tiptap-edit-workflow" },
          { label: "Comments Workflow", href: "/comments-workflow" },
          { label: "Template Workflow", href: "/template-workflow" },
        ],
      },
    ],
  },
  {
    title: "Server AI Toolkit",
    rows: [
      {
        title: "Server AI Toolkit",
        description:
          "AI operations running server-side via Tiptap Cloud for enhanced security",
        links: [
          { label: "Server Chatbot", href: "/server-ai-agent-chatbot" },
          { label: "Server Comments", href: "/server-comments" },
        ],
      },
    ],
  },
];

export default function UIOptionB() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tiptap AI Toolkit Demos
          </h1>
          <p className="text-gray-500 text-sm">
            Explore the demos below to see the AI Toolkit in action.
          </p>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map((category) => (
            <section key={category.title}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                {category.title}
              </h2>

              <div className="space-y-0 divide-y divide-gray-100">
                {category.rows.map((row) => (
                  <div
                    key={row.title}
                    className="py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-medium text-gray-900">
                          {row.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {row.description}
                        </p>
                      </div>
                      {row.links.length <= 3 && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {row.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="inline-block rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {row.links.length > 3 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {row.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="inline-block rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-gray-400">
          Set <code className="bg-gray-200 px-1 rounded">OPENAI_API_KEY</code>{" "}
          and{" "}
          <code className="bg-gray-200 px-1 rounded">ANTHROPIC_API_KEY</code>{" "}
          environment variables to use these demos.
        </div>
      </div>
    </div>
  );
}
