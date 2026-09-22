import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeRenderedFiles } from "./write-rendered-files";

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

test("writes every file under outDir and returns the written paths sorted", () => {
  dir = mkdtempSync(join(tmpdir(), "write-rendered-"));
  const written = writeRenderedFiles(dir, {
    "install.sh": "#!/usr/bin/env bash\necho hi\n",
    "CONTRACT.md": "# contract\n",
    ".github/workflows/verify.yml": "name: verify\n",
  });
  expect(written).toEqual([...written].sort());
  expect(written).toEqual([".github/workflows/verify.yml", "CONTRACT.md", "install.sh"]);
  expect(readFileSync(join(dir, "CONTRACT.md"), "utf8")).toBe("# contract\n");
  expect(readFileSync(join(dir, ".github/workflows/verify.yml"), "utf8")).toBe("name: verify\n");
});

test("marks install.sh and .githooks/pre-push executable, leaves other files at default mode", () => {
  dir = mkdtempSync(join(tmpdir(), "write-rendered-"));
  writeRenderedFiles(dir, {
    "install.sh": "#!/usr/bin/env bash\n",
    ".githooks/pre-push": "#!/usr/bin/env bash\n",
    "CONTRACT.md": "# contract\n",
  });
  expect(statSync(join(dir, "install.sh")).mode & 0o777).toBe(0o755);
  expect(statSync(join(dir, ".githooks/pre-push")).mode & 0o777).toBe(0o755);
  expect(statSync(join(dir, "CONTRACT.md")).mode & 0o777).toBe(0o644);
});
