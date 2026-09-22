import { validateAgentChecklistImpact } from "./agent-checklist-impact";
import { validateBilingualDocs } from "./bilingual-docs";
import { validateContextBudget } from "./context-budget";
import { validateDecisionRecords } from "./decision-records";
import { validateErrorCodes } from "./error-codes";
import { validateForbiddenMentions } from "./forbidden-mentions";
import { validatePackageNaming } from "./package-naming";
import { validateSupportMatrix } from "./support-matrix";
import type { Validator } from "./types";
import { validateWorkflows } from "./workflows";

export type { Validator, ValidatorOptions } from "./types";

export const VALIDATORS: Record<string, Validator> = {
  "package-naming": validatePackageNaming,
  "forbidden-mentions": validateForbiddenMentions,
  "bilingual-docs": (tree) => validateBilingualDocs(tree),
  "decision-records": validateDecisionRecords,
  "agent-checklist-impact": validateAgentChecklistImpact,
  "error-codes": validateErrorCodes,
  "support-matrix": validateSupportMatrix,
  workflows: (tree, options) => validateWorkflows(tree, options.parseYaml),
  "context-budget": validateContextBudget,
};
