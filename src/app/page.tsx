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
            description:
              "Preview AI suggestions before applying, accept or reject each one",
            href: "/preview-changes",
          },
          {
            title: "Review Changes",
            description:
              "Changes applied first, then review. Accept or reject afterward",
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
            description:
              "Tracked changes with comment threads explaining each edit",
            href: "/tracked-changes-comments",
          },
          {
            title: "Split View",
            description: "Side-by-side view of original and AI-edited document",
            href: "/split-view",
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
            description:
              "Transform documents with precise AI operations (replace, insert)",
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
            description:
              "AI agent running server-side via Tiptap Cloud for enhanced security",
            href: "/server-ai-agent-chatbot",
          },
          {
            title: "Server Comments",
            description: "Server-side comment threads stored on Tiptap Cloud",
            href: "/server-comments",
          },
          {
            title: "Server Tracked Changes",
            description: "Review server-side AI edits as tracked changes",
            href: "/server-ai-tracked-changes",
          },
          {
            title: "Server Tracked + Comments",
            description:
              "Tracked changes with server-side comments explaining each edit",
            href: "/server-ai-tracked-changes-comments",
          },
        ],
      },
    ],
  },
];

const COLOR_MAP: Record<
  string,
  { dot: string; hoverBg: string; hoverBorder: string }
> = {
  blue: {
    dot: "bg-blue-500",
    hoverBg: "hover:bg-blue-50",
    hoverBorder: "hover:border-blue-200",
  },
  emerald: {
    dot: "bg-emerald-500",
    hoverBg: "hover:bg-emerald-50",
    hoverBorder: "hover:border-emerald-200",
  },
  violet: {
    dot: "bg-violet-500",
    hoverBg: "hover:bg-violet-50",
    hoverBorder: "hover:border-violet-200",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
            Tiptap AI Toolkit Demos
          </h1>
          <p className="text-sm text-gray-400">
            Explore the demos below to see the AI Toolkit in action.
          </p>
        </div>

        <div className="space-y-12">
          {CATEGORIES.map((category) => {
            const colors = COLOR_MAP[category.color];

            return (
              <section key={category.title}>
                <div className="mb-1 flex items-center gap-2.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                  />
                  <h2 className="text-base font-semibold text-gray-900">
                    {category.title}
                  </h2>
                </div>
                <p className="mb-5 ml-[18px] text-sm text-gray-400">
                  {category.description}
                </p>

                <div className="space-y-5">
                  {category.groups.map((group) => (
                    <div key={group.heading ?? "main"}>
                      {group.heading && (
                        <h3 className="mb-2 ml-[18px] text-xs font-medium uppercase tracking-widest text-gray-400">
                          {group.heading}
                        </h3>
                      )}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`group block rounded-lg border border-gray-100 bg-white px-3.5 py-2.5 transition-all ${colors.hoverBg} ${colors.hoverBorder} hover:shadow-sm`}
                          >
                            <span className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-950">
                              {item.title}
                            </span>
                            {"description" in item && item.description && (
                              <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
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

        <div className="mt-14 text-center text-xs text-gray-300">
          Set{" "}
          <code className="rounded bg-gray-50 px-1.5 py-0.5 text-gray-400">
            OPENAI_API_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-gray-50 px-1.5 py-0.5 text-gray-400">
            ANTHROPIC_API_KEY
          </code>{" "}
          environment variables to use these demos.
        </div>
      </div>
    </div>
  );
}
