import { ForbiddenMentionsSchema } from "../standard/schemas";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-no-external-product-mentions";
const DATA_FILE = "standard/forbidden-mentions.json";

// Always excluded: the data file itself (it lists the forbidden terms as
// data, not as a mention) and anything under .superpowers/ (planning
// scratch space, not shipped product surface). Additional paths can be
// declared in the data file's own `excludePaths`.
const DEFAULT_EXCLUDES = [DATA_FILE, ".superpowers/"];

function excludePathsFrom(tree: FileTree): string[] {
  const raw = read(tree, DATA_FILE);
  if (raw === undefined) return DEFAULT_EXCLUDES;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = ForbiddenMentionsSchema.safeParse(parsed);
    if (result.success) return [...new Set([...DEFAULT_EXCLUDES, ...result.data.excludePaths])];
  } catch {
    // malformed data file: fall back to the defaults, still excluding it.
  }
  return DEFAULT_EXCLUDES;
}

function isExcluded(path: string, excludePaths: readonly string[]): boolean {
  return excludePaths.some((ex) => (ex.endsWith("/") ? path.startsWith(ex) : path === ex));
}

export function validateForbiddenMentions(tree: FileTree, options: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  const excludePaths = excludePathsFrom(tree);
  const matchers = options.forbiddenMentions.map(
    (term) => [term, new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i")] as const,
  );

  for (const [path, text] of tree.files) {
    if (isExcluded(path, excludePaths)) continue;
    text.split("\n").forEach((line, i) => {
      for (const [term, re] of matchers) if (re.test(line)) evidence.push(`${path}:${i + 1}: ${term}`);
    });
  }

  return evidence.length === 0 ? [pass(RULE, "forbiddenMentionsNone")] : [fail(RULE, evidence, "forbiddenMentionsFound")];
}
