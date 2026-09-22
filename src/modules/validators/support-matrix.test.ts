import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateSupportMatrix } from "./support-matrix";
import type { ValidatorOptions } from "./types";

const opts = (today: string): ValidatorOptions => ({ forbiddenMentions: [], parseYaml: () => ({}), today });

const m = (cells: unknown[]) => JSON.stringify({ schemaVersion: 1, nodes: ["engines"], agents: ["codex"], cells });

test("fails on stale revalidate and invalid schema", () => {
  const stale = treeFrom({
    "standard/support-matrix.json": m([
      {
        node: "engines",
        agent: "codex",
        status: "revalidate",
        revalidateSince: "2026-07-01",
        reason: "hook con startup-context unbound",
        verifiedAt: "2026-06-01",
        verifiedBy: "o",
        notes: "",
      },
    ]),
  });
  expect(validateSupportMatrix(stale, opts("2026-09-22"))[0]?.evidence).toEqual([
    "engines/codex: in revalidate since 2026-07-01 (> 30 days)",
  ]);

  const fresh = treeFrom({
    "standard/support-matrix.json": m([
      { node: "engines", agent: "codex", status: "supported", verifiedAt: "2026-09-22", verifiedBy: "o", notes: "" },
    ]),
  });
  expect(validateSupportMatrix(fresh, opts("2026-09-22"))[0]?.verdict).toBe("pass");

  expect(validateSupportMatrix(treeFrom({ "standard/support-matrix.json": "{}" }), opts("2026-09-22"))[0]?.verdict).toBe("fail");
});

test("fails when standard/support-matrix.json is missing", () => {
  const f = validateSupportMatrix(treeFrom({}), opts("2026-09-22"))[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.messageKey).toBe("supportMatrixMissing");
});

test("a revalidate cell exactly 30 days old is not yet stale", () => {
  const tree = treeFrom({
    "standard/support-matrix.json": m([
      {
        node: "engines",
        agent: "codex",
        status: "revalidate",
        revalidateSince: "2026-08-23",
        reason: "hook con startup-context unbound",
        verifiedAt: "2026-08-23",
        verifiedBy: "o",
        notes: "",
      },
    ]),
  });
  expect(validateSupportMatrix(tree, opts("2026-09-22"))[0]?.verdict).toBe("pass");
});
