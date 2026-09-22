import { z } from "zod";
import { checkWorkflowShape, jobsOf, WorkflowSchema } from "../standard/workflow";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";

const RULE = "forge614-rule-thin-workflows";
const RUN_SCRIPT = /^bun run ([a-z0-9:.-]+)$/;
const PackageJsonScripts = z.object({ scripts: z.record(z.string(), z.string()).optional() }).passthrough();

function documentedJobs(doc: string): Set<string> {
  const jobs = new Set<string>();
  const lines = doc.split("\n");
  lines.forEach((line, i) => {
    if (!/^\|\s*Job\s*\|/i.test(line)) return;
    for (let j = i + 2; j < lines.length && lines[j]?.startsWith("|"); j += 1) {
      const cell = lines[j]?.split("|")[1]?.trim().replace(/`/g, "") ?? "";
      if (cell) jobs.add(cell);
    }
  });
  return jobs;
}

// The check that a `bun run <script>` step names a real package.json script
// only runs when package.json can be read and parsed: a tree that omits it
// (as most unit-test fixtures do) is not evidence of a broken workflow.
function packageScripts(tree: FileTree): Set<string> | undefined {
  const raw = read(tree, "package.json");
  if (raw === undefined) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = PackageJsonScripts.safeParse(data);
  if (!parsed.success) return undefined;
  return new Set(Object.keys(parsed.data.scripts ?? {}));
}

export function validateWorkflows(tree: FileTree, parse: (yaml: string) => unknown): Finding[] {
  const evidence: string[] = [];
  const files = listUnder(tree, ".github/workflows/").filter((p) => /\.ya?ml$/.test(p));
  if (files.length === 0) return [pass(RULE, "workflowsNone")];

  const docPath = listUnder(tree, "docs/es/").find((p) => /docs\/es\/\d{2}-workflows\.md$/.test(p));
  const documented = docPath ? documentedJobs(read(tree, docPath) ?? "") : new Set<string>();
  if (!docPath) evidence.push("docs/es/NN-workflows.md missing (no file matches docs/es/[0-9][0-9]-workflows.md)");

  const scripts = packageScripts(tree);

  for (const path of files) {
    const id = path.slice(".github/workflows/".length);
    let raw: unknown;
    try {
      raw = parse(read(tree, path) ?? "");
    } catch (e) {
      evidence.push(`${id}: YAML parse error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const parsed = WorkflowSchema.safeParse(raw);
    if (!parsed.success) {
      evidence.push(`${id}: schema: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }

    evidence.push(...checkWorkflowShape(parsed.data, id));

    for (const job of jobsOf(parsed.data)) {
      if (docPath && !documented.has(job)) evidence.push(`${id}: job '${job}' not documented in ${docPath}`);
      if (!scripts) continue;
      const def = parsed.data.jobs[job];
      def?.steps.forEach((s, i) => {
        if (!("run" in s)) return;
        const match = RUN_SCRIPT.exec(s.run.trim());
        const script = match?.[1];
        if (script !== undefined && !scripts.has(script)) {
          evidence.push(`${id}: job ${job} step ${i + 1}: script '${script}' not found in package.json scripts: ${s.run.trim()}`);
        }
      });
    }
  }

  return evidence.length === 0 ? [pass(RULE, "workflowsOk")] : [fail(RULE, evidence, "workflowsInvalid")];
}
