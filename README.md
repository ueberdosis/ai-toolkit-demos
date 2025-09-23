# Tiptap AI Toolkit Demos

This is a Next.js project demonstrating the Tiptap AI Toolkit capabilities with a list of demos:

1. **AI Agent Chatbot** (`/ai-agent-chatbot`) - A simple AI agent that can read and edit Tiptap documents
2. **Review Changes** (`/review-changes`) - Preview and approve AI-inserted changes using suggestions
3. **Review Changes as Summary** (`/review-changes-as-summary`) - Preview and approve AI-inserted changes using suggestions as a summary
4. **Chatbot with Tool Streaming** (`/tool-streaming`) - Chat with an AI that can read and edit Tiptap documents using tool streaming

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
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add your API keys:
   ```bash
   OPENAI_API_KEY=your-api-key-here
   
   # Upstash Redis for rate limiting (optional but recommended)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features

### AI Agent Chatbot (`/ai-agent-chatbot`)
- Chat with an AI that can read and edit Tiptap documents
- Uses the Vercel AI SDK for streaming responses
- Integrates with Tiptap AI Toolkit for document manipulation

### Review Changes (`/review-changes`)
- Preview AI-generated changes before applying them
- Accept or reject changes individually or in bulk
- Custom styling for suggestions (red for deletions, green for insertions)
- Halt conversation until user reviews changes

## Usage

1. Visit the home page to choose between the two demos
2. In either demo, you can ask the AI to improve the document
3. In the Review Changes demo, you'll see suggestions highlighted and can accept/reject them
4. The AI will respond and make changes based on your requests