'use client';

import dynamic from 'next/dynamic';
import type { CalendarGame } from './types';

export type { CalendarGame };

// FullCalendar is a client-only widget — load it after mount to sidestep
// any SSR/hydration friction.
const GroupCalendarView = dynamic(() => import('./GroupCalendarView'), {
  ssr: false,
  loading: () => <div className="h-[32rem] rounded-lg border border-border bg-card" />,
});

export function GroupCalendar({ games }: { groupId: string; games: CalendarGame[] }) {
  return <GroupCalendarView games={games} />;
}
