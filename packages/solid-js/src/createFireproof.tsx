import type { ConfigOpts, DbResponse, Doc, DocRecord, IndexRow, MapFn, QueryOpts } from "@fireproof/core";
import { Database, fireproof } from "@fireproof/core";
import { deepmerge } from "deepmerge-ts";
import { Accessor, createEffect, createSignal, onCleanup, untrack } from "solid-js";

export type LiveQueryResult<T extends DocRecord<T>> = {
  readonly docs: Doc<T>[];
  readonly rows: IndexRow<T>[];
};

export type CreateLiveQuery = <T extends DocRecord<T>>(
  mapFn: string | MapFn,
  query?: QueryOpts,
  initialRows?: IndexRow<T>[]
) => Accessor<LiveQueryResult<T>>;

type UpdateDocFnOptions = {
  readonly replace?: boolean;
  readonly deepMerge?: boolean;
};

type UpdateDocFn<T extends DocRecord<T>> = (newDoc?: Partial<Doc<T>>, options?: UpdateDocFnOptions) => void;

type StoreDocFn<T extends DocRecord<T>> = (existingDoc?: Doc<T>) => Promise<DbResponse>;

export type CreateDocumentResult<T extends DocRecord<T>> = [Accessor<Doc<T>>, UpdateDocFn<T>, StoreDocFn<T>];

export type CreateDocument = <T extends DocRecord<T>>(initialDoc: Doc<T>) => CreateDocumentResult<T>;

export type CreateFireproof = {
  /** The Fireproof database */
  readonly database: Accessor<Database>;
  /**
   * ## Summary
   *
   * Creates a new Fireproof document into your custom-named Fireproof database. The creation occurs when you do not
   * pass in an `_id` as part of your initial document -- the database will assign a new one when you call the provided
   * `save` handler. The hook also provides generics support so you can inline your custom type into the invocation to
   * receive type-safety and auto-complete support in your IDE.
   *
   * ## Usage
   *
   * ```tsx
   * const [todo, setTodo, saveTodo] = createDocument<Todo>({
   *   text: '',
   *   date: Date.now(),
   *   completed: false
   * })
   *
   * const [doc, setDoc, saveDoc] = createDocument<Customer>({
   *   _id: `${props.customerId}-profile`, // you can imagine `customerId` as a prop passed in
   *   name: "",
   *   company: "",
   *   startedAt: Date.now()
   * })
   * ```
   *
   * ## Overview
   * Changes made via remote sync peers, or other members of your cloud replica group will appear automatically
   * when you use the `createLiveQuery` and `createDocument` APIs. By default, Fireproof stores data in the browser's
   * local storage.
   */
  readonly createDocument: CreateDocument;
  /**
   * ## Summary
   * Access to live query results, enabling real-time updates in your app.
   *
   * ## Usage
   *
   * ```tsx
   * const results = createLiveQuery("date"); // using string key
   * const results = createLiveQuery('date', { limit: 10, descending: true }) // key + options
   * const results = createLiveQuery<CustomType>("date"); // using generics
   * const results = createLiveQuery((doc) => doc.date)); // using map function
   * ```
   *
   * ## Overview
   * Changes made via remote sync peers, or other members of your cloud replica group will appear automatically
   * when you use the `createLiveQuery` and `createDocument` APIs. By default, Fireproof stores data in the browser's
   * local storage.
   */
  readonly createLiveQuery: CreateLiveQuery;
};

const isDatabase = (v?: string | Database): v is Database => v !== undefined && typeof v !== "string";

/**
 *
 * ## Summary
 *
 * Create a custom-named Fireproof database and provides the utility hooks to query against it. If no name is
 * provided, then it will default to `FireproofDB`.
 *
 * ## Usage
 * ```tsx
 * const { database, createLiveQuery, createDocument } = createFireproof("dbname");
 * const { database, createLiveQuery, createDocument } = createFireproof("dbname", { ...options });
 * ```
 *
 * ## Overview
 *
 * TL;DR: Only use this hook if you need to configure a database name other than the default `FireproofDB`.
 *
 * For most applications, using the `createLiveQuery` or `createDocument` hooks exported from `@fireproof/solid-js` should
 * suffice for the majority of use-cases. Under the hood, they act against a database named `FireproofDB` instantiated with
 * default configurations. However, if you need to do a custom database setup or configure a database name more to your liking
 * than the default `FireproofDB`, then use `createFireproof` as it exists for that purpose. It will provide you with the
 * custom database accessor and *lexically scoped* versions of `createLiveQuery` and `createDocument` that act against said
 * custom database.
 *
 * If you need to, using the power of Solid, you can distribute the custom database accessor and lexical hooks through your
 * app using the Context APIs or just simply instantiating them globally and importing it where you need it like you would with any global
 * SolidJS signal.
 */
export function createFireproof(dbOrName?: string | Database, config: ConfigOpts = {}): CreateFireproof {
  // The database connection is cached, so subsequent calls to fireproof with the same name will
  // return the same database object. This makes it safe to invoke function many times without the
  // need to wrap it in createMemo.
  const database = () => (isDatabase(dbOrName) ? dbOrName : fireproof(dbOrName || "FireproofDB", config));

  function createDocument<T extends DocRecord<T>>(initialDoc: Doc<T>): CreateDocumentResult<T> {
    const [doc, setDoc] = createSignal(initialDoc);
    const [subscribedId, setSubscribedId] = createSignal("");

    const regenerateDoc = () => initialDoc;
    const docId = () => doc()._id;

    const updateDoc = (
      newDoc?: Partial<Doc<T>>,
      options: UpdateDocFnOptions = { replace: false, deepMerge: false }
    ) => {
      if (!newDoc) return setDoc(() => untrack(regenerateDoc));

      const updateDocState = (prevDoc: Doc<T>, replacementDoc: Doc<T>) => {
        if (options.replace) return replacementDoc;
        return options.deepMerge ? (deepmerge(prevDoc, newDoc) as Doc<T>) : { ...prevDoc, ...newDoc };
      };

      return setDoc((prevDoc) => updateDocState(prevDoc, newDoc as Doc<T>));
    };

    const saveDoc = async (existingDoc?: Doc<T>) => {
      const response = await database().put(existingDoc ?? doc());
      if (!docId()) setDoc((d) => ({ ...d, _id: response.id }));
      return response;
    };

    const refreshDoc = async (db: Database, docId?: string) => {
      // TODO: add option for MVCC (Multi-version concurrency control) checks
      // https://use-fireproof.com/docs/database-api/documents/#multi-version-concurrency-control-mvcc-available-in-alpha-coming-soon-in-beta
      const storedDoc = await db.get<T>(docId as string).catch(() => untrack(regenerateDoc));
      setDoc(() => storedDoc);
    };

    createEffect(() => {
      const db = database();
      const id = docId();

      if (!id || subscribedId() === id) return;
      setSubscribedId(id);

      const unsubscribe = db.subscribe((changes) => {
        if (changes.find((c) => c._id === id)) {
          refreshDoc(db, id);
        }
      });

      onCleanup(() => {
        unsubscribe();
      });
    });

    createEffect(() => {
      // Need to untrack the docId signal to prevent infinite refresh loop
      void refreshDoc(database(), untrack(docId));
    });

    return [doc, updateDoc, saveDoc];
  }

  function createLiveQuery<T extends DocRecord<T>>(strOrFn: string | MapFn, query = {}, initialRows: IndexRow<T>[] = []) {
    const [result, setResult] = createSignal({
      docs: initialRows.map((r) => r.doc as Doc<T>),
      rows: initialRows,
    });

    const refreshRows = async (db: Database) => {
      const res = await db.query<T>(strOrFn, query);
      setResult({ ...res, docs: res.rows.map((r) => r.doc as Doc<T>) });
    };

    createEffect(() => {
      const db = database();
      console.log("subscribing");
      const unsubscribe = db.subscribe(() => {
        console.log("subscription event");
        void refreshRows(db)
      }, true);

      onCleanup(() => {
        console.log("calling unsubscribe");
        unsubscribe();
      });
    });

    return result;
  }

  return { database, createDocument, createLiveQuery };
}
