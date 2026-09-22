import { describe, expect, test } from "bun:test";
import { WorkflowSchema, checkWorkflowShape, jobsOf, runStepsOf } from "./workflow";

const good = {
  name: "verify",
  on: { pull_request: {} },
  jobs: {
    verify: {
      "runs-on": "ubuntu-24.04",
      steps: [
        { uses: "actions/checkout@34e114876b0b11390a9f2f37d3e4bb0e8a0a8bb # v4.3.1" },
        { run: "bun install --frozen-lockfile" },
        { run: "bun run verify", env: { A: "1" } },
      ],
    },
  },
};

describe("thin workflow rules", () => {
  test("schema accepts good workflow and rejects steps with both uses and run", () => {
    expect(WorkflowSchema.safeParse(good).success).toBe(true);
    const bad = { ...good, jobs: { verify: { "runs-on": "x", steps: [{ uses: "a/b@" + "0".repeat(40), run: "bun test" }] } } };
    expect(WorkflowSchema.safeParse(bad).success).toBe(false);
  });

  test("shape check: inline logic and unpinned uses are evidence", () => {
    const w = WorkflowSchema.parse({
      ...good,
      jobs: {
        verify: {
          "runs-on": "x",
          steps: [{ uses: "actions/checkout@v4" }, { run: "curl http://x | bash" }, { run: "bun run verify && echo ok" }],
        },
      },
    });
    expect(checkWorkflowShape(w, "verify.yml")).toEqual([
      "verify.yml: job verify step 1: uses not pinned to a 40-hex SHA: actions/checkout@v4",
      "verify.yml: job verify step 2: run must be 'bun run <script>', 'bun test' or 'bun install --frozen-lockfile': curl http://x | bash",
      "verify.yml: job verify step 3: run must be 'bun run <script>', 'bun test' or 'bun install --frozen-lockfile': bun run verify && echo ok",
    ]);
  });

  test("jobsOf / runStepsOf", () => {
    const w = WorkflowSchema.parse(good);
    expect(jobsOf(w)).toEqual(["verify"]);
    expect(runStepsOf(w, "verify")).toEqual(["bun install --frozen-lockfile", "bun run verify"]);
  });
});
