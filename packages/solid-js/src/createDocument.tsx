import { Database, Doc, DocRecord } from "@fireproof/core";
import { Accessor } from "solid-js";

import { CreateDocument, CreateDocumentResult, createFireproof } from "./createFireproof";

export type TLCreateDocument = {
  <T extends DocRecord<T>>(initialDoc: Doc<T>): CreateDocumentResult<T>;
  database: Accessor<Database>;
};

function topLevelCreateDocument(...args: Parameters<CreateDocument>) {
  const { createDocument, database } = createFireproof();
  (topLevelCreateDocument as TLCreateDocument).database = database;
  return createDocument(...args);
}

/**
 * ## Summary
 *
 * Creates a new Fireproof document. You are also given `set`/`save` handlers that you use to update the document
 * and store the document to the database. The creation occurs when you do not pass in an `_id` as part of your
 * initial document -- the database will assign a new one when you call the provided `save` handler This uses
 * the default database named `FireproofDB` under the hood which you can also access via the `database` accessor.
 *
 * ## Usage
 *
 * ```tsx
 * const [todo, setTodo, saveTodo] = createDocument({
 *   text: '',
 *   date: Date.now(),
 *   completed: false
 * })
 *
 * const [doc, setDoc, saveDoc] = createDocument({
 *   _id: `${props.customerId}-profile`, // you can imagine `customerId` as a prop passed in
 *   name: "",
 *   company: "",
 *   startedAt: Date.now()
 * })
 *
 * const database = createDocument.database; // underlying "FireproofDB" database accessor
 * ```
 *
 * ## Overview
 * Changes made via remote sync peers, or other members of your cloud replica group will appear automatically
 * when you use the `createLiveQuery` and `createDocument` APIs. By default, Fireproof stores data in the browser's
 * local storage.
 */
export const createDocument = topLevelCreateDocument as TLCreateDocument;
