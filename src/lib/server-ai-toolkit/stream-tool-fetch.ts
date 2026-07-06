import { type ClientHttp2Stream, connect } from "node:http2";

/**
 * Response shape the `/stream-tool` routes consume: they read `ok`/`status` and
 * the full body via `text()`.
 */
export type StreamToolResponse = {
  ok: boolean;
  status: number;
  /** Resolves the full NDJSON response body once the upstream stream ends. */
  text: () => Promise<string>;
};

/**
 * Fetch-like init for the streaming bridge. `body` is the NDJSON request stream;
 * `duplex: "half"` is required by the plain-HTTP fallback so the body streams
 * while the response is read.
 */
type StreamToolInit = {
  method?: string;
  headers?: HeadersInit;
  body: ReadableStream<Uint8Array>;
  duplex?: "half";
};

/**
 * Streams a Web `ReadableStream` request body into an HTTP/2 request stream and
 * ends the request when the body closes. Runs concurrently with reading the
 * response, which is what keeps the exchange full-duplex. Destroys the request
 * on a read error rather than leaving it half-open.
 */
async function pumpRequestBody(
  body: ReadableStream<Uint8Array>,
  req: ClientHttp2Stream,
): Promise<void> {
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      req.write(Buffer.from(value));
    }
    req.end();
  } catch (err) {
    req.destroy(err as Error);
  }
}

/**
 * Issues the `/stream-tool` POST over HTTP/2 with Node's stable `node:http2`
 * client. The request body streams in while the response is collected, so the
 * exchange stays full-duplex and a reverse proxy cannot truncate the upload.
 * Verifies the server's TLS certificate (default), so it is safe against
 * public HTTPS endpoints.
 */
function requestOverH2(
  url: string,
  init: StreamToolInit,
): Promise<StreamToolResponse> {
  const target = new URL(url);
  const session = connect(target.origin);

  const h2Headers: Record<string, string> = {
    ":method": (init.method ?? "POST").toUpperCase(),
    ":path": `${target.pathname}${target.search}`,
  };
  // HTTP/2 requires lowercase header names; `Headers` normalizes any HeadersInit.
  new Headers(init.headers).forEach((value, key) => {
    h2Headers[key] = value;
  });

  const req = session.request(h2Headers, { endStream: false });
  req.setEncoding("utf8");

  // Collect the response as it arrives so no frame is lost between the `response`
  // event and the route calling `text()`. Resolve-only (never rejects) so an
  // unread body on a failed request cannot raise an unhandled rejection; a
  // stream error is surfaced through `text()` instead.
  let responseBody = "";
  let streamError: Error | null = null;
  const bodyEnded = new Promise<void>((resolve) => {
    req.on("data", (chunk: string) => {
      responseBody += chunk;
    });
    req.on("end", () => resolve());
    req.on("error", (err: Error) => {
      streamError = err;
      resolve();
    });
  });

  void pumpRequestBody(init.body, req);

  return new Promise<StreamToolResponse>((resolve, reject) => {
    const fail = (err: Error) => {
      session.close();
      reject(err);
    };
    req.on("response", (headers) => {
      const status = Number(headers[":status"]);
      resolve({
        ok: status >= 200 && status < 300,
        status,
        text: async () => {
          await bodyEnded;
          session.close();
          if (streamError) throw streamError;
          return responseBody;
        },
      });
    });
    req.on("error", fail);
    session.on("error", fail);
  });
}

/**
 * `fetch`-shaped client for the `/stream-tool` bridge, forced over HTTP/2 on
 * HTTPS endpoints.
 *
 * `/stream-tool` streams the request body (the LLM's tool-call deltas) while the
 * AI server streams the response back, full-duplex over one connection. Over
 * HTTP/1.1 a reverse proxy (Traefik, and Go's `net/http` in general) drains the
 * request body once the response starts, truncating the upload before the final
 * message arrives. HTTP/2 carries the request and response as independent
 * streams, so the duplex survives the proxy.
 *
 * HTTPS targets go over HTTP/2 via the stable `node:http2` client — no extra
 * dependency and no experimental flag. Plain-HTTP targets (local dev, no proxy
 * in the path) fall back to the built-in `fetch`, where HTTP/1.1 duplex is
 * already safe.
 *
 * Use this only for `/stream-tool`; other toolkit calls are plain
 * request/response and can use the default `fetch`.
 *
 * @param url - The `/stream-tool` endpoint URL.
 * @param init - Fetch init with the streaming `body` and `duplex: "half"`.
 * @returns The upstream response, exposing `ok`, `status`, and `text()`.
 */
export async function streamToolFetch(
  url: string,
  init: StreamToolInit,
): Promise<StreamToolResponse> {
  const target = new URL(url);
  if (target.protocol !== "https:") {
    const res = await fetch(url, init as RequestInit);
    return { ok: res.ok, status: res.status, text: () => res.text() };
  }
  return requestOverH2(url, init);
}
