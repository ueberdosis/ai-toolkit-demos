/**
 * Content Protection Policy of the demo. The developer sets it on the server: the AI can't
 * change it. Paragraphs with `protection="locked"` are read-only for the AI, and paragraphs
 * with `protection="hidden"` are hidden from it.
 */
export const contentProtectionPolicy = {
  version: 1,
  rules: [
    {
      id: "locked-clauses",
      selector: {
        target: "node",
        node: {
          types: ["paragraph"],
          attributes: [{ name: "protection", operator: "eq", value: "locked" }],
        },
      },
      permissions: { edit: false },
      reason: "Approved legal text can't be changed.",
    },
    {
      id: "internal-notes",
      selector: {
        target: "node",
        node: {
          types: ["paragraph"],
          attributes: [{ name: "protection", operator: "eq", value: "hidden" }],
        },
      },
      permissions: { read: false },
      reason: "Internal notes are confidential.",
    },
  ],
};
