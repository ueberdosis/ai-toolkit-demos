# Tiptap AI Toolkit Demos

This is a Next.js project demonstrating the Tiptap AI Toolkit capabilities.

## AI Agents

AI agents allow the AI model to choose from a set of tools to perform tasks. They are more flexible and can be used to perform more complex tasks.

### AI Agent Chatbot
- **AI Agent Chatbot** (`/ai-agent-chatbot`) - A simple AI agent that can read and edit Tiptap documents
- **Chatbot with Tool Streaming** (`/tool-streaming`) - Chat with an AI that can read and edit Tiptap documents using tool streaming

### Review Changes
- **Review Changes** (`/review-changes`) - Preview and approve AI-inserted changes using suggestions
- **Review Changes as Summary** (`/review-changes-as-summary`) - Preview and approve AI-inserted changes using suggestions as a summary

### Advanced AI Agents
- **Multi-document AI Agent** (`/multi-document`) - An AI agent that can read and edit multiple Tiptap documents at once
- **Comments** (`/comments`) - An AI agent that can add and manage comments and threads in a Tiptap document
- **Schema Awareness** (`/schema-awareness`) - An AI agent with schema awareness enabled. It understands custom nodes and marks.
- **Selection Awareness** (`/selection-awareness`) - An AI agent that is aware of the current selection in the editor

## Workflows

Workflows are scenarios where the AI model has a single, well-defined task. Built-in workflows include ready-to-use prompts and methods to execute and apply edits to the Tiptap Editor. Workflows are simpler and faster to implement than AI agent tools.

- **Insert Content** (`/insert-content-workflow`) - A workflow where the AI model has a single, well-defined task to insert content
- **Proofreader** (`/proofreader`) - A workflow for proofreading documents using built-in prompts and methods
- **Tiptap Edit** (`/tiptap-edit-workflow`) - A general-purpose workflow for making small and large edits to Tiptap documents
- **Comments** (`/comments-workflow`) - A workflow for managing comments and threads in Tiptap documents

## Tech Stack

- [React](https://react.dev/) + [Next.js](https://nextjs.org/)
- [AI SDK by Vercel](https://ai-sdk.dev/)
- [OpenAI](https://openai.com/) models
- [Tiptap AI Toolkit](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/overview)

## Setup

1. **Configure .npmrc file**
   Follow the official guide for [installing Tiptap Pro extensions](https://tiptap.dev/docs/guides/pro-extensions).

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add your API keys:
   ```bash
   OPENAI_API_KEY=your-api-key-here
   ANTHROPIC_API_KEY=your-api-key-here
   
   # Upstash Redis for rate limiting (optional but recommended)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
   ```

3. **Run the development server:**
   ```bash
   pnpm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features

### AI Agents

#### AI Agent Chatbot (`/ai-agent-chatbot`)
- Chat with an AI that can read and edit Tiptap documents
- Uses the Vercel AI SDK for streaming responses
- Integrates with Tiptap AI Toolkit for document manipulation

#### Review Changes (`/review-changes`)
- Preview AI-generated changes before applying them
- Accept or reject changes individually or in bulk
- Custom styling for suggestions (red for deletions, green for insertions)
- Halt conversation until user reviews changes

#### Comments (`/comments`)
- An AI agent that can add and manage comments and threads in a Tiptap document

#### Advanced AI Agents
- **Multi-document AI Agent** - Work with multiple documents simultaneously
- **Schema Awareness** - Understands custom nodes and marks in your schema
- **Selection Awareness** - Works with selected text specifically, understanding context around the user's selection

### Workflows

#### Insert Content (`/insert-content-workflow`)
- A workflow where the AI model has a single, well-defined task to insert content
- Uses built-in workflows with ready-to-use prompts and methods
- Executes and applies edits directly to the Tiptap Editor

#### Proofreader (`/proofreader`)
- A workflow for proofreading documents
- Uses built-in prompts and methods for document correction
- Applies edits directly to the Tiptap Editor

#### Tiptap Edit (`/tiptap-edit-workflow`)
- A general-purpose workflow for making small and large edits to Tiptap documents
- Uses built-in workflows with ready-to-use prompts and methods

#### Comments (`/comments-workflow`)
- A workflow for managing comments and threads in Tiptap documents
- Uses built-in workflows with ready-to-use prompts and methods

## Usage

1. Visit the home page to choose between the demos
2. In any demo, you can ask the AI to improve the document
3. In the Review Changes demo, you'll see suggestions highlighted and can accept/reject them
4. The AI will respond and make changes based on your requests
