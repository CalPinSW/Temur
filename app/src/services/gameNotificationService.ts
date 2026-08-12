import { supabase } from './supabase';
import { NotificationTemplates } from './notificationService';
import { PlayerGameWithProfile } from '@/types/game';

export async function notifyTeamAssignments(
  gameId: string,
  players: PlayerGameWithProfile[],
  team1Name: string,
  team2Name: string,
  adminMessage: string
): Promise<void> {
  const assigned = players.filter((p) => p.team !== null);
  if (assigned.length === 0) return;

  await Promise.all(
    assigned.map((p) => {
      const teamName = p.team === 1 ? team1Name : team2Name;
      const notification = NotificationTemplates.teamAssigned(teamName, gameId, adminMessage);
      return supabase.functions.invoke('send-notification', {
        body: {
          userId: p.user_id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      });
    })
  );
}
