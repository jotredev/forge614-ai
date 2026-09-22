import { z } from "zod";

const LowercaseTerm = z.string().min(1).regex(/^[^A-Z]*$/, "must be lowercase");

export const ForbiddenMentionsSchema = z
  .object({
    schemaVersion: z.literal(1),
    terms: z.array(LowercaseTerm).min(1),
    excludePaths: z.array(z.string()),
  })
  .strict();

export type ForbiddenMentions = z.infer<typeof ForbiddenMentionsSchema>;
