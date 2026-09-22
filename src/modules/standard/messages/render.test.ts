import { expect, test } from "bun:test";
import { renderMessage } from "./render";
test("renders the same key in both locales with params", () => {
  expect(renderMessage("supportMatrixStale", { days: "30" }, "es")).toBe("Celdas en revalidación vencidas (más de 30 días).");
  expect(renderMessage("supportMatrixStale", { days: "30" }, "en")).toBe("Stale revalidate cells (older than 30 days).");
  expect(renderMessage("docsParityOk", {}, "en")).toBe("Bilingual documentation with parity.");
});
