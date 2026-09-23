import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const vars = { NODE_NAME: "demo", NODE_TITLE: "Demo", REPO: "jotredev/forge614-demo", ASSET_PREFIX: "forge614-demo", STANDARD_VERSION: "1.0.0" };

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
    "install.ps1",
    "install.sh",
  ]);
  for (const [path, content] of Object.entries(files)) expect(placeholdersOf(content), path).toEqual([]);
  expect(files["install.sh"]).toContain('NODE_NAME="demo"');
});

test.skipIf(onWindows)(`rendered install.sh passes bash -n${WINDOWS_REASON}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  writeFileSync(join(dir, "install.sh"), files["install.sh"] ?? "");
  expect(run(["bash", "-n", join(dir, "install.sh")]).exitCode).toBe(0);
});

test.skipIf(onWindows)(`install.sh migrates a flat install and removes the legacy PATH block with a backup${WINDOWS_REASON}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const nodeHome = join(home, ".forge614", "demo");
  mkdirSync(join(nodeHome, "bin"), { recursive: true });
  writeFileSync(join(nodeHome, "bin", "forge614-demo"), "#!/bin/sh\necho legacy\n", { mode: 0o755 });
  writeFileSync(
    join(home, ".zshrc"),
    "export A=1\n# >>> forge614-demo PATH >>>\nexport PATH=\"$HOME/.forge614/demo/bin:$PATH\"\n# <<< forge614-demo PATH <<<\nexport B=2\n",
  );
  const installSh = files["install.sh"] ?? "";
  // Only the migration part is executed: everything up to (not including) the
  // `platform()` function is the shared setup (vars, log/die, arg parsing,
  // the migration functions themselves) with no network calls. It is
  // written to its own bash harness file and run with `bash <file>` (not
  // through process substitution: `source <(...)` silently fails to define
  // functions under the bash 3.2 that macOS ships, so a real file is used
  // for a result that is correct on every bash).
  const platformIdx = installSh.split("\n").findIndex((l) => l.startsWith("platform()"));
  const setupAndMigration = installSh.split("\n").slice(0, platformIdx).join("\n");
  const harness = join(home, "migration-harness.sh");
  writeFileSync(harness, `HOME='${home}'\nFORGE614_HOME='${home}/.forge614'\nexport HOME FORGE614_HOME\n${setupAndMigration}\nmigrate_legacy_install\n`);
  const r = run(["bash", harness]);
  expect(r.exitCode).toBe(0);
  expect(readFileSync(join(home, ".zshrc"), "utf8")).toBe("export A=1\nexport B=2\n");
  expect(readdirSync(home).some((n) => n.startsWith(".zshrc.forge614-backup-"))).toBe(true);
  expect(existsSync(join(nodeHome, "bin", "forge614-demo"))).toBe(false);
  expect(readdirSync(nodeHome).some((n) => n.startsWith("legacy-"))).toBe(true);
});

test.skipIf(onWindows)(`install.sh --uninstall also removes the legacy PATH block a flat install left behind${WINDOWS_REASON}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const home = mkdtempSync(join(tmpdir(), "home-uninstall-"));
  const nodeHome = join(home, ".forge614", "demo");
  mkdirSync(nodeHome, { recursive: true });
  writeFileSync(join(home, ".zshrc"), "export A=1\n# >>> forge614-demo PATH >>>\nexport PATH=\"$HOME/.forge614/demo/bin:$PATH\"\n# <<< forge614-demo PATH <<<\n");
  const installSh = files["install.sh"] ?? "";
  // The uninstall branch sits in the same setup slice (before `platform()`),
  // so the harness is the setup itself and `--uninstall` is passed as a real
  // argument to its argument parser; nothing after the branch runs.
  const platformIdx = installSh.split("\n").findIndex((l) => l.startsWith("platform()"));
  const setup = installSh.split("\n").slice(0, platformIdx).join("\n");
  const harness = join(home, "uninstall-harness.sh");
  writeFileSync(harness, `HOME='${home}'\nFORGE614_HOME='${home}/.forge614'\nexport HOME FORGE614_HOME\n${setup}\n`);
  const r = run(["bash", harness, "--uninstall"]);
  expect(r.exitCode, r.stderr).toBe(0);
  expect(r.stderr).toContain("removed legacy PATH block");
  expect(readFileSync(join(home, ".zshrc"), "utf8")).toBe("export A=1\n");
  expect(existsSync(nodeHome)).toBe(false);
  expect(existsSync(join(home, ".forge614"))).toBe(true);
});

// `pwsh` is not installed in every environment (it is not installed in the
// one these tests were written in); the two tests below are skipped with a
// clear reason in that case, rather than failing or silently doing nothing.
const pwsh = Bun.which("pwsh");
const pwshReason = pwsh === null ? " (skipped: pwsh is not installed in this environment)" : "";

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
});

test.skipIf(pwsh === null)(`install.ps1 removes a legacy PATH block from a fake profile file with a backup${pwshReason}`, () => {
  const files = renderNodeFiles(readTree("standard/templates"), vars);
  const dir = mkdtempSync(join(tmpdir(), "render-ps-migrate-"));
  const installPs1 = files["install.ps1"] ?? "";
  const lines = installPs1.split("\n");
  // Everything before the platform/network-touching part is setup (params,
  // vars, the migration functions themselves); it is extracted into its own
  // harness script and only `Remove-LegacyPathBlock` is invoked directly,
  // against an explicit fake profile path (avoiding any dependency on how
  // `$PROFILE` resolves in the test environment).
  const execIdx = lines.findIndex((l) => l.startsWith("$Arch = if"));
  const setup = lines.slice(0, execIdx).join("\n");
  const fakeProfile = join(dir, "profile.ps1");
  writeFileSync(
    fakeProfile,
    'Set-A\n# >>> forge614-demo PATH >>>\n$env:Path = "x"\n# <<< forge614-demo PATH <<<\nSet-B\n',
  );
  const harness = join(dir, "harness.ps1");
  writeFileSync(harness, `${setup}\nRemove-LegacyPathBlock -ProfilePath '${fakeProfile}'\n`);
  const r = run([requirePwsh(), "-NoProfile", "-File", harness]);
  expect(r.exitCode, r.stderr).toBe(0);
  expect(readFileSync(fakeProfile, "utf8").replace(/\r\n/g, "\n")).toBe("Set-A\nSet-B\n");
  expect(readdirSync(dir).some((n) => n.startsWith("profile.ps1.forge614-backup-"))).toBe(true);
});
