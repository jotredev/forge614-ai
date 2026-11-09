// Launch the Windows deferred-removal PowerShell check; do nothing on other systems.
// It exists so CI and `bun run workflows:run` can call one thin `bun run installer:e2e:windows` step on every system.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  process.stdout.write("installer:e2e:windows skipped: it only runs on Windows\n");
  process.exit(0);
}
const script = join(dirname(fileURLToPath(import.meta.url)), "windows-deferred-removal.e2e.ps1");
const result = spawnSync("pwsh", ["-NoProfile", "-File", script], { stdio: "inherit" });
process.exit(result.status ?? 1);
