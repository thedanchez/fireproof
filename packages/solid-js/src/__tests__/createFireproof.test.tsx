import { renderHook } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createFireproof } from "../createFireproof";

describe.skip("HOOK: createFireproof", () => {
  it("can use createDocument / createLiveQuery", async () => {
    const { result } = renderHook(() => createFireproof("testDB"));
    const { database, createDocument, createLiveQuery } = result;
    const [doc, setDoc, saveDoc] = createDocument({ text: "", completed: false });

    // 1. Can initialize a document
    expect(doc()).toEqual({ text: "", completed: false });

    // 2. Can update the document
    setDoc({ text: "hello", completed: true });
    expect(doc()).toEqual({ text: "hello", completed: true });
    expect((await database().allDocs()).rows.length).toBe(0); // nothing stored
    // expect(query().docs.length).toBe(0); // nothing stored

    // 3. Can save the document to the database
    const { id } = await saveDoc();
    expect(await database().get(id)).toEqual({ _id: id, text: "hello", completed: true });
    expect(doc()).toEqual({ _id: id, text: "hello", completed: true });

    // 4. Can locally update the same document (retaining _id info post first save)
    setDoc({ text: "world", completed: false });
    expect(doc()).toEqual({ _id: id, text: "world", completed: false });
    expect(await database().get(id)).toEqual({ _id: id, text: "hello", completed: true });

    // 5. Can update the stored document
    await saveDoc();
    expect(doc()).toEqual({ _id: id, text: "world", completed: false });
    expect(await database().get(id)).toEqual({ _id: id, text: "world", completed: false });

    // 6. Can start anew with another document
    setDoc();
    expect(doc()).toEqual({ text: "", completed: false });

    // 7. Can update the new document
    setDoc({ text: "foo", completed: true });
    expect(doc()).toEqual({ text: "foo", completed: true });

    // 8. Can save the new document
    const { id: id2 } = await saveDoc();
    expect(doc()).toEqual({ _id: id2, text: "foo", completed: true });
    expect(await database().get(id2)).toEqual({ _id: id2, text: "foo", completed: true });

    // const { result: query } = renderHook(() => createLiveQuery((d) => d));
    const query = createLiveQuery((d) => d)
    console.log("QUERY >>>", query());
    expect(query().rows.length).toBe(0);

    // await database().put({ good: true });
    // expect(completedTodos().rows.length).toBe(1);
  });
});
