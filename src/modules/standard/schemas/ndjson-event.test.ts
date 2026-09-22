import { describe, expect, test } from "bun:test";
import { NdjsonEventSchema } from "./ndjson-event";
describe("ndjson event", () => {
  test("valid passthrough of extra payload", () => {
    expect(NdjsonEventSchema.parse({ schemaVersion: 2, event: "task_completed", taskId: "t1" }).event).toBe("task_completed");
  });
  test("event must be snake_case", () => expect(NdjsonEventSchema.safeParse({ schemaVersion: 2, event: "Task-Completed" }).success).toBe(false));
});
