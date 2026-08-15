'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Filter {
  column: string;
  value: string;
}

interface RealtimeBadgeProps {
  channelName: string;
  table: string;
  filters: Filter[];
  initialCount: number;
}

export function RealtimeBadge({ channelName, table, filters, initialCount }: RealtimeBadgeProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refetchCount() {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      for (const filter of filters) {
        query = query.eq(filter.column, filter.value);
      }
      const { count } = await query;
      if (!cancelled) setCount(count ?? 0);
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;

    // createBrowserClient()'s realtime connection doesn't automatically
    // carry the cookie-backed session's JWT — without this, the socket
    // connects with only the anon key, RLS evaluates auth.uid() as NULL,
    // and every postgres_changes event is silently dropped rather than
    // erroring. setAuth() must resolve before subscribing.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table }, refetchCount)
        // Refetch once the subscription is actually confirmed active, not
        // just on future change events: a change that lands in the window
        // between calling subscribe() and the server confirming it (e.g. a
        // dev-mode Strict Mode remount, or any reconnect) would otherwise
        // be silently missed forever, since nothing else re-syncs
        // afterward.
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            refetchCount();
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters is a fresh array each render; the values inside it are what should be tracked, and channelName/table already cover the two current call sites.
  }, [channelName, table]);

  if (count === 0) return null;

  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}
