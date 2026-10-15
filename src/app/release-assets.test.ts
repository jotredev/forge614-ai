import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

/** Run the shared release helper with Node in a temporary node repository. */
async function runReleaseHelper(cwd: string): Promise<{ code: number | null; stderr: string }> {
  const node = Bun.which("node");
  if (!node) throw new Error("Node.js is required for release helper tests");
  const helper = join(process.cwd(), "standard/templates/prepare-release-assets.mjs");
  return await new Promise((resolve, reject) => {
    const child = spawn(node, [helper], {
      cwd,
      env: { ...process.env, HOME: cwd, FORGE614_HOME: join(cwd, ".forge614") },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stderr }));
  });
}

/** Format the exact expected GNU checksum line for fixture bytes. */
function manifestLine(name: string, content: Buffer): string {
  return `${createHash("sha256").update(content).digest("hex")}  ${name}`;
}

test("release helper stages the program and installer set with one GNU SHA256SUMS", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "forge614-release-assets-"));
  try {
    const releaseDir = join(cwd, "dist", "release");
    mkdirSync(releaseDir, { recursive: true });
    const files = new Map<string, Buffer>([
      ["forge614-demo-linux-x64", Buffer.from("program")],
      ["install.sh", Buffer.from("rendered shell gatekeeper\n")],
      ["install.ps1", Buffer.from("rendered powershell gatekeeper\n")],
      ["install.mjs", Buffer.from("shared installer template\n")],
      ["forge614.node.json", Buffer.from(JSON.stringify({ node: "demo", install: { repository: "jotredev/forge614-demo", systems: [{ os: "linux", architectures: ["x64"] }], asset: { pattern: "forge614-demo-<plat>-<arch>" } } }))],
    ]);
    writeFileSync(join(cwd, "install.sh"), files.get("install.sh")!);
    writeFileSync(join(cwd, "install.ps1"), files.get("install.ps1")!);
    writeFileSync(join(cwd, "install.mjs"), files.get("install.mjs")!);
    writeFileSync(join(cwd, "forge614.node.json"), files.get("forge614.node.json")!);
    writeFileSync(join(cwd, "VERSION"), "1.2.0\n");
    writeFileSync(join(releaseDir, "forge614-demo-linux-x64"), files.get("forge614-demo-linux-x64")!);

    const result = await runReleaseHelper(cwd);
    expect(result.code, result.stderr).toBe(0);
    expect(readdirSync(releaseDir).sort()).toEqual([...files.keys()].sort().concat("SHA256SUMS").sort());
    for (const name of ["install.sh", "install.ps1", "install.mjs", "forge614.node.json"]) {
      expect(readFileSync(join(releaseDir, name)).equals(files.get(name)!)).toBe(true);
    }
    const expected = [...files.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, content]) => manifestLine(name, content)).join("\n") + "\n";
    expect(readFileSync(join(releaseDir, "SHA256SUMS"), "utf8")).toBe(expected);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release helper requires a program asset for every declared OS and architecture", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "forge614-release-systems-"));
  try {
    const releaseDir = join(cwd, "dist", "release");
    mkdirSync(releaseDir, { recursive: true });
    writeFileSync(join(cwd, "VERSION"), "1.2.0\n");
    writeFileSync(join(cwd, "forge614.node.json"), JSON.stringify({
      node: "demo",
      install: {
        repository: "jotredev/forge614-demo",
        systems: [{ os: "linux", architectures: ["arm64", "x64"] }, { os: "windows", architectures: ["x64"] }],
        asset: { pattern: "forge614-demo-<plat>-<arch>-<ver>" },
      },
    }));
    writeFileSync(join(cwd, "install.sh"), "#!/bin/sh\n");
    writeFileSync(join(cwd, "install.ps1"), "Write-Output 'installer'\n");
    writeFileSync(join(cwd, "install.mjs"), "process.exit(0);\n");
    for (const name of ["forge614-demo-linux-arm64-1.2.0", "forge614-demo-linux-x64-1.2.0", "forge614-demo-windows-x64-1.2.0"]) {
      writeFileSync(join(releaseDir, name), "program");
    }
    const complete = await runReleaseHelper(cwd);
    expect(complete.code, complete.stderr).toBe(0);

    rmSync(join(releaseDir, "forge614-demo-linux-arm64-1.2.0"));
    const missing = await runReleaseHelper(cwd);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("forge614-demo-linux-arm64-1.2.0");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
