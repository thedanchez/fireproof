import { renderHook } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createLiveQuery } from "../createLiveQuery";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("HOOK: createLiveQuery", () => {
  it("can be used as expected", async () => {
    const { result } = renderHook(() => createLiveQuery((d) => d));
    const db = createLiveQuery.database();

    expect(result()).toEqual({ rows: [], docs: [] });
    console.log('putting')
    const ok = await db.put({ good: true });
    const doc = await db.get(ok.id);
    expect(doc).toEqual({ _id: ok.id, good: true });
    // for this to work, the subscribe needs to call on the next tick
    // lets see if sleep works
    await sleep(100);
    console.log('result')
    console.log(result());
    expect(result().docs.length).toBe(1);
  });
});
