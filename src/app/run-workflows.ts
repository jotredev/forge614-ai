import { parse } from "yaml";
import { WorkflowSchema, jobsOf, runStepsOf } from "../modules/standard/workflow";
import { read, type FileTree } from "../modules/standard/file-tree";

type Exec = (cmd: string[]) => { exitCode: number; stdout: string; stderr: string };

export interface WorkflowRunResult {
  schemaVersion: 1;
  workflow: string;
  jobs: Array<{ job: string; steps: Array<{ run: string; exitCode: number }> }>;
  ok: boolean;
}

export function runWorkflow(tree: FileTree, name: string, exec: Exec): WorkflowRunResult {
  const raw = read(tree, `.github/workflows/${name}.yml`);
  if (raw === undefined) throw new Error(`workflow not found: ${name}`);
  const w = WorkflowSchema.parse(parse(raw));

  const jobs: WorkflowRunResult["jobs"] = [];
  let ok = true;
  for (const job of jobsOf(w)) {
    const steps: Array<{ run: string; exitCode: number }> = [];
    for (const run of runStepsOf(w, job)) {
      const r = exec(run.split(/\s+/));
      steps.push({ run, exitCode: r.exitCode });
      if (r.exitCode !== 0) {
        ok = false;
        break;
      }
    }
    jobs.push({ job, steps });
  }

  return { schemaVersion: 1, workflow: name, jobs, ok };
}
