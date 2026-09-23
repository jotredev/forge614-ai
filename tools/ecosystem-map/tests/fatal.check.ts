import { describe, expect, test } from "bun:test";
import { fatalMessage } from "../app/fatal";

describe("fatalMessage", () => {
  test("explains the problem in Spanish and English and keeps the cause", () => {
    const text = fatalMessage(new Error("WebGL context could not be created"));
    expect(text).toContain("No se pudo mostrar la oficina 3D");
    expect(text).toContain("The 3D office could not be displayed");
    expect(text).toContain("WebGL context could not be created");
  });

  test("works when the thrown value is not an Error", () => {
    expect(fatalMessage("boom")).toContain("boom");
  });
});
