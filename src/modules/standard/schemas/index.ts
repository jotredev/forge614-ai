import type { z } from "zod";
import { DecisionsIndexSchema } from "./decisions-index";
import { ErrorEnvelopeSchema } from "./error-envelope";
import { ForbiddenMentionsSchema } from "./forbidden-mentions";
import { NdjsonEventSchema } from "./ndjson-event";
import { NodePointerSchema } from "./node-pointer";
import { PackSchema } from "./pack";
import { RuleManifestSchema } from "./rule-manifest";
import { SupportMatrixSchema } from "./support-matrix";

export {
  DecisionsIndexSchema,
  ErrorEnvelopeSchema,
  ForbiddenMentionsSchema,
  NdjsonEventSchema,
  NodePointerSchema,
  PackSchema,
  RuleManifestSchema,
  SupportMatrixSchema,
};
export type { DecisionsIndex } from "./decisions-index";
export type { ErrorEnvelope } from "./error-envelope";
export type { ForbiddenMentions } from "./forbidden-mentions";
export type { NdjsonEvent } from "./ndjson-event";
export type { NodePointer } from "./node-pointer";
export type { Pack } from "./pack";
export type { RuleManifest } from "./rule-manifest";
export type { SupportMatrix } from "./support-matrix";

export const ALL_SCHEMAS: Record<string, z.ZodType> = {
  "node-pointer": NodePointerSchema,
  "rule-manifest": RuleManifestSchema,
  pack: PackSchema,
  "support-matrix": SupportMatrixSchema,
  "error-envelope": ErrorEnvelopeSchema,
  "ndjson-event": NdjsonEventSchema,
  "decisions-index": DecisionsIndexSchema,
  "forbidden-mentions": ForbiddenMentionsSchema,
};
