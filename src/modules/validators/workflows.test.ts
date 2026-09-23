import { expect, test } from "bun:test";
import { parse } from "yaml";
import { treeFrom } from "../standard/file-tree";
import { validateWorkflows } from "./workflows";

const yml = `name: verify\non:\n  pull_request: {}\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb\n      - run: bun run verify\n`;
const doc = "# 05 — Workflows\n\n## verify.yml\n| Job | Disparador |\n| --- | --- |\n| `verify` | pr |\n";

test("pass when every job is documented; fail on undocumented job, bad yaml and missing doc", () => {
  expect(validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml, "docs/es/05-workflows.md": doc }), parse)[0]?.verdict).toBe("pass");

  const undocumented = validateWorkflows(
    treeFrom({ ".github/workflows/verify.yml": yml.replace("  verify:", "  build:"), "docs/es/05-workflows.md": doc }),
    parse,
  )[0];
  expect(undocumented?.evidence).toEqual(["verify.yml: job 'build' not documented in docs/es/05-workflows.md"]);

  expect(validateWorkflows(treeFrom({ ".github/workflows/x.yml": "jobs: [", "docs/es/05-workflows.md": doc }), parse)[0]?.evidence[0]).toContain(
    "x.yml: YAML parse error",
  );

  expect(validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml }), parse)[0]?.evidence).toEqual([
    "docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)",
  ]);
});

test("a job without timeout-minutes is reported as schema evidence", () => {
  const noTimeout = yml.replace("    timeout-minutes: 10\n", "");
  const findings = validateWorkflows(treeFrom({ ".github/workflows/verify.yml": noTimeout, "docs/es/05-workflows.md": doc }), parse);
  expect(findings[0]?.verdict).toBe("fail");
  expect(findings[0]?.evidence).toHaveLength(1);
  expect(findings[0]?.evidence[0]).toStartWith("verify.yml: schema: jobs.verify.timeout-minutes ");
});

test("valid YAML with a field WorkflowSchema does not know is reported as schema evidence", () => {
  const unknownField = yml.replace("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    container: node:20\n");
  const findings = validateWorkflows(treeFrom({ ".github/workflows/verify.yml": unknownField, "docs/es/05-workflows.md": doc }), parse);
  expect(findings[0]?.verdict).toBe("fail");
  expect(findings[0]?.evidence).toHaveLength(1);
  expect(findings[0]?.evidence[0]).toStartWith("verify.yml: schema: ");
  expect(findings[0]?.evidence[0]).toContain("container");
});

test("no workflows found is a pass", () => {
  expect(validateWorkflows(treeFrom({}), parse)[0]?.verdict).toBe("pass");
  expect(validateWorkflows(treeFrom({}), parse)[0]?.messageKey).toBe("workflowsNone");
});

test("flags a 'bun run <script>' step whose script is not in package.json when package.json is present", () => {
  const pkg = JSON.stringify({ scripts: { verify: "bun run src/interfaces/cli/verify.ts" } });
  const missingScript = yml.replace("bun run verify", "bun run nope");
  const findings = validateWorkflows(
    treeFrom({ ".github/workflows/verify.yml": missingScript, "docs/es/05-workflows.md": doc, "package.json": pkg }),
    parse,
  );
  expect(findings[0]?.evidence).toEqual([
    "verify.yml: job verify step 2: script 'nope' not found in package.json scripts: bun run nope",
  ]);

  const ok = validateWorkflows(treeFrom({ ".github/workflows/verify.yml": yml, "docs/es/05-workflows.md": doc, "package.json": pkg }), parse);
  expect(ok[0]?.verdict).toBe("pass");
});
