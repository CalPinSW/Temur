import { Game, PlayerGameWithProfile } from '../types/game';
import { APP_TIME_ZONE, formatDate, getPlayerDisplayName } from './gameUtils';

export const MAX_TEAM_SHEET_TEMPLATE_LENGTH = 2000;

export const DEFAULT_TEAM_SHEET_TEMPLATE = `Teams are set:

*{team1}*:
{team1_players}

*{team2}*:
{team2_players}

Be ready to play {kickoff_time-5}`;

export const DEFAULT_SINGLE_TEAM_SHEET_TEMPLATE = `Squad is set vs {team2}:

{team1_players}

Be ready to play {kickoff_time-5}`;

export const TEAM_SHEET_PLACEHOLDERS = [
  { token: '{team1}', description: 'Team 1 name' },
  { token: '{team2}', description: 'Team 2 name (the opponent, for a single-team group)' },
  { token: '{team1_players}', description: 'Team 1 players, one per line' },
  { token: '{team2_players}', description: 'Team 2 players, one per line' },
  { token: '{kickoff_time}', description: 'Kickoff time, e.g. 10:45am' },
  { token: '{kickoff_time-5}', description: 'Kickoff time minus 5 minutes (any number works)' },
  { token: '{date}', description: 'Game date, e.g. Saturday 10 October 2026' },
] as const;

export const TEAM_SHEET_TEMPLATE_HELP = [
  'Write the message exactly as you want it to read. When you copy it from a game, each placeholder in {curly braces} is swapped for that game’s details.',
  'Team player lists put one name per line, in signup order. Wrap text in *asterisks* to make it bold in WhatsApp.',
  'Leave it blank or reset it to use the default message.',
] as const;

export const getTeamSheetTemplateHelpText = (): string =>
  [
    ...TEAM_SHEET_TEMPLATE_HELP,
    TEAM_SHEET_PLACEHOLDERS.map(({ token, description }) => `${token} — ${description}`).join(
      '\n'
    ),
  ].join('\n\n');

export const getDefaultTeamSheetTemplate = (singleTeam: boolean): string =>
  singleTeam ? DEFAULT_SINGLE_TEAM_SHEET_TEMPLATE : DEFAULT_TEAM_SHEET_TEMPLATE;

export const resolveTeamSheetTemplate = (
  template: string | null | undefined,
  singleTeam: boolean
): string => (template?.trim() ? template : getDefaultTeamSheetTemplate(singleTeam));

// Saving the untouched default (or nothing at all) stores NULL, so a group
// that never customised the template keeps following future default changes.
export const normalizeTeamSheetTemplateForSave = (
  template: string,
  singleTeam: boolean
): string | null => {
  const trimmed = template.replace(/\r\n/g, '\n').trim();
  return !trimmed || trimmed === getDefaultTeamSheetTemplate(singleTeam) ? null : trimmed;
};

export const formatTeamSheetTime = (date: Date): string =>
  date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: APP_TIME_ZONE,
    })
    .replace(/\s/g, '')
    .toLowerCase();

const formatPlayerLines = (players: PlayerGameWithProfile[], team: number): string =>
  players
    .filter((p) => p.team === team)
    .sort((a, b) => a.signup_order - b.signup_order)
    .map(getPlayerDisplayName)
    .join('\n');

export const buildTeamSheetMessage = (
  template: string,
  game: Pick<Game, 'team1_name' | 'team2_name' | 'kickoff_date'>,
  players: PlayerGameWithProfile[]
): string => {
  const kickoff = new Date(game.kickoff_date);
  const values: Record<string, string> = {
    team1: game.team1_name,
    team2: game.team2_name,
    team1_players: formatPlayerLines(players, 1),
    team2_players: formatPlayerLines(players, 2),
    date: formatDate(game.kickoff_date),
  };

  return template.replace(/\{(\w+)(?:\s*([+-])\s*(\d+))?\}/g, (match, key, sign, minutes) => {
    if (key === 'kickoff_time') {
      const offsetMinutes = sign ? Number(minutes) * (sign === '-' ? -1 : 1) : 0;
      return formatTeamSheetTime(new Date(kickoff.getTime() + offsetMinutes * 60_000));
    }
    if (sign || !(key in values)) return match;
    return values[key];
  });
};
