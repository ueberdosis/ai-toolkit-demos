import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { after, test } from "node:test";
import jwt from "jsonwebtoken";
import {
  createWorkspaceSession,
  verifyWorkspaceSession,
  workspaceDocumentName,
} from "../src/lib/clinical-workspace-session.ts";

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
