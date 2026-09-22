import { validateAgentChecklistImpact } from "./agent-checklist-impact";
import { validateBilingualDocs } from "./bilingual-docs";
import { validateDecisionRecords } from "./decision-records";
import { validateErrorCodes } from "./error-codes";
import { validateForbiddenMentions } from "./forbidden-mentions";
import { validatePackageNaming } from "./package-naming";
import type { Validator } from "./types";

export type { Validator, ValidatorOptions } from "./types";

export const VALIDATORS: Record<string, Validator> = {
  "package-naming": validatePackageNaming,
  "forbidden-mentions": validateForbiddenMentions,
  "bilingual-docs": (tree) => validateBilingualDocs(tree),
  "decision-records": validateDecisionRecords,
  "agent-checklist-impact": validateAgentChecklistImpact,
  "error-codes": validateErrorCodes,
};
