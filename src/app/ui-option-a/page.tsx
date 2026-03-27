import Link from "next/link";

const CATEGORIES = [
  {
    title: "AI Agents",
    description:
      "AI agents allow the AI model to choose from a set of tools to perform complex, multi-turn tasks.",
    color: "blue",
    groups: [
      {
        heading: null,
        items: [
          {
            title: "AI Agent Chatbot",
            description: "Chat-based document editing with AI tools",
            href: "/ai-agent-chatbot",
          },
          {
            title: "Multi-document",
            description: "Edit across multiple documents simultaneously",
            href: "/multi-document",
          },
          {
            title: "Comments",
            description: "AI-powered commenting system",
            href: "/comments",
          },
          {
            title: "Schema Awareness",
            description: "Custom node and mark support",
            href: "/schema-awareness",
          },
          {
            title: "Selection Awareness",
            description: "Context-aware editing from selection",
            href: "/selection-awareness",
          },
        ],
      },
      {
        heading: "Review Changes",
        items: [
          {
            title: "Preview Changes",
            description: "Preview AI suggestions before applying, accept or reject each one",
            href: "/preview-changes",
          },
          {
            title: "Review Changes",
            description: "Changes applied first, then review. Accept or reject afterward",
            href: "/review-changes",
          },
          {
            title: "Justified Changes",
            description: "AI explains reasoning for each change",
            href: "/justified-changes",
          },
        ],
      },
      {
        heading: "Streaming",
        items: [
          {
            title: "Basic Streaming",
            description: "Real-time AI response streaming",
            href: "/tool-streaming",
          },
          {
            title: "Streaming + Preview",
            description: "Stream with change preview overlay",
            href: "/preview-changes-streaming",
          },
          {
            title: "Streaming + Review",
            description: "Stream with accept/reject review flow",
            href: "/review-changes-streaming",
          },
        ],
      },
      {
        heading: "Tracked Changes",
        items: [
          {
            title: "Tracked Changes",
            description: "Review AI edits as tracked changes",
            href: "/tracked-changes",
          },
          {
            title: "Tracked + Comments",
            description: "Tracked changes with comment threads explaining each edit",
            href: "/tracked-changes-comments",
          },
        ],
      },
    ],
  },
  {
    title: "Workflows",
    description:
      "Simple, single-task AI operations with ready-to-use prompts and schemas.",
    color: "emerald",
    groups: [
      {
        heading: null,
        items: [
          {
            title: "Insert Content",
            description: "Generate and insert new content with AI",
            href: "/insert-content-workflow",
          },
          {
            title: "Proofreader",
            description: "Automatic grammar and style corrections",
            href: "/proofreader",
          },
          {
            title: "Tiptap Edit",
            description: "Transform documents with precise AI operations (replace, insert)",
            href: "/tiptap-edit-workflow",
          },
          {
            title: "Comments Workflow",
            description: "Automated commenting via AI workflow",
            href: "/comments-workflow",
          },
          {
            title: "Template Workflow",
            description: "Generate content from predefined templates",
            href: "/template-workflow",
          },
        ],
      },
    ],
  },
  {
    title: "Server AI Toolkit",
    description:
      "Server-side AI operations for enhanced security and collaborative editing.",
    color: "violet",
    groups: [
      {
        heading: null,
        items: [
          {
            title: "Server Chatbot",
            description: "AI agent running server-side via Tiptap Cloud for enhanced security",
            href: "/server-ai-agent-chatbot",
          },
          {
            title: "Server Comments",
            description: "Server-side comment threads stored on Tiptap Cloud",
            href: "/server-comments",
          },
        ],
      },
    ],
  },
];

const COLOR_MAP: Record<string, { card: string; cardHover: string; badge: string; border: string }> = {
  blue: {
    card: "bg-blue-100",
    cardHover: "hover:bg-blue-200",
    badge: "bg-blue-600 text-white",
    border: "border-blue-300",
  },
  emerald: {
    card: "bg-emerald-100",
    cardHover: "hover:bg-emerald-200",
    badge: "bg-emerald-600 text-white",
    border: "border-emerald-300",
  },
  violet: {
    card: "bg-violet-100",
    cardHover: "hover:bg-violet-200",
    badge: "bg-violet-600 text-white",
    border: "border-violet-300",
  },
};

export default function UIOptionA() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tiptap AI Toolkit Demos
          </h1>
          <p className="text-gray-500 text-sm">Explore the demos below to see the AI Toolkit in action.</p>
        </div>

        <div className="space-y-10">
          {CATEGORIES.map((category) => {
            const colors = COLOR_MAP[category.color];

            return (
              <section key={category.title}>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {category.title}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {category.description}
                </p>

                <div className="space-y-4">
                  {category.groups.map((group) => (
                    <div key={group.heading ?? "main"}>
                      {group.heading && (
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {group.heading}
                        </h3>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block rounded-lg border p-4 transition-colors ${colors.card} ${colors.cardHover} ${colors.border}`}
                          >
                            <span className="text-base font-medium text-gray-900">
                              {item.title}
                            </span>
                            {"description" in item && item.description && (
                              <span className="block text-sm text-gray-500 mt-0.5">
                                {item.description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
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
