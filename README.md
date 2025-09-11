# Tiptap AI Toolkit Demos

This is a Next.js project demonstrating the Tiptap AI Toolkit capabilities with a list of demos:

1. **AI Agent Chatbot** (`/ai-agent-chatbot`) - A simple AI agent that can read and edit Tiptap documents
2. **Review Changes** (`/review-changes`) - Preview and approve AI-inserted changes using suggestions

## Tech Stack

- [React](https://react.dev/) + [Next.js](https://nextjs.org/)
- [AI SDK by Vercel](https://ai-sdk.dev/)
- [OpenAI](https://openai.com/) models
- [Tiptap AI Toolkit](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/overview)

## Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **Python** (version 3.8 or higher) - [Download here](https://python.org/)
- **uv** (Python package manager) - Install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ai-toolkit-demos
   ```

2. **Set up Tiptap Pro access:**
   Follow the official guide for [installing Tiptap Pro extensions](https://tiptap.dev/docs/guides/pro-extensions) to configure your `.npmrc` file.

3. **Install all dependencies:**
   ```bash
   npm run setup
   ```
   This command installs both frontend and backend dependencies.

4. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here

   # Upstash Redis for rate limiting (optional but recommended)
   UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url-here
   UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token-here
   ```

5. **Start the development environment:**
   ```bash
   npm run dev:full
   ```
   This starts both the frontend (http://localhost:3000) and backend (http://localhost:8000) servers.

## Detailed Setup

### Frontend Setup (Next.js)

The frontend is a Next.js application with TypeScript and Tailwind CSS.

```bash
# Install dependencies
npm install

# Development server only
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Backend Setup (Python/FastAPI)

The backend is a FastAPI application that provides AI chat functionality.

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
uv sync

# Or install with development dependencies
uv sync --group dev

# Run backend in development mode
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run backend in production mode
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Environment Variables

Create `.env.local` in the root directory for frontend environment variables:

```bash
OPENAI_API_KEY=your-openai-api-key-here
UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url-here
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token-here
```

For the backend, create `backend/.env`:

```bash
OPENAI_API_KEY=your-openai-api-key-here
UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url-here
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token-here
```

## Available Scripts

```bash
# Full development environment (frontend + backend)
npm run dev:full

# Frontend only
npm run dev

# Backend only (development)
npm run backend:dev

# Backend only (production)
npm run backend:start

# Install all dependencies
npm run setup

# Lint code
npm run lint

# Extract tool definitions
npm run tools:extract
npm run tools:extract:python
```

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

## Tool Definition Management

When TipTap AI Toolkit updates, you can extract the latest tool definitions:

```bash
# View current tool definitions
npm run tools:extract

# Generate Python-ready format for backend
npm run tools:extract:python

# Save to file for easy copying
npm run tools:extract:python > backend/latest-tools.json
```

## Usage

1. Visit the home page to choose between the two demos
2. In either demo, you can ask the AI to improve the document
3. In the Review Changes demo, you'll see suggestions highlighted and can accept/reject them
4. The AI will respond and make changes based on your requests

## Troubleshooting

### Common Issues

**"concurrently: command not found"**
- Run `npm install` to install all dependencies
- If you get authentication errors, run: `npm config set registry https://registry.npmjs.org/`

**"uv: command not found"**
- Install uv with: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Restart your terminal after installation

**Backend connection errors**
- Ensure the backend is running on port 8000
- Check that environment variables are set correctly in `backend/.env`
- Verify OpenAI API key is valid

**Tiptap Pro extensions not loading**
- Follow the [Tiptap Pro setup guide](https://tiptap.dev/docs/guides/pro-extensions)
- Ensure your `.npmrc` file has the correct authentication token

**Port conflicts**
- Frontend runs on port 3000, backend on port 8000
- If ports are in use, modify the port numbers in the respective run scripts

### Development Tips

- Use `npm run dev:full` for the complete development experience
- Check browser developer tools for frontend errors
- Monitor backend logs for API issues
- Use the tool extraction scripts to update AI capabilities: `npm run tools:extract:python`