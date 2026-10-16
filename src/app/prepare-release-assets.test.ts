import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TEMPLATE = resolve(import.meta.dir, "../../standard/templates/prepare-release-assets.mjs");

function fixture(packageJson: unknown): string {
  const root = mkdtempSync(join(tmpdir(), "prepare-release-assets-"));
  cpSync(TEMPLATE, join(root, "prepare-release-assets.mjs"));
  writeFileSync(join(root, "package.json"), `${JSON.stringify(packageJson)}\n`);
  writeFileSync(join(root, "forge614.node.json"), `${JSON.stringify({
    node: "demo",
    install: {
      repository: "forge614/demo",
      systems: [{ os: "linux", architectures: ["x64"] }],
      asset: { pattern: "forge614-demo-<ver>-<plat>-<arch>.tar.gz" },
    },
  })}\n`);
  writeFileSync(join(root, "install.sh"), "installer\n");
  writeFileSync(join(root, "install.ps1"), "installer\n");
  writeFileSync(join(root, "install.mjs"), "installer\n");
  mkdirSync(join(root, "dist", "release"), { recursive: true });
  writeFileSync(join(root, "dist", "release", "forge614-demo-1.4.0-linux-x64.tar.gz"), "program\n");
  return root;
}

function runPreparation(root: string, refName?: string): { stdout: string; stderr: string } {
  const env = { ...process.env };
  delete env.GITHUB_REF_NAME;
  if (refName !== undefined) env.GITHUB_REF_NAME = refName;
  try {
    const stdout = execFileSync(process.execPath, [join(root, "prepare-release-assets.mjs")], {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "" };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: String(failure.stdout ?? ""), stderr: String(failure.stderr ?? "") };
  }
}

test("prepares a node release from package.json without a root VERSION file", () => {
  const root = fixture({ name: "forge614-demo", version: "1.4.0" });
  try {
    const result = runPreparation(root);
    expect(result.stdout).toContain("Prepared 5 release files");
    expect(existsSync(join(root, "dist", "release", "SHA256SUMS"))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a release tag that differs from package.json version", () => {
  const root = fixture({ name: "forge614-demo", version: "1.4.0" });
  try {
    const result = runPreparation(root, "v1.4.1");
    expect(result.stderr).toContain("v1.4.1");
    expect(result.stderr).toContain("1.4.0");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects package.json without a SemVer version", () => {
  const root = fixture({ name: "forge614-demo" });
  try {
    const result = runPreparation(root);
    expect(result.stderr).toContain("package.json");
    expect(result.stderr).toContain("version");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects package.json that is not an object with a clear version error", () => {
  const root = fixture(null);
  try {
    const result = runPreparation(root);
    expect(result.stderr).toContain("package.json");
    expect(result.stderr).toContain("version");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
