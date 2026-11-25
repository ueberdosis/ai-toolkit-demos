import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { after, test } from "node:test";
import jwt from "jsonwebtoken";
import {
  createWorkspaceSession,
  verifyWorkspaceSession,
  workspaceDocumentName,
} from "../clinical-workspace-session.ts";

// Exercise the demo credential entry points with the project's TS alias.
const { registerHooks } = await import("node:module");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
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

test("session manifests isolate all four documents across demo workspaces", () => {
  const first = createWorkspaceSession();
  const second = createWorkspaceSession();
  assert.equal(verifyWorkspaceSession(first.token).sessionId, first.sessionId);
  assert.notEqual(first.sessionId, second.sessionId);
  for (const id of ["protocol", "consent", "safety", "analysis"]) {
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
    const documentId = workspaceDocumentName(session.sessionId, "protocol");
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
