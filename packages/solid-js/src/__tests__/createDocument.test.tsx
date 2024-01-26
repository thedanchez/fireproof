import { renderHook } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { createDocument } from "../createDocument";

describe("HOOK: createDocument", () => {
  it("can perform all expected actions", async () => {
    const { result } = renderHook(() => createDocument({ text: "", completed: false }));
    const [doc, setDoc, saveDoc] = result;
    const db = createDocument.database();

    // 1. Can initialize a document
    expect(doc()).toEqual({ text: "", completed: false });

    // 2. Can update the document
    setDoc({ text: "hello", completed: true });
    expect(doc()).toEqual({ text: "hello", completed: true });
    expect((await db.allDocs()).rows.length).toBe(0); // nothing stored

    // 3. Can save the document to the database
    const { id } = await saveDoc();
    expect(await db.get(id)).toEqual({ _id: id, text: "hello", completed: true });
    expect(doc()).toEqual({ _id: id, text: "hello", completed: true });

    // 4. Can locally update the same document (retaining _id info post first save)
    setDoc({ text: "world", completed: false });
    expect(doc()).toEqual({ _id: id, text: "world", completed: false });
    expect(await db.get(id)).toEqual({ _id: id, text: "hello", completed: true });

    // 5. Can update the stored document
    await saveDoc();
    expect(doc()).toEqual({ _id: id, text: "world", completed: false });
    expect(await db.get(id)).toEqual({ _id: id, text: "world", completed: false });

    // 6. Can start anew with another document
    setDoc();
    expect(doc()).toEqual({ text: "", completed: false });

    // 7. Can update the new document
    setDoc({ text: "foo", completed: true });
    expect(doc()).toEqual({ text: "foo", completed: true });

    // 8. Can save the new document
    const { id: id2 } = await saveDoc();
    expect(doc()).toEqual({ _id: id2, text: "foo", completed: true });
    expect(await db.get(id2)).toEqual({ _id: id2, text: "foo", completed: true });
  });
});
