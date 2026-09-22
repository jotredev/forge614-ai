import { z } from "zod";
import { ALL_SCHEMAS } from "../modules/standard/schemas";

export function generateJsonSchemas(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, schema] of Object.entries(ALL_SCHEMAS)) {
    const json = z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "any" });
    out[`${id}.schema.json`] = `${JSON.stringify({ $id: `https://forge614.dev/schemas/${id}.schema.json`, ...json }, null, 2)}\n`;
  }
  return out;
}
