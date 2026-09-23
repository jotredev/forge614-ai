export type Locale = "es" | "en";
export type MessageParams = Record<string, string>;
type Msg = (params: MessageParams) => string;

export interface MessageCatalog {
  docsParityOk: Msg;
  docsParityBroken: Msg;
  packageNamesOk: Msg;
  packageNamesInvalid: Msg;
  forbiddenMentionsNone: Msg;
  forbiddenMentionsFound: Msg;
  forbiddenMentionsDataInvalid: Msg;
  decisionRecordsOk: Msg;
  decisionRecordsInvalid: Msg;
  decisionsIndexMissing: Msg;
  agentImpactDeclared: Msg;
  agentImpactMissing: Msg;
  rulesCatalogOk: Msg;
  rulesCatalogInvalid: Msg;
  packsOk: Msg;
  packsInvalid: Msg;
  supportMatrixMissing: Msg;
  supportMatrixInvalid: Msg;
  supportMatrixCurrent: Msg;
  supportMatrixStale: Msg;
  errorCodesOk: Msg;
  errorCodesInvalid: Msg;
  workflowsNone: Msg;
  workflowsOk: Msg;
  workflowsInvalid: Msg;
  ecosystemContractOk: Msg;
  ecosystemContractDiverged: Msg;
  contextBudgetOk: Msg;
  contextBudgetOverBudget: Msg;
  contextBudgetInvalid: Msg;
  dataFileInvalidJson: Msg;
}
export type MessageKey = keyof MessageCatalog;
