import { describe, expect, test } from "bun:test";
import { SupportMatrixSchema } from "./support-matrix";
const valid = {
  schemaVersion: 1, nodes: ["engines", "workers"], agents: ["claude-code"],
  cells: [{ node: "engines", agent: "claude-code", status: "supported", verifiedAt: "2026-09-22", verifiedBy: "owner", notes: "" }],
};
describe("support matrix", () => {
  test("valid", () => expect(SupportMatrixSchema.parse(valid).cells).toHaveLength(1));
  test("revalidate requires since date", () => {
    const cell = { node: "engines", agent: "claude-code", status: "revalidate", verifiedAt: "2026-09-22", verifiedBy: "owner", notes: "" };
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [cell] }).success).toBe(false);
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [{ ...cell, revalidateSince: "2026-09-22" }] }).success).toBe(true);
  });
  test("cell must reference declared node and agent", () => {
    expect(SupportMatrixSchema.safeParse({ ...valid, cells: [{ ...valid.cells[0], node: "hub" }] }).success).toBe(false);
  });
});
