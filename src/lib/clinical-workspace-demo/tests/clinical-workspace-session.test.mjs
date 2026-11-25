import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import jwt from "jsonwebtoken";


// Exercise the demo credential entry points with the project's TS alias.
const { registerHooks } = await import("node:module");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { createWorkspaceSession, verifyWorkspaceSession, workspaceDocumentName } = await import("../clinical-workspace-session.ts");
const { getTiptapCloudAiJwtToken } = await import("../server-ai-toolkit/get-tiptap-cloud-ai-jwt-token.ts");
const collabSigners = [await import("../collaboration.ts")];

const originalKey = process.env.TIPTAP_AUTH_PRIVATE_KEY;
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const key = privateKey.export({ type: "pkcs8", format: "pem" });
process.env.TIPTAP_AUTH_PRIVATE_KEY = key;
after(() => {
  if (originalKey === undefined) delete process.env.TIPTAP_AUTH_PRIVATE_KEY;
  else process.env.TIPTAP_AUTH_PRIVATE_KEY = originalKey;
});

test("session manifests isolate seeded and generated documents across demo workspaces", () => {
  const first = createWorkspaceSession();
  const second = createWorkspaceSession();
  assert.equal(verifyWorkspaceSession(first.token).sessionId, first.sessionId);
  assert.notEqual(first.sessionId, second.sessionId);
  for (const id of ["protocol", "consent", "safety", "analysis", randomUUID()]) {
    assert.equal(workspaceDocumentName(first.sessionId, id), `clinical-workspace/${first.sessionId}/${id}`);
    assert.notEqual(workspaceDocumentName(first.sessionId, id), workspaceDocumentName(second.sessionId, id));
  }
});

test("reject unsigned, tampered, expired and wrong-audience manifests", () => {
  const session = createWorkspaceSession();
  const [header, payload, signature] = session.token.split(".");
  const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), sessionId: createWorkspaceSession().sessionId })).toString("base64url");
  assert.throws(() => verifyWorkspaceSession(`${header}.${changed}.${signature}`));
  assert.throws(() => verifyWorkspaceSession(jwt.sign({ sessionId: session.sessionId }, "", { algorithm: "none" })));
  assert.throws(() => verifyWorkspaceSession(jwt.sign({ sessionId: session.sessionId }, key, { algorithm: "ES256", audience: "clinical-workspace", expiresIn: -1 })));
  assert.throws(() => verifyWorkspaceSession(jwt.sign({ sessionId: session.sessionId }, key, { algorithm: "ES256", audience: "other" })));
});

test("reject arbitrary cloud document names and invalid session paths", () => {
  const { sessionId } = createWorkspaceSession();
  for (const id of ["unknown", "../protocol", "clinical-workspace/other/protocol", ""]) {
    assert.throws(() => workspaceDocumentName(sessionId, id));
  }
  assert.throws(() => workspaceDocumentName("../../other-session", "protocol"));
});

test("every credential entry point protects clinical names and wildcard access", async () => {
  const savedEnvironment = process.env.TIPTAP_AUTH_ENVIRONMENT_ID;
  const savedServer = process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID;
  process.env.TIPTAP_AUTH_ENVIRONMENT_ID = "test-environment";
  process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID = "test-server";
  try {
    const session = createWorkspaceSession();
    const other = createWorkspaceSession();
    const documentId = workspaceDocumentName(session.sessionId, randomUUID());
    for (const { getCollabConfig } of collabSigners) {
      await assert.rejects(getCollabConfig("user", documentId));
      await assert.rejects(getCollabConfig("user", documentId, other.token));
      await assert.rejects(getCollabConfig("user", "*"));
      const { token } = await getCollabConfig("user", documentId, session.token);
      assert.deepEqual(jwt.decode(token).permissions, [{ action: "Documents:Write", resource: documentId }]);
      await getCollabConfig("user", "server-demo/existing-document");
    }
    assert.throws(() => getTiptapCloudAiJwtToken({ documentId }));
    assert.throws(() => getTiptapCloudAiJwtToken({ documentId, workspaceToken: other.token }));
    assert.throws(() => getTiptapCloudAiJwtToken({ documentId: "*" }));
    const token = getTiptapCloudAiJwtToken({ documentId, workspaceToken: session.token });
    assert.ok(jwt.decode(token).permissions.some(p => p.action === "Documents:Write" && p.resource === documentId));
    getTiptapCloudAiJwtToken({ documentId: "server-demo/existing-document" });
  } finally {
    if (savedEnvironment === undefined) delete process.env.TIPTAP_AUTH_ENVIRONMENT_ID;
    else process.env.TIPTAP_AUTH_ENVIRONMENT_ID = savedEnvironment;
    if (savedServer === undefined) delete process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID;
    else process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID = savedServer;
  }
});

const { createWorkspaceDocument } = await import("../create-workspace-document.ts");

test("creation wraps the Toolkit with a fresh document, tracked review and scoped credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = process.env.TIPTAP_AUTH_ENVIRONMENT_ID;
  process.env.TIPTAP_AUTH_ENVIRONMENT_ID = "test-environment";
  const session = createWorkspaceSession();
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push({ body: JSON.parse(options.body), token: jwt.decode(options.headers.Authorization.slice(7)) });
    return Response.json({ tool: { output: { success: true } }, docChanged: true });
  };
  try {
    const input = { content: [{ type: "paragraph", content: [{ type: "text", text: "Visit guide" }] }] };
    const context = { schema: { nodes: {} } };
    const options = { title: "Visit guide", mention: "VisitGuide", input, editorContext: context, workspaceToken: session.token, sessionId: session.sessionId };
    const first = await createWorkspaceDocument(options);
    const second = await createWorkspaceDocument(options);
    assert.notEqual(first.document.id, second.document.id);
    assert.equal(first.document.mention, "VisitGuide");
    const { body, token } = requests[0];
    assert.equal(body.tool.name, "createDocument");
    assert.deepEqual(body.tool.input, input);
    assert.deepEqual(body.editorContext, context);
    assert.deepEqual(body.reviewOptions, { mode: "trackedChanges" });
    assert.equal(body.document.id, workspaceDocumentName(session.sessionId, first.document.id));
    assert.ok(token.permissions.some(p => p.action === "Documents:Write" && p.resource === body.document.id));

    globalThis.fetch = async () => Response.json({ tool: { output: { success: false, error: "Invalid content" } }, docChanged: false });
    const failed = await createWorkspaceDocument(options);
    assert.equal(failed.document, undefined, "failed drafts are not advertised to the workspace");
    assert.equal(failed.result.error, "Invalid content");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvironment === undefined) delete process.env.TIPTAP_AUTH_ENVIRONMENT_ID;
    else process.env.TIPTAP_AUTH_ENVIRONMENT_ID = originalEnvironment;
  }
});
