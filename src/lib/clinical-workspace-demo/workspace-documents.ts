import { z } from "zod";

export const clinicalDocumentIdSchema = z.union([
  z.enum(["protocol", "consent", "safety", "analysis"]),
  z.uuid(),
]);

export const workspaceDocumentSchema = z.object({
  id: clinicalDocumentIdSchema,
  title: z.string().trim().min(1).max(120),
  mention: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9]*$/)
    .max(80),
  detail: z.string().max(200),
});

export type WorkspaceDocument = z.infer<typeof workspaceDocumentSchema>;
