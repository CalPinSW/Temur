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

// Real supabase-js reuses the same underlying channel for two `.channel()`
// calls sharing a name, so calling `.on()` on the second one after the
// first has already `.subscribe()`d throws "cannot add postgres_changes
// callbacks ... after subscribe()". Mirroring that here (keyed by name, not
// by call) is what lets a hook test actually catch a channel-name collision
// between two concurrently-mounted instances, rather than silently passing
// against a mock that accepts anything.
export function createSupabaseMock() {
  const subscribedChannelNames = new Set<string>();

  const channel = jest.fn((name: string) => {
    const channelObj = {
      __name: name,
      on: jest.fn(() => {
        if (subscribedChannelNames.has(name)) {
          throw new Error(
            `cannot add \`postgres_changes\` callbacks for realtime:${name} after \`subscribe()\`.`
          );
        }
        return channelObj;
      }),
      subscribe: jest.fn(() => {
        subscribedChannelNames.add(name);
        return channelObj;
      }),
    };
    return channelObj;
  });

  const removeChannel = jest.fn((removed: { __name?: string } | undefined) => {
    if (removed?.__name) subscribedChannelNames.delete(removed.__name);
  });

  return {
    from: jest.fn<QueryBuilder, [string]>(),
    channel,
    removeChannel,
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
      signInWithIdToken: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
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
