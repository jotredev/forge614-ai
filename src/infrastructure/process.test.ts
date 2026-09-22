import { expect, test } from "bun:test";
import { run } from "./process";

test("run captures stdout and exit code", () => {
  const r = run(["bash", "-c", "printf hi; exit 3"]);
  expect(r.stdout).toBe("hi");
  expect(r.exitCode).toBe(3);
});

test("run captures stderr", () => {
  const r = run(["bash", "-c", "printf err >&2; exit 0"]);
  expect(r.stderr).toBe("err");
  expect(r.exitCode).toBe(0);
});

test("run forwards stdin when provided", () => {
  const r = run(["bash", "-c", "cat"], { stdin: "from-stdin" });
  expect(r.stdout).toBe("from-stdin");
  expect(r.exitCode).toBe(0);
});
