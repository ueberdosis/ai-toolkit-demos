import WebSocket from "ws";

/** How long to wait for the server to accept the connection. */
const HANDSHAKE_TIMEOUT_MS = 10_000;

export type StreamToolResult = {
  /** True when the server applied the edit and sent `completed`. */
  ok: boolean;
  /** The server's error message, when it sent an `error` event. */
  error?: string;
};

export type StreamToolSocket = {
  /**
   * Sends one protocol message (`start`, `delta` or `end`) once the connection is
   * open, in call order. Never blocks: messages are dropped if the connection
   * fails or is already closed.
   */
  send: (message: Record<string, unknown>) => Promise<void>;
  /** Closes the connection, for example when the model fails before `end`. */
  close: () => void;
  /** Resolves when the server closes the connection after its final event. */
  result: Promise<StreamToolResult>;
};

/**
 * Opens a WebSocket connection to the AI server's `stream-tool` endpoint. Each
 * message is one JSON text frame, each event comes back as one frame, and the
 * server closes the connection after `completed` or `error`.
 *
 * @param url - The `stream-tool` endpoint URL (`https:` or `http:`).
 * @param headers - Handshake headers, including `Authorization`.
 * @returns A handle to send messages and await the result.
 */
export function openStreamToolSocket(
  url: string,
  headers: Record<string, string>,
): StreamToolSocket {
  const socket = new WebSocket(url.replace(/^http/, "ws"), {
    headers,
    // Fail instead of waiting forever if the connection is never answered.
    handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
  });

  // Resolves to false when the connection fails, so sending never blocks the model's stream.
  const opened = new Promise<boolean>((resolve) => {
    socket.once("open", () => resolve(true));
    socket.once("close", () => resolve(false));
  });

  const events: { type: string; message?: string }[] = [];
  socket.on("message", (data) => events.push(JSON.parse(data.toString())));
  // A failed connection also closes the socket, so `result` reports it.
  socket.on("error", () => {});

  const result = new Promise<StreamToolResult>((resolve) => {
    socket.once("close", () => {
      const error = events.find((event) => event.type === "error");
      if (error) {
        resolve({ ok: false, error: error.message });
        return;
      }
      resolve({ ok: events.some((event) => event.type === "completed") });
    });
  });

  return {
    send: async (message) => {
      if ((await opened) && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close: () => socket.close(),
    result,
  };
}
