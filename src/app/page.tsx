import Link from "next/link";

// add comments button

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Tiptap AI Toolkit demo
        </h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">AI agent chatbot</h2>
            <p className="text-gray-600 mb-4">
              A simple AI agent that can read and edit Tiptap documents using
              the AI Toolkit and Vercel AI SDK.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
              <Link
                href="/ai-agent-chatbot"
                className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                AI agent chatbot
              </Link>
              <Link
                href="/tool-streaming"
                className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Chatbot with tool streaming
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Review changes</h2>
            <p className="text-gray-600 mb-4">
              Preview and approve AI-inserted changes using suggestions with
              customizable rendering.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
              <Link
                href="/review-changes"
                className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                Review changes
              </Link>
              <Link
                href="/review-changes-as-summary"
                className="inline-block bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Review changes as summary
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Workflows</h2>
            <p className="text-gray-600 mb-4">
              Scenarios where the AI model has a single, well-defined task.
              Built-in workflows include ready-to-use prompts and methods to
              execute and apply edits to the Tiptap Editor.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
              <Link
                href="/insert-content-workflow"
                className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Insert content
              </Link>
              <Link
                href="/proofreader"
                className="inline-block bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors"
              >
                Proofreader
              </Link>
            </div>
          </div>


          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Advanced use cases</h2>
            <p className="text-gray-600 mb-4">
              AI agents that can work with multiple documents simultaneously,
              reading and editing content across different files.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
              <Link
                href="/multi-document"
                className="inline-block bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Multi-document AI Agent
              </Link>
              <Link
                href="/schema-awareness"
                className="inline-block bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors"
              >
                Schema awareness
              </Link>
              <Link
                href="/selection-awareness"
                className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Selection awareness
              </Link>
              <Link
                href="/server-ai-toolkit"
                className="inline-block bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Server AI Toolkit
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">
              Integrations with other extensions
            </h2>
            <p className="text-gray-600 mb-4">
              Integrations with other Tiptap extensions that can be used to
              enhance the AI Toolkit.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
              <Link
                href="/comments"
                className="inline-block bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Comments
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Make sure to set your{" "}
            <code className="bg-gray-200 px-1 rounded">OPENAI_API_KEY</code> and{" "}
            <code className="bg-gray-200 px-1 rounded">ANTHROPIC_API_KEY</code>{" "}
            environment variables to use these demos.
          </p>
        </div>
      </div>
    </div>
  );
}
