'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import type { CalendarGame } from './types';

export default function GroupCalendarView({ games }: { games: CalendarGame[] }) {
  const router = useRouter();

  const events = useMemo<EventInput[]>(
    () =>
      games.map((game) => ({
        id: game.id,
        title: `${game.hasResult ? '✓ ' : ''}${game.team1Name} v ${game.team2Name}`,
        start: game.kickoffDate,
        extendedProps: { isPreview: game.isPreview },
      })),
    [games]
  );

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    router.push(`/games/${arg.event.id}`);
  };

  return (
    <div className="temur-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listMonth',
        }}
        buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
        firstDay={1}
        height="auto"
        dayMaxEvents={3}
        nowIndicator
        eventDisplay="block"
        displayEventTime={false}
        events={events}
        eventClick={handleEventClick}
        eventClassNames={(arg) =>
          arg.event.extendedProps.isPreview ? ['temur-event-preview'] : []
        }
        noEventsText="No games in this range"
      />
    </div>
  );
}
