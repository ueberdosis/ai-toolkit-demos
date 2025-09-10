# AI Toolkit Chat API - Python Backend

This is a FastAPI backend that provides AI chat functionality with document editing capabilities, replicating the TypeScript Next.js implementation.

## Features

- **FastAPI Backend**: RESTful API with async support
- **OpenAI Integration**: GPT-4-mini model with streaming responses
- **Rate Limiting**: Redis-based rate limiting (optional)
- **CORS Support**: Configured for frontend integration
- **Tool Support**: Document editing tools (placeholder for TipTap integration)

## Setup

1. **Install Dependencies**
   ```bash
   # Production dependencies only
   pip install -e .
   
   # Or with development tools (recommended)
   pip install -e .[dev]
   ```

2. **Environment Variables**
   Create a `.env` file in the backend directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   UPSTASH_REDIS_REST_URL=your_redis_url_here  # Optional, for rate limiting
   ```

3. **Run the Backend**
   ```bash
   # Development mode with auto-reload
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Production mode
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   
   # Or using the project scripts (if installed with -e .)
   python -c "import subprocess; subprocess.run(['uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'])"
   ```

## API Endpoints

### POST `/api/chat`
Main chat endpoint that accepts messages and streams AI responses.

**Request Body:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Hello, help me edit this document",
      "parts": []
    }
  ]
}
```

**Response:** Server-Sent Events stream with AI responses

### GET `/`
Health check endpoint

## Architecture

- `main.py`: FastAPI application with endpoints
- `ai_integration.py`: OpenAI integration and tool definitions
- `rate_limit.py`: Rate limiting implementation
- `requirements.txt`: Python dependencies

## Development

The backend is designed to work with the Next.js frontend. To run both together:

```bash
# From the project root
npm run dev:full
```

This will start both the Python backend (port 8000) and Next.js frontend (port 3000).

### Development Tools

If you installed with `pip install -e .[dev]`, you have access to:

```bash
# Code formatting
black .
isort .

# Linting
ruff check .
ruff check --fix .  # Auto-fix issues

# Testing
pytest
```

### Project Structure

```
backend/
├── main.py              # FastAPI application
├── ai_integration.py    # OpenAI integration and tool definitions
├── rate_limit.py        # Redis-based rate limiting
├── pyproject.toml       # Project configuration and dependencies
├── README.md           # This file
└── .env                # Environment variables (create this)
```
