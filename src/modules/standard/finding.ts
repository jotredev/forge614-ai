import { renderMessage } from "./messages/render";
import type { MessageKey, MessageParams } from "./messages/types";
export type { Locale, MessageKey, MessageParams } from "./messages/types";

export type Verdict = "pass" | "caution" | "fail";

export interface Finding {
  ruleId: string;
  verdict: Verdict;
  evidence: string[];
  messageKey: MessageKey;
  params: MessageParams;
}

export function pass(ruleId: string, key: MessageKey, params: MessageParams = {}): Finding {
  return { ruleId, verdict: "pass", evidence: [], messageKey: key, params };
}

export function fail(ruleId: string, evidence: string[], key: MessageKey, params: MessageParams = {}): Finding {
  return { ruleId, verdict: "fail", evidence, messageKey: key, params };
}

export function renderFinding(f: Finding): { es: string; en: string } {
  return { es: renderMessage(f.messageKey, f.params, "es"), en: renderMessage(f.messageKey, f.params, "en") };
}

export function worst(findings: readonly Finding[]): Verdict {
  if (findings.some((f) => f.verdict === "fail")) return "fail";
  if (findings.some((f) => f.verdict === "caution")) return "caution";
  return "pass";
}
