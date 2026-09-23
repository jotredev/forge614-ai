import { expect, test } from "bun:test";
import { z } from "zod";
import { generateJsonSchemas } from "./generate-json-schemas";

// Only the two fields the test asserts on are validated; the rest of the
// generated JSON Schema is left as it is.
const GeneratedSchema = z.object({ $id: z.string(), additionalProperties: z.boolean() }).passthrough();
test("emits one JSON Schema per zod schema with $id", () => {
  const files = generateJsonSchemas();
  expect(Object.keys(files).sort()).toEqual([
    "decisions-index.schema.json",
    "error-envelope.schema.json",
    "forbidden-mentions.schema.json",
    "ndjson-event.schema.json",
    "node-pointer.schema.json",
    "pack.schema.json",
    "rule-manifest.schema.json",
    "support-matrix.schema.json",
  ]);
  const parsed = GeneratedSchema.parse(JSON.parse(files["node-pointer.schema.json"] ?? "{}"));
  expect(parsed.$id).toContain("node-pointer");
  expect(parsed.additionalProperties).toBe(false);
});
