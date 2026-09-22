import { z } from "zod";
export const NdjsonEventSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    event: z.string().regex(/^[a-z][a-z0-9_]*$/),
  })
  .passthrough();
export type NdjsonEvent = z.infer<typeof NdjsonEventSchema>;
