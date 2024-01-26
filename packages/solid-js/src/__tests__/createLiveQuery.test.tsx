import { renderHook } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createLiveQuery } from "../createLiveQuery";

describe("HOOK: createLiveQuery", () => {
  it("can be used as expected", async () => {
    const { result } = renderHook(() => createLiveQuery((d) => d));
    const db = createLiveQuery.database();

    expect(result()).toEqual({ rows: [], docs: [] });
    await db.put({ good: true });
    expect(result().docs.length).toBe(1);
  });
});
