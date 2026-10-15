import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { readTree } from "../infrastructure/fs-tree";
import { run } from "../infrastructure/process";
import { placeholdersOf } from "../modules/standard/template";
import { renderNodeFiles } from "./render-templates";

// `bash` is not available on a default Windows runner: the tests that run
// the rendered install.sh through it are skipped there with a reason.
const onWindows = process.platform === "win32";
const WINDOWS_REASON = onWindows ? " (skipped: bash is not available on Windows)" : "";

const vars = {
  pointer: { node: "demo", install: { repository: "jotredev/forge614-demo" } },
  NODE_TITLE: "Demo",
  STANDARD_VERSION: "1.0.0",
};

test("renders every template with no placeholder left and expected destinations", () => {
  const templates = readTree("standard/templates");
  const files = renderNodeFiles(templates, vars);
  expect(Object.keys(files).sort()).toEqual([
    ".agents/templates/plan.md",
    ".githooks/pre-push",
    ".github/workflows/release.yml",
    ".github/workflows/verify.yml",
    "BRANCH_PROTECTION.en.md",
    "BRANCH_PROTECTION.md",
    "CONTRACT.en.md",
    "CONTRACT.md",
    "README.en.md",
    "README.md",
    "docs/decisions/TEMPLATE.md",
    "docs/en/NN-workflows.md",
    "docs/es/NN-workflows.md",
    "install.mjs",
    "install.ps1",
    "install.sh",
    "scripts/prepare-release-assets.mjs",
  ]);
  for (const [path, content] of Object.entries(files)) expect(placeholdersOf(content), path).toEqual([]);
  expect(files["install.sh"]).toContain('NODE_NAME="demo"');
  expect(files["install.sh"]).toContain('REPO="jotredev/forge614-demo"');
  expect(files["install.ps1"]).toContain('$NodeName = "demo"');
  expect(files["install.ps1"]).toContain('$Repo = "jotredev/forge614-demo"');
  expect(files["install.mjs"]).toBe(readFileSync("standard/templates/install.mjs", "utf8"));
  expect(files["scripts/prepare-release-assets.mjs"]).toBe(readFileSync("standard/templates/prepare-release-assets.mjs", "utf8"));
});

test.skipIf(onWindows)(`rendered install.sh passes bash -n${WINDOWS_REASON}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  writeFileSync(join(dir, "install.sh"), files["install.sh"] ?? "");
  expect(run(["bash", "-n", join(dir, "install.sh")]).exitCode).toBe(0);
});

// `pwsh` is not installed in every environment (it is not installed in the
// one these tests were written in); the two tests below are skipped with a
// clear reason in that case, rather than failing or silently doing nothing.
const pwsh = Bun.which("pwsh");
const pwshReason = pwsh === null ? " (skipped: pwsh is not installed in this environment)" : "";
// pwsh starts cold on CI runners and can take several seconds; bun test
// defaults to 5 s per test, so the two pwsh tests declare their own budget.
const PWSH_TEST_TIMEOUT_MS = 60_000;

function requirePwsh(): string {
  if (pwsh === null) throw new Error("pwsh not installed");
  return pwsh;
}

test.skipIf(pwsh === null)(`rendered install.ps1 passes a PowerShell parser syntax check${pwshReason}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const dir = mkdtempSync(join(tmpdir(), "render-ps-"));
  const script = join(dir, "install.ps1");
  writeFileSync(script, files["install.ps1"] ?? "");
  const cmd = `$errs = $null; [System.Management.Automation.Language.Parser]::ParseFile('${script}', [ref]$null, [ref]$errs) | Out-Null; if ($errs.Count -gt 0) { $errs | ForEach-Object { Write-Error $_ }; exit 1 } else { exit 0 }`;
  const r = run([requirePwsh(), "-NoProfile", "-Command", cmd]);
  expect(r.exitCode, r.stderr).toBe(0);
}, PWSH_TEST_TIMEOUT_MS);

