import { readFile } from "node:fs/promises";
import path from "node:path";

// The Mermaid Renderer loads these into its sandboxed iframe by URL; Next.js has no `?url` import.
// Literal paths, so the build traces exactly these files into the deployment.
const ASSETS = new Map([
  [
    "mermaid.min.js",
    () =>
      readFile(
        path.join(process.cwd(), "node_modules/mermaid/dist/mermaid.min.js"),
      ),
  ],
  [
    "mermaid-renderer.js",
    () =>
      readFile(
        path.join(
          process.cwd(),
          "node_modules/@tiptap-pro/extension-diagrams/dist/mermaid-renderer.js",
        ),
      ),
  ],
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const read = ASSETS.get(file);
  if (!read) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(await read(), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
