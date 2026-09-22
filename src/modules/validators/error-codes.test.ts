import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateErrorCodes } from "./error-codes";

const opts = { forbiddenMentions: [], today: "2026-09-22" };

test("accepts canonical codes in CONTRACT.md and source, rejects kebab-case or lowercase", () => {
  const ok = treeFrom({
    "CONTRACT.md":
      "## Códigos de error\n| Código | Significado |\n| --- | --- |\n| `INVALID_ARGUMENTS` | Entrada inválida |\n| `SCHEMA_UNSUPPORTED` | Versión desconocida |\n",
    "src/interfaces/cli/output.ts": 'printError("INVALID_ARGUMENTS", "x"); printError("SCHEMA_UNSUPPORTED", "y");',
  });
  expect(validateErrorCodes(ok, opts)[0]?.verdict).toBe("pass");

  const bad = treeFrom({
    "CONTRACT.md": "## Códigos de error\n| Código | Significado |\n| --- | --- |\n| `engines-outdated` | x |\n",
    "src/app/x.ts": 'printError("engines-outdated", "x"); printError("Bad_Code", "y");',
  });
  const f = validateErrorCodes(bad, opts)[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual(["CONTRACT.md: engines-outdated", "src/app/x.ts:1: engines-outdated", "src/app/x.ts:1: Bad_Code"]);
});

test("passes when the repo has no CONTRACT.md and no printError calls", () => {
  expect(validateErrorCodes(treeFrom({ "README.md": "" }), opts)[0]?.verdict).toBe("pass");
});

test("ignores test files under src/", () => {
  const tree = treeFrom({ "src/app/x.test.ts": 'printError("bad-code", "x");' });
  expect(validateErrorCodes(tree, opts)[0]?.verdict).toBe("pass");
});
