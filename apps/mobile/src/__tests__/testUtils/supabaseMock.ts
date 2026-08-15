export interface QueryResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/**
 * Builds a chainable stand-in for a supabase-js PostgrestFilterBuilder.
 * Every chain method returns the same builder so tests can call any subset
 * of `.select().eq().order()...` and either `await` it directly or call
 * `.single()` at the end, matching how the real client resolves.
 */
export interface QueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: <TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'in',
  'order',
  'limit',
] as const;

export function createQueryBuilder(
  result: QueryResult = { data: null, error: null }
): QueryBuilder {
  const builder = {} as QueryBuilder;

  CHAIN_METHODS.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });

  builder.single = jest.fn(() => Promise.resolve(result));
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

export function createSupabaseMock() {
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };

  return {
    from: jest.fn<QueryBuilder, [string]>(),
    channel: jest.fn(() => channel),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(),
      setSession: jest.fn(),
    },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

export function mockFromTables(supabase: SupabaseMock, tables: Record<string, QueryBuilder>) {
  supabase.from.mockImplementation((table: string) => {
    const builder = tables[table];
    if (!builder) {
      throw new Error(`No mock query builder configured for table "${table}"`);
    }
    return builder;
  });
}
