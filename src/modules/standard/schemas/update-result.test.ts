import { expect, test } from "bun:test";
import { UpdateResultSchema, type UpdateResult } from "./update-result";

const unchanged = { schemaVersion: 2, updated: false, previousVersion: "1.2.0", installedVersion: "1.2.0" } satisfies UpdateResult;
const engines = { node: "engines", updated: true, previousVersion: "1.18.0", installedVersion: "1.19.0" };
const engram = { node: "engram", updated: false, previousVersion: "1.11.0", installedVersion: "1.11.0", pendingVersion: "1.12.0" };

test("accepts unchanged, applied, rollback and deferred own updates", () => {
  for (const result of [
    unchanged,
    { ...unchanged, updated: true, installedVersion: "1.3.0" },
    { ...unchanged, updated: true, installedVersion: "1.1.0" },
    { ...unchanged, pendingVersion: "1.3.0" },
  ]) {
    expect(UpdateResultSchema.parse(result)).toEqual(result);
  }
});

test("keeps dependency updates separate from the result for the invoked node", () => {
  const result = { ...unchanged, dependencies: [engines, engram] };
  expect(UpdateResultSchema.parse(result)).toEqual(result);
  const firstInstall = { ...unchanged, dependencies: [{ ...engines, previousVersion: null }] };
  expect(UpdateResultSchema.parse(firstInstall)).toEqual(firstInstall);
});

test("rejects old layouts, unknown fields, and inconsistent update outcomes", () => {
  for (const result of [
    { schemaVersion: 1, result: { shell: unchanged } },
    { ...unchanged, schemaVersion: 3 },
    { ...unchanged, previousVersion: null },
    { ...unchanged, installedVersion: "v1.2.0" },
    { ...unchanged, extra: true },
    { ...unchanged, updated: true },
    { ...unchanged, installedVersion: "1.3.0" },
    { ...unchanged, pendingVersion: "1.2.0" },
    { ...unchanged, updated: true, installedVersion: "1.3.0", pendingVersion: "1.4.0" },
    { ...unchanged, dependencies: [] },
    { ...unchanged, dependencies: [engines, { ...engines, installedVersion: "1.19.1" }] },
    { ...unchanged, dependencies: [{ ...engines, status: "updated" }] },
    { ...unchanged, dependencies: [{ ...engram, pendingVersion: undefined }] },
  ]) {
    expect(UpdateResultSchema.safeParse(result).success).toBe(false);
  }
});
