import { z } from "zod";
import { SemVer, Slug } from "./common";

const versionOutcome = {
  updated: z.boolean(),
  installedVersion: SemVer,
  pendingVersion: SemVer.optional(),
};

/** A scheduled replacement keeps the currently installed version until it runs. */
function versionsMatchOutcome({ updated, previousVersion, installedVersion, pendingVersion }: {
  updated: boolean;
  previousVersion: string | null;
  installedVersion: string;
  pendingVersion?: string | undefined;
}): boolean {
  return updated === (previousVersion !== installedVersion)
    && (pendingVersion === undefined || (!updated && pendingVersion !== installedVersion));
}

const DependencyUpdateSchema = z.strictObject({
  node: Slug,
  previousVersion: SemVer.nullable(),
  ...versionOutcome,
}).refine(versionsMatchOutcome, "Versions must match the update outcome")
  .refine((result) => result.updated || result.pendingVersion !== undefined, "Report only dependencies that changed or are pending");

export const UpdateResultSchema = z.strictObject({
  schemaVersion: z.literal(2),
  previousVersion: SemVer,
  ...versionOutcome,
  dependencies: z.array(DependencyUpdateSchema).min(1).refine(
    (dependencies) => new Set(dependencies.map(({ node }) => node)).size === dependencies.length,
    "Report each dependency only once",
  ).optional(),
}).refine(versionsMatchOutcome, "Versions must match the update outcome");

export type UpdateResult = z.infer<typeof UpdateResultSchema>;
