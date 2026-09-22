import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateAgentChecklistImpact } from "./agent-checklist-impact";

const opts = { forbiddenMentions: [], today: "2026-09-22" };

const plan = (status: string, impact: string) =>
  `# P\n\n**Date:** 2026-09-22\n**Type:** feature\n**Status:** ${status}\n\n## Impacto en el procedimiento de agentes\n${impact}\n## Result\nok\n`;

test("completed plans need Sí/No with content; in_progress plans are skipped", () => {
  const tree = treeFrom({
    ".agents/plans/2026-09-22--a.md": plan("completed", "No — no cambia capacidades de asistentes."),
    ".agents/plans/2026-09-22--b.md": plan("completed", ""),
    ".agents/plans/2026-09-22--c.md": plan("in_progress", ""),
    ".agents/plans/2026-09-22--d.md": plan(
      "completed",
      "Sí — Engines acepta --readable-dir; agregar validación en la sección de Engines.",
    ),
  });
  const ev = validateAgentChecklistImpact(tree, opts)[0]?.evidence ?? [];
  expect(ev).toEqual([
    ".agents/plans/2026-09-22--b.md: section '## Impacto en el procedimiento de agentes' must start with 'Sí' or 'No' and explain",
  ]);
});

test("passes when there are no plans at all", () => {
  expect(validateAgentChecklistImpact(treeFrom({}), opts)[0]?.verdict).toBe("pass");
});
