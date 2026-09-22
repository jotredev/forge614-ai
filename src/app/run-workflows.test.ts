import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { treeFrom } from "../modules/standard/file-tree";
import { runWorkflow } from "./run-workflows";

const fixture = readFileSync(resolve(import.meta.dir, "__tests__/fixtures/verify.fixture.yml"), "utf8");

test("runs the run steps of every job in order and stops a job at first failure", () => {
  const calls: string[][] = [];
  const exec = (cmd: string[]) => {
    calls.push(cmd);
    return { exitCode: cmd.join(" ") === "bun run typecheck" ? 1 : 0, stdout: "", stderr: "" };
  };
  const r = runWorkflow(treeFrom({ ".github/workflows/verify.yml": fixture }), "verify", exec);
  expect(calls).toEqual([
    ["bun", "install", "--frozen-lockfile"],
    ["bun", "run", "typecheck"],
  ]);
  expect(r.ok).toBe(false);
  expect(r.jobs[0]?.steps.map((s) => s.exitCode)).toEqual([0, 1]);
});

test("unknown workflow name throws", () => {
  expect(() => runWorkflow(treeFrom({}), "nope", () => ({ exitCode: 0, stdout: "", stderr: "" }))).toThrow("workflow not found: nope");
});
