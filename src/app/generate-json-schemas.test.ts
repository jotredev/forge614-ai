import { expect, test } from "bun:test";
import { generateJsonSchemas } from "./generate-json-schemas";
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
  const parsed = JSON.parse(files["node-pointer.schema.json"] ?? "{}") as { $id?: string; additionalProperties?: boolean };
  expect(parsed.$id).toContain("node-pointer");
  expect(parsed.additionalProperties).toBe(false);
});
