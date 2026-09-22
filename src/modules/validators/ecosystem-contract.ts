import { createHash } from "node:crypto";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";

const RULE = "forge614-rule-machine-contracts";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// spec §4.1: FORGE614_ECOSYSTEM_CONTRACT.md is no longer copied by hand; a
// repository references it by pointer instead. A local copy is optional —
// its absence is not a violation — but if one exists, it must be
// byte-identical to the version forge614-ai publishes under standard/.
export function validateEcosystemContract(tree: FileTree, canonical: string): Finding[] {
  const local = read(tree, "FORGE614_ECOSYSTEM_CONTRACT.md");
  if (local === undefined || sha256(local) === sha256(canonical)) return [pass(RULE, "ecosystemContractOk")];
  return [
    fail(RULE, ["FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)"], "ecosystemContractDiverged"),
  ];
}
