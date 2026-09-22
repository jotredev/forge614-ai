import { expect, test } from "bun:test";
import { parse } from "yaml";
import { treeFrom } from "../standard/file-tree";
import { validateWorkflows } from "./workflows";

const yml = `name: verify\non:\n  pull_request: {}\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@34e114876b0b11a390a9f2f37d3e4bb0e8a0a8bb\n      - run: bun run verify\n`;
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
