import { parse } from "yaml";
import { read, type FileTree } from "../modules/standard/file-tree";
import { fail, renderFinding, worst, type Finding, type Verdict } from "../modules/standard/finding";
import { ForbiddenMentionsSchema } from "../modules/standard/schemas";
import { VALIDATORS } from "../modules/validators";
import { validatePacksCatalog } from "../modules/validators/packs-catalog";
import { validateRulesCatalog } from "../modules/validators/rules-catalog";

const FORBIDDEN_MENTIONS_RULE = "forge614-rule-no-external-product-mentions";

export interface ReportedFinding extends Finding {
  message: { es: string; en: string };
}

export interface VerifyReport {
  schemaVersion: 1;
  standard: string;
  verdict: Verdict;
  checks: ReportedFinding[];
}

export interface RunValidatorsOptions {
  standardVersion: string;
  today: string;
}

// standard/forbidden-mentions.json is data, not a validator input the caller
// is expected to already have parsed: every validator run needs the same
// term list, so it is read from the tree once, here. A missing file yields
// no terms (nothing to enforce, no finding); a malformed one yields no terms
// AND a fail finding, so a broken data file cannot silently disable the
// no-external-product-mentions check.
function forbiddenTermsFrom(tree: FileTree): { terms: string[]; findings: Finding[] } {
  const raw = read(tree, "standard/forbidden-mentions.json");
  if (raw === undefined) return { terms: [], findings: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { terms: [], findings: [fail(FORBIDDEN_MENTIONS_RULE, [`standard/forbidden-mentions.json: invalid JSON: ${message}`], "forbiddenMentionsDataInvalid")] };
  }

  const result = ForbiddenMentionsSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    return { terms: [], findings: [fail(FORBIDDEN_MENTIONS_RULE, issues, "forbiddenMentionsDataInvalid")] };
  }

  return { terms: result.data.terms, findings: [] };
}

export function runValidators(tree: FileTree, options: RunValidatorsOptions): VerifyReport {
  const { terms, findings: forbiddenMentionsFindings } = forbiddenTermsFrom(tree);
  const validatorOptions = {
    forbiddenMentions: terms,
    parseYaml: parse,
    today: options.today,
  };

  const findings: Finding[] = [...forbiddenMentionsFindings];
  for (const validator of Object.values(VALIDATORS)) findings.push(...validator(tree, validatorOptions));
  findings.push(...validateRulesCatalog(tree));
  findings.push(...validatePacksCatalog(tree));

  const checks: ReportedFinding[] = findings.map((finding) => ({ ...finding, message: renderFinding(finding) }));

  return { schemaVersion: 1, standard: options.standardVersion, verdict: worst(findings), checks };
}
