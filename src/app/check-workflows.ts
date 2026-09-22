import { parse } from "yaml";
import { validateWorkflows } from "../modules/validators/workflows";
import type { FileTree } from "../modules/standard/file-tree";
import type { Finding } from "../modules/standard/finding";

export function checkWorkflows(tree: FileTree): Finding[] {
  return validateWorkflows(tree, parse);
}
