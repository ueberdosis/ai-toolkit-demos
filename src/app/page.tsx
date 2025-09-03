import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Tiptap AI Toolkit Demo
        </h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">AI Agent Chatbot</h2>
            <p className="text-gray-600 mb-4">
              A simple AI agent that can read and edit Tiptap documents using the AI Toolkit and Vercel AI SDK.
            </p>
            <Link 
              href="/ai-agent-chatbot"
              className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try AI Agent Chatbot
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Review Changes</h2>
            <p className="text-gray-600 mb-4">
              Preview and approve AI-inserted changes using suggestions with customizable rendering.
            </p>
            <Link 
              href="/review-changes"
              className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              Try Review Changes
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Make sure to set your <code className="bg-gray-200 px-1 rounded">OPENAI_API_KEY</code> environment variable to use these demos.</p>
        </div>
      </div>
    </div>
  )
}
