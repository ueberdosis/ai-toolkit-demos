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
      {
        heading: "Insert Content + Review UI",
        items: [
          {
            title: "Preview Changes",
            description:
              "Insert content workflow with preview mode — review before applying",
            href: "/insert-content-workflow-preview",
          },
          {
            title: "Review Changes",
            description:
              "Insert content workflow with review mode — changes applied, then accept or reject",
            href: "/insert-content-workflow-review",
          },
          {
            title: "Tracked Changes",
            description:
              "Insert content workflow with tracked changes — persistent collaborative review",
            href: "/insert-content-workflow-tracked-changes",
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
        heading: "Agents",
        items: [
          {
            title: "Server Chatbot",
            description:
              "AI agent running server-side via Tiptap Cloud for enhanced security",
            href: "/server-ai-agent-chatbot",
          },
          {
            title: "Server Selection Awareness",
            description:
              "Selection-aware server agent that edits only the active selection",
            href: "/server-selection-awareness",
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
      {
        heading: "Workflows",
        items: [
          {
            title: "Server Insert Content",
            description:
              "Selection-based insert workflow executed on the server",
            href: "/server-insert-content-workflow",
          },
          {
            title: "Server Insert + Tracked",
            description:
              "Insert content workflow that writes AI changes as tracked changes for review",
            href: "/server-insert-content-workflow-tracked-changes",
          },
          {
            title: "Server Proofreader",
            description:
              "Proofreading workflow with server-side tracked changes output",
            href: "/server-proofreader-workflow",
          },
          {
            title: "Server Proofreader + Tracked + Comments",
            description:
              "Proofreading workflow with tracked changes and AI justification comments",
            href: "/server-proofreader-workflow-tracked-comments",
          },
          {
            title: "Server Edit Workflow",
            description:
              "Prompt-driven document editing via server workflow endpoints",
            href: "/server-edit-workflow",
          },
          {
            title: "Server Edit + Tracked",
            description:
              "Edit workflow that writes AI changes as tracked changes for review",
            href: "/server-edit-workflow-tracked-changes",
          },
          {
            title: "Server Edit + Tracked + Comments",
            description:
              "Edit workflow with tracked changes and linked AI justification comments",
            href: "/server-edit-workflow-tracked-comments",
          },
          {
            title: "Server Comments Workflow",
            description:
              "Thread and comment workflows powered by the server toolkit",
            href: "/server-comments-workflow",
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-14 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
            Tiptap AI Toolkit Demos
          </h1>
          <p className="text-gray-400 text-sm">
            Explore the demos below to see the AI Toolkit in action.
          </p>
        </div>

        <div className="space-y-12">
          {CATEGORIES.map((category) => {
            const colors = COLOR_MAP[category.color];

            return (
              <section key={category.title}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${colors.dot}`}
                  />
                  <h2 className="text-base font-semibold text-gray-900">
                    {category.title}
                  </h2>
                </div>
                <p className="text-sm text-gray-400 mb-5 ml-[18px]">
                  {category.description}
                </p>

                <div className="space-y-5">
                  {category.groups.map((group) => (
                    <div key={group.heading ?? "main"}>
                      {group.heading && (
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2 ml-[18px]">
                          {group.heading}
                        </h3>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                              <span className="block text-[11px] leading-snug text-gray-400 mt-0.5">
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
          <code className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-400">
            OPENAI_API_KEY
          </code>{" "}
          and{" "}
          <code className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-400">
            ANTHROPIC_API_KEY
          </code>{" "}
          environment variables to use these demos.
        </div>
      </div>
    </div>
  );
}
