// Local fake release server for the Windows deferred-removal end-to-end script.
// Serves three releases (1.0.0, 1.1.0 and 1.2.0, the last one built to fail its published smoke test) of the fake node "demo" from two prebuilt .exe launchers.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const REPOSITORY = "jotredev/forge614-demo";
const NODE = "demo";
const portFile = process.env.FORGE614_E2E_PORT_FILE;
const executables = { "1.0.0": process.env.FORGE614_E2E_EXE_100, "1.1.0": process.env.FORGE614_E2E_EXE_110, "1.2.0": process.env.FORGE614_E2E_EXE_120 };
if (!portFile || !executables["1.0.0"] || !executables["1.1.0"] || !executables["1.2.0"]) throw new Error("missing FORGE614_E2E_* environment");

/** Return one GNU SHA256SUMS line. */
function sumLine(name, bytes) {
  return `${createHash("sha256").update(bytes).digest("hex")}  ${name}\n`;
}

/** Build the files of one fake release for Windows x64 with a raw .exe launcher. */
function release(version) {
  const asset = `forge614-${NODE}-windows-x64.exe`;
  const executable = readFileSync(executables[version]);
  const pointer = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    node: NODE,
    install: {
      repository: REPOSITORY,
      minimumNodeVersion: "22.19.0",
      systems: [{ os: "windows", architectures: ["x64"] }],
      tagFormat: "vX.Y.Z",
      asset: { type: "raw-binary", pattern: `forge614-${NODE}-<plat>-<arch>.exe`, checksumFile: "SHA256SUMS" },
      dependencies: [],
      path: { modify: false, retireWhen: null },
    },
  }));
  const sums = Buffer.from(sumLine(asset, executable) + sumLine("forge614.node.json", pointer));
  return new Map([[asset, executable], ["forge614.node.json", pointer], ["SHA256SUMS", sums]]);
}

const releases = new Map([["v1.0.0", release("1.0.0")], ["v1.1.0", release("1.1.0")], ["v1.2.0", release("1.2.0")]]);
const server = createServer((request, response) => {
  const parts = (request.url ?? "").split("/");
  const file = decodeURIComponent(parts.at(-1) ?? "");
  const tag = decodeURIComponent(parts.at(-2) ?? "");
  const bytes = parts[2] === "jotredev" ? releases.get(tag)?.get(file) : undefined;
  if (!bytes) {
    response.statusCode = 404;
    response.end("missing");
    return;
  }
  response.end(bytes);
});
server.listen(0, "127.0.0.1", () => writeFileSync(portFile, String(server.address().port)));
