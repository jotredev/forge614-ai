import { expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { checkWorkflows } from "./check-workflows";

test("passes with 'no workflows' when the tree has none", () => {
  const findings = checkWorkflows(treeFrom({}));
  expect(findings[0]?.verdict).toBe("pass");
  expect(findings[0]?.messageKey).toBe("workflowsNone");
});

test("uses the real yaml parser to surface a parse error", () => {
  const findings = checkWorkflows(treeFrom({ ".github/workflows/x.yml": "jobs: [" }));
  expect(findings[0]?.verdict).toBe("fail");
  expect(findings[0]?.evidence.some((e) => e.includes("x.yml: YAML parse error"))).toBe(true);
});
