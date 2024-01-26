import { Database, DocRecord } from "@fireproof/core";
import { Accessor } from "solid-js";

import { createFireproof, type CreateLiveQuery, LiveQueryResult } from "./createFireproof";

export type TLCreateLiveQuery = {
  <T extends DocRecord<T>>(...args: Parameters<CreateLiveQuery>): Accessor<LiveQueryResult<T>>;
  database: Accessor<Database>;
};

function topLevelCreateLiveQuery(...args: Parameters<CreateLiveQuery>) {
  const { createLiveQuery, database } = createFireproof();
  (topLevelCreateLiveQuery as TLCreateLiveQuery).database = database;
  return createLiveQuery(...args);
}

/**
 * ## Summary
 * Access live query results, enabling real-time updates in your app. This uses the default database
 * named "FireproofDB" under the hood which you can also access via the `database` accessor.
 *
 * ## Usage
 * ```tsx
 * const results = createLiveQuery("date"); // using string
 * const results = createLiveQuery((doc) => doc.date)); // using map function
 * const database = createLiveQuery.database; // underlying "FireproofDB" database accessor
 * ```
 *
 * ## Overview
 * Changes made via remote sync peers, or other members of your cloud replica group will appear automatically
 * when you use the `createLiveQuery` and `createDocument` APIs. By default, Fireproof stores data in the browser's
 * local storage.
 */
export const createLiveQuery = topLevelCreateLiveQuery as TLCreateLiveQuery;
